---
title: Disaster recovery
description: Failure scenarios for an Obzly deployment, what each one puts at risk, and how to recover.
---

<!-- Source: obzly-dev/docs/runbooks/dr.md, obzly-dev/README.md -->

Backups, the restore order and `obzly reconcile` (the `./main reconcile` command) are described in
[Backup & restore](/docs/operations/backup-restore/). This page covers what each kind of failure
puts at risk and what to do about it.

## Scenarios

| Failure | Data at risk | Recovery |
| --- | --- | --- |
| An `api`, `worker` or `querier` pod | None | Kubernetes replaces it. Acknowledged ingest is in the brokers; a worker's shards move to the others when its lease expires. |
| One broker (of 3) | None | The three-way replicated streams keep a quorum. Replace the pod; its PVC catches up. Upgrade status shows replicas behind until it does. |
| Two brokers, or the broker quorum's disks | Acknowledged batches not yet written to Parquet | The one loss case: JetStream is a buffer, not a store of record, and isn't backed up. Bring brokers back with their PVCs if possible; otherwise restore them empty (delete the PVCs), and `api` and `worker` recreate the streams. The loss is bounded by the worker lag at the time (Upgrade status, ingest buffer). |
| Postgres primary | Writes since the last shipped WAL (under 70 s at `archive_timeout = 60s`) | Fail over to a replica (RDS Multi-AZ, CloudNativePG), or restore to a point in time, then follow the [restore order](/docs/operations/backup-restore/#restore-order). |
| Object storage objects deleted or corrupted | The affected segments | Restore object versions. `reconcile` reports what's missing, and the integrity audit finds silent damage within a week. |
| A whole region | Everything not replicated off-region | Restore Postgres from the cross-region backup copy, point at the replicated bucket, start the release in the new region with the same config, and follow the restore order. The RPO is the backup copy's lag; brokers start empty. |
| A control plane | None: Sites keep serving their own users and data | Restore its Postgres first (it is the identity root for every Site), then start it. Sites validate its assertions against its published keys, which come back with `secret_keys`. |
| `secret_keys` lost | Sessions, SSO secrets, MFA seeds, channel credentials | Re-entry only; see [key material](/docs/operations/backup-restore/#key-material-secret_keys). |

:::note
With object storage, always reconcile the catalog with the bucket after restoring Postgres. Start
with a report-only run:

```bash
docker exec -it obzly ./main reconcile          # report only
```
:::

## Full rebuild order

1. The control plane's Postgres, then the control plane.
2. Each Site: Postgres (with the key-material check), brokers, one worker, `reconcile`, `api`,
   queriers.
3. Verify: Upgrade status on each Site and the control plane, one SSO sign-in through the control
   plane to each Site, and a search and a trace view on each Site.

## Practise

Run the [restore drill](/docs/operations/backup-restore/#restore-drill) quarterly and after any
change to backups, and keep its measured RPO under 5 minutes. A weekly integrity audit samples
uploaded segments in between; see
[Backup & restore](/docs/operations/backup-restore/#integrity-audit).
