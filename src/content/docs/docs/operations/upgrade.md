---
title: Upgrade
description: Check that it is safe to upgrade, roll out in the right order, and roll back one release if needed.
---

<!-- Source: obzly-dev/docs/runbooks/upgrade.md, obzly-dev/ARCHITECTURE.md, obzly-dev/deploy/helm/obzly/Chart.yaml, obzly-dev/deploy/helm/obzly-probe/Chart.yaml, obzly-dev/frontend/src/features/settings/ui/UpdatesComponent.tsx, obzly-dev/frontend/src/features/settings/ui/UpgradeStatusComponent.tsx, obzly/docs/runbooks/upgrade.md, obzly/docs/releases/v1.1.0.md, obzly/docs/releases/v1.2.0.md -->

Obzly rolls forward one version at a time and can roll back one. **Obzly settings → Updates** (or
`GET /api/v1/system/upgrade-status`, for admins) tells you whether it is safe to deploy the next
version. Before v0.56.0 this page was **Settings → Upgrade status**.

## Before you upgrade

Open **Obzly settings → Updates**. It has one row per deployment: on a control plane, the control
plane itself and every enabled Site. A deployment shows **Ready for the next version** when there
are no blockers, or **Not yet** with the first reasons; expand the row for its full upgrade status.
The blockers are:

- **Schema pending**: migrations are still running. Wait.
- **Schema ahead by two or more releases**: this binary is older than the database by more than
  the supported boundary. Deploy a newer version; don't roll back further. Being one release ahead
  is only a warning (a rollout in progress, or a supported rollback).
- **Segments still being rewritten** to the current format, or **not yet uploaded** to object
  storage: wait for the worker. The counts fall on their own.

Warnings don't block an upgrade:

- segments the rewrite skipped because they were unreadable (see the worker log);
- an ingest buffer whose oldest batch has waited over 15 minutes (workers are behind; the buffer is
  durable);
- broker replicas behind (roll brokers one at a time);
- a failed integrity audit (run `reconcile`; see [Backup & restore](/docs/operations/backup-restore/)).

## Releases that need action

- **v0.41.0**: uploads carry object tags for bucket lifecycle rules. On AWS S3, the role or user
  Obzly uploads with needs `s3:PutObjectTagging` on the bucket, or uploads fail and segments stay
  only on local disk. Add the permission before upgrading.
- **v0.47.0**: the first release published for `linux/amd64` as well as `linux/arm64`.
- **v0.50.0**: in multi-site setups the control plane waits 180 s for a Site, and a Site's search
  deadline is 170 s. Set the idle timeout of the load balancers in front of both to at least 180 s
  (AWS ALB: `alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=180`),
  or a slow search ends in a `504` at 60 s. Upgrade the control plane too.
- **v0.51.2**: the Logs page's field facets need the Site to be upgraded before (or with) the
  control plane. Time presets stop at 72 hours; use Custom Range for longer. Check that each
  querier's `COLD_CACHE_MAX_SIZE_MB` holds its share of the range people search (raise it towards
  the volume size, leaving about 20% free). Optional Helm values: `querier.persistence` and
  `querier.warmHours`.
- **v0.52.0** and **v0.52.1**: "Show logs around" calls a new Site route, so upgrade Sites before
  (or with) the control plane. It now defaults to the log's workload; narrow it to one replica with
  **+ Field → `k8s_pod_name`**. Optional: `LOG_CONTEXT_DEFAULT_FIELDS` adds fields to the default
  scope.
- **v0.53.0**: upgrade Sites before (or with) the control plane, since the Logs page calls new Site
  routes. `QUERY_PARTIAL_DOWNLOADS` (default on) reads only the needed columns of large cold
  segments. Workers then build per-minute counts for compacted log segments in the background, and
  the histogram gets faster as they fill in.
- **v0.54.0**: upgrade both the Sites and the control plane.
- **v0.55.0** (Synthetics, Infrastructure, shared notification channels and email): upgrade Sites
  and the control plane; both run new migrations.
  - **Email and channels move to Obzly settings.** `ALERT_SMTP_*` is imported once on the first
    start (a control plane's as the central relay, a Site's as its own) and then ignored. Remove it
    from your environment, Helm values or ConfigMaps. Channels are now defined in **Obzly settings**
    and shared across projects. Existing project channels keep their ids, available to their own
    project, so rules keep working. On a control plane, **Move Site's own here** takes a Site's
    channels over, and Sites fetch the control plane's channels and relay every 5 minutes. See
    [Alerts & notifications](/docs/how-to/alerts/). Invites are emailed when email is set up.
  - **[Infrastructure](/docs/how-to/infrastructure/)**: an inventory of clusters, nodes, hosts,
    workloads, pods, containers and services with health, lifecycle and changes, built every 5
    minutes on each Site from data the agents already send. Nothing to set up;
    `INVENTORY_RETENTION_DAYS` (default 30) sets how long a gone asset is kept.
  - **[Synthetics](/docs/how-to/synthetics/)** (control plane): add a destination (a Site project
    and its ingest key), a probe, then monitors. The probe is a separate image
    (`ghcr.io/obzly/obzly-probe`), Linux binaries with an install script attached to each release,
    and its own Helm chart; see [Synthetics probe](/docs/deploy/probe/).
  - **Kubernetes onboarding manifest**: re-apply it from **Data Sources**. The collector now keeps
    file offsets on the node, so a restart neither skips nor re-sends lines. Pod metrics carry their
    workload's name, so each pod and container series starts afresh once after re-applying
    (dashboards are unaffected). A read-only cluster agent, on by default, adds pod phase,
    restarts, replica counts and node readiness. Set a cluster name when one project has several
    clusters. See [Kubernetes logs & metrics](/docs/how-to/kubernetes-otel-collector/#update-an-existing-collector).
  - **Helm chart 0.2.0**: pods get `fsGroup: 1000` by default, so new broker and querier volumes are
    writable without overrides, and the `api` tier requests 500m CPU (its autoscaler flapped at
    250m).
  - **Queries**: leftover spill files are removed at start, and spills are capped at
    `QUERIER_SPILL_MAX_SIZE` (default `8GB`). A search whose executor disappears, for example in a
    Spot interruption, is retried on another one within seconds instead of failing.
  - Every role now waits up to 3 minutes for Valkey at start (and exits after that) instead of
    crashing. A Valkey or database outage answers `503` to signed-in users instead of signing them
    out.
  - The **Users** page has **Last login** and **Last active** columns. Lost the root admin's
    bootstrap token? Run `/app/main --reset-bootstrap-token` in the container (only while that admin
    has no password); see [Quick install](/docs/getting-started/quick-install/#lost-bootstrap-token).
- **v0.56.0** (cloud connections, probe groups, monitor folders, dependencies and alerts, tabbed
  Obzly settings): upgrade Sites and the control plane; both run new migrations. Helm chart 0.3.0
  deploys v0.56.0 by default.
  - **Ingest fix**: a Site with large log batches could stall searches ("query timed out after
    30s") and hold batches unacknowledged for an hour. Reads from the ingest buffer are now capped
    by size. Nothing to configure.
  - **Probes become probe groups.** Upgrade the probes too. A probe older than v0.56.0 keeps working
    as one instance, named `default`, of its group. The `obzly-probe` Helm chart (0.2.0) now runs
    `replicas: 3` with a PodDisruptionBudget, spreads them across zones and nodes, names each
    instance after its pod, and creates a service account. Set `replicas: 1` to keep one.
    **Rotate token** now keeps the old token working for 24 hours, so update the instances within
    a day.
  - **Monitor alerts** are managed alert rules on the destination Site, read-only in **Alerts**;
    change them in the monitor's editor. They need the Site on v0.56.0. See
    [Rules managed by Synthetics](/docs/how-to/alerts/#synthetics).
  - **[Cloud connections](/docs/how-to/cloud-connections/)** (control plane, optional): connections
    that federate through the control plane need `PUBLIC_URL` on HTTPS and reachable from AWS or
    Azure, which read its `/.well-known/openid-configuration` and `/.well-known/jwks.json`. Each
    connection runs a full discovery every 4 hours and a health scan every 15 minutes, both
    adjustable in the wizard, and backs off when AWS or Azure throttles.
  - **Probe concurrency** now defaults to 256 checks at once (was 16), so a mass outage of slow
    timeouts no longer drops runs. The `obzly-probe` chart's memory limit is now 512Mi (request
    128Mi); set `maxConcurrency` lower on a small host.
  - **Obzly settings is now in tabs**: Overview, General, Sites, Cloud connections, Notifications &
    alerting, Identity & access, Updates and Audit logs (Sites and Cloud connections on a control
    plane only). The Sites registry moved from the sidebar to **Obzly settings → Sites**, and
    Upgrade status is now **Updates**, one row per deployment. Audit logs can be exported as CSV.
  - **Identity & access** has **Require MFA for everyone**, off by default. See
    [SSO & SCIM](/docs/how-to/sso-scim/#multi-factor-authentication).

- **v0.56.1**: upgrade Sites, the control plane, then the probes. A v0.56.0 Site can't fetch
  notification channels or SMTP from a v0.56.1 control plane, so don't leave Sites behind; within a
  Site, roll `api` and workers before queriers. Helm chart 0.3.1 gives the bundled Valkey a
  generated password and adds NetworkPolicies for Valkey and the brokers (set
  `valkey.networkPolicy` / `broker.networkPolicy` to false if anything else talks to them). Update
  AWS role stacks deployed from v0.56.0 (adds `ec2:DescribeInstanceStatus`).
- **v0.57.0** (multi-step monitors, maintenance windows, AI budgets and LLM apps, delta metrics,
  language data sources): upgrade every Site, then the control plane, then the probes, promptly.
  - **Before upgrading:** `DATABASE_DSN` must come from the deployment (the image no longer carries
    a fallback). With the raw EKS manifests, add `VALKEY_PASSWORD` to `obzly-secrets` (and
    `obzly-control-plane-secrets` on a control plane), since Valkey now requires one.
  - Older probes report "unknown check type multi" for multi-step monitors. A Site replica still on
    an older version deletes AI budget rules until it's upgraded (they're re-created every 5
    minutes). Synthetics alerts firing during the first sync send one "resolved" and one new
    "firing" notification.
  - The OTLP receiver accepts delta temporality; `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative`
    is no longer needed. Regenerated host collector templates accept OTLP only from the same
    machine unless **Accept OTLP from other machines** is ticked; existing collectors keep working.
- **v0.58.0**: upgrade Sites first. A new log source index lets the Logs sidebar offer values seen
  in the last 36 hours; it starts empty and fills as logs arrive.
- **v0.58.1** (Synthetics accuracy): upgrade the Site, the control plane, then the probes (they
  call a new control-plane route when they stop). Synthetics series lose the probe-version label,
  so p95 can include older series for up to 7 days.
- **v1.0.0** (the first release from [github.com/obzly/obzly](https://github.com/obzly/obzly)): no
  migration. The Helm charts, the Kubernetes manifests (until now `:latest`) and `install-obzly.sh`
  deploy `v1.0.0` by default, and the probe installer downloads from github.com/obzly/obzly
  releases.
- **v1.1.0** ([cloud cost, security posture and recommendations](/docs/how-to/cloud-cost-posture/)):
  upgrade the Sites, the control plane, **then the probes**. A probe older than v1.1.0 ignores the
  Cost and Security posture uses, so their pages stay empty until it's upgraded.
  - **Migrations:** three, all additive. Rolling back to v1.0.0 works; until you upgrade again, the
    cost and posture alert rules a project turned on show "unknown rule source" and don't fire.
  - **Network:** probes post to the destination Site's `/v1/cloud/cost`, `/v1/cloud/posture` and
    `/v1/cloud/advice`. If the Site's ingress only admits the control plane apart from ingest
    paths, add these.
  - **Permissions:** nothing changes for inventory-only connections. To turn on Cost or Security
    posture, edit the connection, tick the use and run the CloudFormation stack update, Bicep
    deployment or CLI script the wizard writes; **Test access** checks each use. See
    [Cloud cost & posture](/docs/how-to/cloud-cost-posture/) for what each needs and costs.
  - **Fixes:** `./main --email ...`, `--reset-mfa` and `--reset-bootstrap-token` now work in a
    running container.
- **v1.2.0** (UI v2, themes, project Overview, [Web analytics](/docs/how-to/web-analytics/),
  [new log views](/docs/how-to/explore-logs/), notification templates, MCP write tools): upgrade
  the Sites, the control plane, then the probes.
  - **Migrations:** eight, all additive. Rolling back to v1.1.0 works.
  - **Notifications:** alert rules gain a severity, taken from each rule's `severity` label
    (critical → Critical; high or error → High; warning or medium → Medium; info or low → Low;
    none → Medium); check rules that had no label. Messages start with a severity emoji, Slack
    messages use a coloured bar, PagerDuty events carry the mapped severity instead of always
    `error`, and webhooks gain `kind`, `severity`, `description` and `link`. Set `PUBLIC_URL` on
    standalone installs so messages link back to Obzly. See
    [Alerts & notifications](/docs/how-to/alerts/).
  - **MCP:** existing tokens and connected apps stay read-only; write tools need the new
    `mcp:write` scope. Tool results are JSON with `structuredContent`; clients that read
    `truncated` on paged lists should use `nextCursor`. See [MCP](/docs/how-to/mcp/).
  - **SQL mode** refuses DuckDB's introspection and file functions (`duckdb_*`, `pragma_*`,
    `current_setting`, `read_*`, `glob`, `query()`, ...).
  - **Outbound call:** **Obzly settings → Updates** asks `api.github.com` for the latest release
    (anonymous, cached 6 hours). Set `UPDATE_CHECK=false` on air-gapped deployments.
  - **Memory:** workers cap every DuckDB handle and log a "DuckDB memory budget" line at startup,
    with a warning if the caps exceed the container limit. Workers below 4 GiB still warn.
  - **Verify:** worker memory stays under its limit, and
    `sum(increase(obzly_leader_task_runs_total{task="inventory-build",result="ok"}[1h]))` is about
    12 across all workers.

The full list, with every detail, is the
[upgrade runbook](https://github.com/obzly/obzly/blob/main/docs/runbooks/upgrade.md#releases-that-need-action).

## Order

1. **Each Site first, then the control plane, then the probes.** The control plane ships the UI
   and must not be more than one version newer than the Sites it proxies.
2. **Within a Site**: brokers one at a time (the PodDisruptionBudget allows one), then workers, then
   `api` and queriers. Migrations run at startup, under a lock, on whichever pod starts first; the
   others wait. Startup probes allow 3.5 minutes for them.
3. **After each Site**: **Updates** shows the new version, and the expanded row shows the schema up
   to date.

With Helm:

```bash
helm upgrade obzly deploy/helm/obzly -n obzly -f values.yaml --set image.tag=vX.Y.Z
```

The chart rolls brokers one pod at a time and keeps generated tokens. For Docker Compose, see
[Docker](/docs/deploy/docker/#upgrade).

## Rolling back

Roll back to the previous release only. Its pods see the newer schema as one release ahead (a
warning) and keep working, because migrations are additive: a release expands the schema, and the
cleanup comes a release later. The upgrade status refuses a rollback of two releases as a blocker; if
you must go back further, restore Postgres instead (see
[Backup & restore](/docs/operations/backup-restore/)).

## After

Watch for 20 minutes: worker memory and restarts, the ingest buffer draining, and query latency
(see [Monitoring Obzly](/docs/operations/monitoring/)). Then move on to the next Site.
