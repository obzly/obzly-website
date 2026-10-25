---
title: Configuration
description: Every environment variable Obzly reads at startup, with its default and what it controls.
---
<!-- Source: obzly-dev/docs/configuration.md, obzly-dev/backend/internal/config/config.go, obzly-dev/backend/internal/features/sharedconfig/loader.go, obzly-dev/backend/cmd/probe/main.go, obzly-dev/frontend/src/features/alerts/ui/NotificationSettingsComponent.tsx -->

Obzly is configured entirely through environment variables read at startup. Where you set them
depends on how you deploy:

- **Docker Compose**: the service's `environment:` block or the `.env` file next to
  `docker-compose.yml` (see [Docker Compose](/docs/getting-started/docker-compose/)).
- **Helm**: the chart's `config` and `secrets` values (see [Helm](/docs/deploy/helm/)).
- **Plain Kubernetes manifests**: the ConfigMap and Secret (see
  [Kubernetes (EKS)](/docs/deploy/kubernetes-eks/)).

Settings marked **required** stop the process at startup when they are missing.

:::note
Per-project settings (retention, sampling, [promoted fields](/docs/how-to/promoted-fields/),
quotas and rate limits) are set in the UI or the API, not here. So are SSO connectors, SSO group
mappings, MFA policy and SCIM tokens (see [SSO & SCIM](/docs/how-to/sso-scim/)), and email (SMTP)
and notification channels (see [below](#email-and-notification-channels)).
:::

## Core

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_DSN` | **required** | Postgres connection string: `host=... user=... password=... dbname=... port=5432 sslmode=require` |
| `ENV_MODE` | **required** | `production` or `development`. Development serves Swagger, allows CORS and binds to 127.0.0.1 |
| `SERVICE_MODE` | `all` | `all`, `api`, `worker`, `broker`, `querier` or `control-plane`. See [Roles](#roles) |
| `HTTP_PORT` | `4005` | UI, REST API and OTLP/HTTP (`/v1/logs`, `/v1/traces`, `/v1/metrics`) |
| `OTLP_GRPC_PORT` | `4317` | OTLP/gRPC receiver |
| `METRICS_ADDR` | `:9464` | Prometheus `/metrics` listener (`off` disables it). Keep it internal |
| `LOGS_DATA_DIR` | `/obzly-data/segments` | Local segments, caches and (in `all` mode) the embedded broker's store |
| `ADMIN_EMAIL` | `admin` (`superadmin` on a control plane) | The bootstrap super-admin's login. Changing it renames the existing account |
| `PUBLIC_URL` | from the request | The browser-facing origin, for example `https://obzly.harborline.example`. Used for OAuth metadata and tokens for MCP clients. **Required on a control plane**, where it is also the `iss` of every assertion it signs |
| `TRUSTED_PROXIES` | none | CIDRs of load balancers whose `X-Forwarded-For` is trusted. Set it behind any proxy |
| `SHUTDOWN_DRAIN_SECONDS` | `0` | Seconds an HTTP replica keeps serving after SIGTERM with readiness failing. Use `15` behind a load balancer |
| `SELF_TRACING_SAMPLE_RATE` | `0.01` | Fraction of the replica's own requests and background passes traced into the system project. `0` turns it off |
| `WEBSITE_URL` | empty | Product website linked from the UI |
| `APP_VERSION` | `dev` | Set by the image build. Shown in Settings → Updates and Site info |
| `BACKEND_ROOT_PATH` | working directory | Where `migrations/` is found |

## Valkey

Valkey holds caches, rate limits and leases only. Nothing in it needs a backup.

| Variable | Default | Description |
| --- | --- | --- |
| `VALKEY_HOST`, `VALKEY_PORT` | **required** | |
| `VALKEY_USERNAME`, `VALKEY_PASSWORD` | empty | |
| `VALKEY_IS_SSL` | `false` | |

## Object storage

| Variable | Default | Description |
| --- | --- | --- |
| `OBJECT_STORAGE_URL` | empty (local disk only) | `s3://bucket?region=...`, `gs://bucket` or `azblob://container`. For MinIO: `s3://bucket?endpoint=http://minio:9000&region=us-east-1&use_path_style=true&disable_https=true&hostname_immutable=true`. **Required for the HA shape**, because replicas read segments other replicas wrote. Credentials come from the cloud SDK chain (IRSA, workload identity, `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) |
| `COLD_CACHE_MAX_SIZE_MB` | `20000` | Local cache of segments downloaded back from object storage. Least recently used segments are evicted first |

## Ingest buffer (JetStream) and brokers

| Variable | Default | Description |
| --- | --- | --- |
| `INGEST_BUFFER` | `valkey` (no buffer) | `jetstream`: a batch is acknowledged once the brokers hold it. In `all` mode the broker runs in-process |
| `NATS_URL` | empty | The broker cluster's client URL(s), comma-separated. Set on `api`, `worker` and `querier` |
| `NATS_TOKEN` | empty | Shared by brokers and their clients. Required wherever NATS listens on the network |
| `NATS_SERVER_NAME` | hostname | Unique per broker (the pod name in a StatefulSet) |
| `NATS_CLUSTER_NAME`, `NATS_ROUTES` | empty | The broker cluster: `nats-route://host:6222` of every broker, itself included |
| `NATS_PORT`, `NATS_CLUSTER_PORT`, `NATS_MONITOR_PORT` | `4222`, `6222`, `8222` | Broker listeners for clients, peers, and monitoring and health probes |
| `JETSTREAM_DIR` | `$LOGS_DATA_DIR/jetstream` | The broker's file store (a PVC on Kubernetes) |
| `JETSTREAM_REPLICAS` | `3` with routes, else `1` | Ingest stream replicas |
| `INGEST_STREAM_MAX_BYTES` | 10 GiB | Each signal's buffer. When it is full, ingest answers `429` / `RESOURCE_EXHAUSTED`. All three signals' buffers must fit the broker volume |
| `INGEST_L0_TARGET_BYTES` | 64 MiB | A worker writes a project's first-level segment once this much is buffered... |
| `INGEST_L0_MAX_AGE` | `1h` (at least `5m`) | ...or once the oldest batch is this old. Buffered rows are searchable in the meantime |

## Queries and executors

| Variable | Default | Description |
| --- | --- | --- |
| `QUERY_MAX_SCAN_GB` | `100` | The most stored data (GiB) one user query may read. A query over it is refused before reading anything. `0` turns the limit off |
| `QUERIER_TOKEN` | empty | Shared by `api` and `querier` replicas for the executors' result listener |
| `QUERIER_GRPC_ADDR` | `:4319` | An executor's result listener. Internal only |
| `QUERIER_ADVERTISE_ADDR` | hostname + port | How `api` replicas reach the executor (the pod IP on Kubernetes) |
| `QUERIER_CONCURRENCY` | CPU count | Query fragments an executor runs at once |
| `QUERIER_SPILL_MAX_SIZE` | `8GB` | The most disk an executor's spill files may use. They share the querier volume with the segment cache, so a search that needs more fails instead of filling the disk. Leftover spill files are removed at start |
| `QUERIER_WARM_HOURS` | `24` | On start, an executor downloads its share of this many hours of segments into its cache (up to half of `COLD_CACHE_MAX_SIZE_MB`), and from then on each segment it owns as it is uploaded. `0` turns both off |
| `QUERY_CACHE_TTL_HOURS` | `24` | Histograms and dashboard series keep each finished hour's counts in Valkey this long, so repeating a query only scans what changed. `0` turns it off |
| `LOG_CONTEXT_DEFAULT_FIELDS` | empty | Comma-separated fields added to the default scope of "Show logs around" (the log's cluster, namespace, deployment/statefulset/daemonset/job, container and service), for example `team` |
| `QUERY_PARTIAL_DOWNLOADS` | `true` | Read only the columns a query needs from a large cold segment (ranged reads into a sparse cache file) instead of downloading the whole segment |
| `QUERY_CACHE_DELAY_SECONDS` | `300` | Time partitions ending within this many seconds of now are never cached, because rows are still arriving for them |

## Alerting

See [Alerts & notifications](/docs/how-to/alerts/) for how these are used.

| Variable | Default | Description |
| --- | --- | --- |
| `ALERT_EVAL_SHARDS` | `1` | Rule evaluation is split this many ways, each shard under its own leader lock |
| `ALERT_EGRESS_ALLOWLIST` | empty | CIDRs webhooks may reach even though they are not public (in-network receivers) |
| `ALERT_EGRESS_DENYLIST` | empty | CIDRs webhooks may never reach (for example the cluster's service range) |

## Email and notification channels

Both are set up in **Obzly settings → Notifications & alerting**, not in the environment:

- **Email (SMTP):** host, port, STARTTLS or implicit TLS (never plaintext), username, password
  (stored encrypted and never shown again) and From address. Email channels and user invites send
  through it. **Send test email** checks it.
- **Notification channels** (Slack, webhook, PagerDuty, email) are defined once and made available
  to every project or to chosen ones. Alert rules pick from them.
- **Multi-site:** on a control plane both are central. Each Site fetches them from the control plane
  every 5 minutes (at the same address as `CONTROL_PLANE_JWKS_URL`), as a signed document encrypted
  to that Site's own key. A Site keeps the last copy if the control plane is unreachable and shows
  them read-only. See
  [Alerts & notifications](/docs/how-to/alerts/#multi-site).
- **Upgrading from `ALERT_SMTP_*`:** releases before v0.55.0 read the relay from `ALERT_SMTP_*`
  variables. On the first start of v0.55.0 or later they are imported once (a control plane's as its
  central relay, a Site's as its own) and then ignored. Remove them from your environment.

## Infrastructure inventory

| Variable | Default | Description |
| --- | --- | --- |
| `INVENTORY_RETENTION_DAYS` | `30` | An asset not seen for this many days is dropped from [Infrastructure](/docs/how-to/infrastructure/). Terminated pods and containers go after 7 days |

## Integrity audit

A sample of uploaded segments is checked against object storage on a schedule (see
[Backup & restore](/docs/operations/backup-restore/)).

| Variable | Default | Description |
| --- | --- | --- |
| `INTEGRITY_AUDIT_HOURS` | `168` | How often the audit runs. A negative value turns it off. Runs only with object storage |
| `INTEGRITY_AUDIT_PERCENT` | `1` | Share of uploaded segments sampled (at least one) |
| `INTEGRITY_AUDIT_MAX_SAMPLES` | `500` | Cap on samples per audit |

## Sign-in

SSO connectors (OIDC), SSO group mappings, MFA policy and SCIM tokens are configured in the UI,
not with environment variables. These variables enable the built-in GitHub and Google buttons:

| Variable | Default | Description |
| --- | --- | --- |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | empty | GitHub sign-in |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | empty | Google sign-in |

## Multi-site

See [Multi-site](/docs/deploy/multi-site/) for the overall setup.

Control plane side:

| Variable | Default | Description |
| --- | --- | --- |
| `CONTROL_PLANE_EGRESS_ALLOWLIST` | any public address | CIDRs the control plane may call Sites at |
| `SITE_ALLOW_INSECURE_URLS` | `false` | Allow `http://` Site URLs (local Compose only) |

Site side:

| Variable | Default | Description |
| --- | --- | --- |
| `CONTROL_PLANE_ISSUER` | empty (standalone) | The control plane's `PUBLIC_URL`. Setting it enables token exchange |
| `SITE_ID` | **required** with an issuer | The Site's slug in the control plane |
| `SITE_NAME` | `SITE_ID` | Display name |
| `CONTROL_PLANE_JWKS_URL` | `<issuer>/.well-known/jwks.json` | Where to fetch signing keys, for example over an internal address. Every 5 minutes the Site also fetches its organization plan (`…/api/v1/site-plans/<SITE_ID>`) and its notification channels and email settings (`…/api/v1/shared-config/<SITE_ID>`) next to it |
| `CONTROL_PLANE_LINK_BY_EMAIL` | `true` | Attach a central user to an existing local account with the same verified email |
| `CONTROL_PLANE_EGRESS_CIDRS` | empty | Accept token exchange only from these CIDRs |

## Roles

`SERVICE_MODE` picks what a process does. The same image runs every role.

| Mode | Runs | Notes |
| --- | --- | --- |
| `all` | Everything in one process | The single-container install |
| `api` | UI, REST, OTLP ingest, query coordination | Stateless. Run any number behind a load balancer |
| `worker` | Parquet writes from the buffer, compaction, retention, quotas, uploads, alert evaluation and delivery, integrity audit | No HTTP |
| `broker` | NATS JetStream only | 3 (one per zone) or 1 |
| `querier` | Query executors with a segment cache | Stateless |
| `control-plane` | Central sign-in, organizations, SCIM, Site registry and proxy, shared notification channels and email, Synthetics monitors and cloud connections | Holds no signal data |

For how the roles fit together, see [Architecture](/architecture/).

## Synthetics probe (`obzly-probe`)

The [Synthetics probe](/docs/deploy/probe/) is a separate binary and image. It reads only these
variables:

| Variable | Default | Description |
| --- | --- | --- |
| `OBZLY_CONTROL_PLANE_URL` | **required** | The control plane, as the probe reaches it |
| `OBZLY_PROBE_TOKEN` | **required** | The probe group's token, shown once when the group is added or its token replaced (**Synthetics → Probe groups**). Every instance of a group uses the same token. A replaced token keeps working for 24 hours |
| `OBZLY_PROBE_INSTANCE` | the host name | This instance's name within its probe group (`[A-Za-z0-9._-]`, up to 128 characters). Each monitor and cloud connection runs on one live instance. The Helm chart sets it to the pod name |
| `OBZLY_PROBE_DATA_DIR` | `/var/lib/obzly-probe` | Where the last config is cached (secrets included, file mode 0600), so checks keep running while the control plane is unreachable, and each cloud connection's latest inventory, so a restart doesn't rediscover |
| `OBZLY_PROBE_MAX_CONCURRENCY` | `256` | Checks run at once. Each mostly waits on the network, so a mass outage of slow timeouts still fits |
| `OBZLY_PROBE_TASK_WAIT` | `25s` | Long-poll for the editor's **Test** runs (1 to 55 seconds). Keep it under the read timeout of any proxy in front of the control plane (CloudFront's default is 30 seconds) |
| `OBZLY_PROBE_DENY_CIDRS` | empty | CIDRs checks may never reach. Loopback and link-local (cloud metadata) are always refused. [Cloud connection](/docs/how-to/cloud-connections/) scans don't go through this policy: they call the AWS and Azure APIs, and Azure's instance metadata for a managed identity |
| `OBZLY_PROBE_HEALTH_ADDR` | off | For example `:8080` serves `/healthz`: `200` once the probe has a config and the control plane answered recently |

Values for a monitor's `${env:NAME}` placeholders that aren't stored on the monitor are read from
the probe's own environment. See [Synthetics](/docs/how-to/synthetics/).
