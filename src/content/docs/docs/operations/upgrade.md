---
title: Upgrade
description: Check that it is safe to upgrade, roll out in the right order, and roll back one release if needed.
---

<!-- Source: obzly-dev/docs/runbooks/upgrade.md, obzly-dev/ARCHITECTURE.md, obzly-dev/deploy/helm/obzly/Chart.yaml, obzly-dev/deploy/helm/obzly-probe/Chart.yaml, obzly-dev/frontend/src/features/settings/ui/UpdatesComponent.tsx, obzly-dev/frontend/src/features/settings/ui/UpgradeStatusComponent.tsx, obzly/docs/runbooks/upgrade.md, obzly/docs/releases/v1.1.0.md, obzly/docs/releases/v1.2.0.md -->

Obzly rolls forward one version at a time and can roll back one. **Obzly settings → Updates** (or
`GET /api/v1/system/upgrade-status`, for admins) tells you whether it is safe to deploy the next
version.

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

- **v1.2.1** (fixes, SQL dashboard panels, Logs SQL alert rules, ingestion status tile): upgrade
  the Sites, the control plane, then the probes.
  - **Migration:** one, additive: alert rules accept the Logs SQL source. Before rolling back to
    v1.2.0, delete Logs SQL alert rules and SQL dashboard panels (v1.2.0 doesn't know them).
  - **Worker memory:** no new settings. Web analytics stages an hour's raw rows before shaping them
    (spilling to the query spill directory past the cap), and the inventory reads series times and
    labels in two passes. Workers at 4 GiB or less can still run out on very large hours.
  - **Verify:** no "inventory build failed" or "web analytics rollups failed" lines in the worker
    logs, and the inventory-build query under v1.2.0 is about 12 again.
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
- **v1.0.0**: the first public release, from
  [github.com/obzly/obzly](https://github.com/obzly/obzly).

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
