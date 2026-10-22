---
title: Upgrade
description: Check that it is safe to upgrade, roll out in the right order, and roll back one release if needed.
---

<!-- Source: obzly-dev/docs/runbooks/upgrade.md -->

Obzly rolls forward one version at a time and can roll back one. **Settings → Upgrade status** (or
`GET /api/v1/system/upgrade-status`, for admins) tells you whether it is safe to deploy the next
version.

## Before you upgrade

Open Upgrade status on each Site and on the control plane, if you have one. **Safe to upgrade**
means there are no blockers:

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

## Order

1. **Each Site first, then the control plane last.** The control plane ships the UI and must not
   be more than one version newer than the Sites it proxies.
2. **Within a Site**: brokers one at a time (the PodDisruptionBudget allows one), then workers, then
   `api` and queriers. Migrations run at startup, under a lock, on whichever pod starts first; the
   others wait. Startup probes allow 3.5 minutes for them.
3. **After each Site**: Upgrade status shows the new version and the schema up to date.

With Helm:

```bash
helm upgrade obzly deploy/helm/obzly -n obzly -f values.yaml --set image.tag=vX.Y.Z
```

The chart rolls brokers one pod at a time and keeps generated tokens. For Docker Compose, see
[Docker](/docs/deploy/docker/#upgrade).

## Rolling back

Roll back to the previous release only. Its pods see the newer schema as one release ahead (a
warning) and keep working, because migrations are additive: a release expands the schema, and the
cleanup comes a release later. Upgrade status refuses a rollback of two releases as a blocker; if
you must go back further, restore Postgres instead (see
[Backup & restore](/docs/operations/backup-restore/)).

## After

Watch for 20 minutes: worker memory and restarts, the ingest buffer draining, and query latency
(see [Monitoring Obzly](/docs/operations/monitoring/)). Then move on to the next Site.
