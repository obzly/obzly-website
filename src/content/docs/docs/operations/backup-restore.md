---
title: Backup & restore
description: What to back up in an Obzly deployment, how to do it, and the order to restore in.
---

<!-- Source: obzly-dev/docs/runbooks/backup-restore.md -->

The targets: an **RPO of 5 minutes** for the catalog and identity data in Postgres, and **no
loss** for segments already uploaded to object storage.

## What holds what

| Store | Holds | Backup |
| --- | --- | --- |
| Postgres | Users, projects, settings, dashboards, alert rules, the segment catalog (`stream_segments`), and `secret_keys`, the root of trust | Continuous WAL archiving and base backups (point-in-time recovery) |
| Object storage | Every uploaded segment (Parquet) | Bucket versioning, plus cross-region replication for DR |
| JetStream (brokers) | Acknowledged batches not yet written to Parquet | None: a buffer, replicated three ways across zones |
| Valkey | Caches, rate limits, leases | None: rebuilt at start |
| Local disks / `emptyDir`s | Segments not yet uploaded, caches | None: uploaded within seconds; caches refill |

A control plane is the same, minus segments. Its Postgres is the identity root for every Site
(users, SSO, organizations, Site grants), so restore it first.

On a single host without object storage, the data directory (`./obzly-data`) holds every segment
and needs backing up too.

## Postgres: point-in-time recovery

Any tool that archives WAL continuously and takes base backups works. The RPO depends on how often
a WAL segment is shipped: set `archive_timeout = 60s` so even a quiet database ships within a
minute.

- **RDS / Aurora**: automated backups give point-in-time recovery to any second within the
  retention window. Set retention to at least 7 days.
- **Self-managed**: pgBackRest (`archive-async=y`, `repo1-type=s3`,
  `repo1-cipher-type=aes-256-cbc`) or wal-g (`WALG_S3_PREFIX`, `WALG_LIBSODIUM_KEY`), with
  `archive_command` pointing at them, `archive_timeout = 60s`, a full backup weekly and
  differentials daily.
- **CloudNativePG in the cluster**: `spec.backup.barmanObjectStore` (WAL archiving to S3, with
  `encryption: AES256` or SSE-KMS) and a `ScheduledBackup`.

:::caution[Encrypt backups with a key held outside the database]
Backups contain `secret_keys` next to the secrets it protects: SSO client secrets, MFA seeds,
notification channel credentials and session signing. Read access to the backup bucket is
access to those secrets.
:::

## Object storage

Turn on **versioning** for the segment bucket, with a noncurrent-version expiry longer than your
Postgres backup retention (for example 14 days). Compaction deletes its inputs once the merged
output is cataloged; a catalog restored to before that merge needs those inputs back. For regional
DR, add cross-region replication. Lifecycle rules by upload tag or date prefix are unaffected.

## Key material (`secret_keys`)

`secret_keys` is created on first start and holds the key that encrypts and signs everything else.
It isn't constrained to a single row, so:

1. **Restores are full-database only, and must finish before any Obzly process (or migration job)
   touches the database.** An app that starts against an empty database creates a new key; a
   data-only restore on top of it leaves two rows, and every session, SSO secret and MFA seed may
   then fail to verify or decrypt.
2. **Check after every restore**:

   ```sql
   SELECT count(*) FROM secret_keys;   -- must be 1
   ```

   Then confirm that one SSO sign-in and one MFA verification succeed, and that an existing
   session still works.
3. **If the row is lost for good**, what it protected can't be recovered, only re-entered: SSO
   client secrets entered again, MFA re-enrolled (`/app/main --email <user> --reset-mfa`), a new
   control-plane signing key (Sites refresh it automatically), and everyone signs in again.

## Restore order

1. **Stop** `api`, `worker` and `querier` (scale to 0). Brokers may stay up: they keep
   acknowledged batches until a worker writes them.
2. **Restore Postgres** to the chosen point (the latest, for a lost primary). Run the key-material
   check before going on.
3. **Start one `worker`.** It runs migrations if the restore point predates the running release,
   then drains the brokers.
4. **Reconcile the catalog with object storage**, from any pod with the release's image and config:

   ```bash
   /app/main reconcile                                            # report only
   /app/main reconcile --apply --adopt-since 2026-10-06T11:00:00Z # repair; use your restore point
   ```

5. **Start `api` and `querier`.** Check Settings → Upgrade status: schema up to date, no backlog
   blockers.

On Docker Compose the same command is `docker exec -it obzly ./main reconcile`; on Kubernetes,
`kubectl -n obzly exec deploy/obzly-worker -- ./main reconcile` (Helm) or
`kubectl -n obzly exec deploy/obzly -- ./main reconcile` (single-replica manifests).

### Reconcile findings

| Finding | Meaning | What `--apply` does |
| --- | --- | --- |
| `lost` | The catalog names a segment whose object (and local copy) is gone, typically because the restore point predates a compaction whose inputs were then deleted without bucket versioning | Moves the row to `lost_segments` so queries stop failing on it. Restore the object version first if versioning has it, then run again |
| `reuploadable` | The object is gone but this pod still has the file | Uploads it |
| `orphan` | An object no catalog row knows, uploaded after `--adopt-since` (the restore point) | Adds the catalog row from the file. Without `--adopt-since`, orphans are only reported |
| `orphan-old` | An object no catalog row knows, uploaded before the restore point: data retired by retention or compaction but never deleted from the bucket | Never adopted, since that would bring retired data back. Remove it with a bucket lifecycle rule or by hand |
| `orphan-overlapping` | An orphan that overlaps cataloged data of its project, typically a compaction output whose inputs the restored catalog still lists | Never adopted automatically, since that would double those rows. Delete it if the inputs are intact, or adopt it by hand |
| `size-mismatch` | The object's size doesn't match the catalog | Nothing; compare with the bucket's object versions |

Exit code `2` means findings remain. Objects newer than `--orphan-min-age` (1 hour) are skipped as
possibly in flight; `--projects` and `--streams` narrow a run.

## Integrity audit

Every `INTEGRITY_AUDIT_HOURS` (168) a worker samples `INTEGRITY_AUDIT_PERCENT` (1%, at most
`INTEGRITY_AUDIT_MAX_SAMPLES` = 500) of uploaded segments and checks that each object exists with
the cataloged size and row count. Results appear in Settings → Upgrade status, in the
`obzly_integrity_audit_*` metrics, and in the `ObzlyIntegrityAuditFailures` /
`ObzlyIntegrityAuditStale` alerts (see [Monitoring Obzly](/docs/operations/monitoring/)). On any
failure, run `reconcile` (report only) and follow the findings above.

## Restore drill

Run a drill quarterly and after any change to backups, on copies, never against production
Postgres:

1. Create a scratch Postgres with WAL archiving (`archive_mode = on`, `archive_timeout = 60s`) and
   load it with a `pg_dump` of the production database.
2. Record `SELECT count(*), md5(string_agg(t::text, ',')) FROM secret_keys t`. Start an Obzly `api`
   against it and sign in, keeping the session token.
3. Take a base backup, then write a heartbeat row every second, keeping what each insert
   acknowledged.
4. Kill the primary and discard its data directory.
5. Restore from the base backup and the WAL archive, recovering to the end of the archive. The RPO
   is the last acknowledged heartbeat minus the last recovered one.
6. Check the key material: same `secret_keys` count and checksum, and the old session token works
   against Obzly started on the restored database.
7. Run `reconcile` against the real bucket from the restored database: report, then
   `--apply --adopt-since <dump time>`, then report again.

In the project's own drill (Postgres 18, MinIO with about 12,000 objects, three runs), the measured
RPO was 19 to 20 seconds against the 5-minute target, the restore took 2 to 5 seconds,
`secret_keys` kept the same single row and checksum, and a session issued before the failure still
worked afterwards. That drill is also why adoption requires `--adopt-since`: adopting every orphan
would have brought back thousands of retired objects.

See [Disaster recovery](/docs/operations/disaster-recovery/) for failure scenarios.
