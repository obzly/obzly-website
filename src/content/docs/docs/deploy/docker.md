---
title: Docker
description: Run Obzly with Docker Compose as one container, with every role split out for HA, or as a multi-site setup.
---

<!-- Source: obzly-dev/deploy/docker/README.md, obzly-dev/deploy/README.md, obzly-dev/deploy/docker/docker-compose.yml.example, obzly-dev/deploy/docker/docker-compose.ha.yml.example, obzly-dev/deploy/docker/.env.example, obzly-dev/deploy/docker/docker-compose.multisite.yml.example, obzly-dev/deploy/docker/docker-compose.control-plane.yml.example -->

The [`deploy/docker`](https://github.com/obzly/obzly/tree/main/deploy/docker) directory has four
Compose files. Copy the one you want to `docker-compose.yml` in the **repository root** (the
examples build the image from source, with the repository root as build context), copy
`deploy/docker/.env.example` to `.env`, and fill it in.

| File | Runs |
| --- | --- |
| `docker-compose.yml.example` | One app container plus Postgres and Valkey. The default. |
| `docker-compose.ha.yml.example` | Every role separately: two `api` replicas, a `worker`, a `broker`, two `querier`s, plus Postgres, Valkey and MinIO. |
| `docker-compose.control-plane.yml.example` | A standalone control plane for a multi-site setup. |
| `docker-compose.multisite.yml.example` | A control plane and one Site in one file, for trying multi-site locally. |

To run a published release instead of building, replace each service's `build:` block with
`image: ghcr.io/obzly/obzly:${OBZLY_IMAGE_TAG:-latest}` and set `OBZLY_IMAGE_TAG` in `.env`.
Images are published for `linux/amd64` and `linux/arm64`. For the CPU, memory and disk each
layout needs, see [System requirements](/docs/getting-started/requirements/#docker).

## Single container

The setup steps are in [Docker Compose](/docs/getting-started/docker-compose/). In short:

```bash
cp deploy/docker/docker-compose.yml.example docker-compose.yml
cp deploy/docker/.env.example .env   # set POSTGRES_PASSWORD
docker compose up -d --build
```

Obzly listens on `4005` (UI, API, OTLP/HTTP) and `4317` (OTLP/gRPC). Add any setting from the
[configuration reference](/docs/reference/configuration/) to the `obzly` service's `environment:`,
for example `PUBLIC_URL` so MCP clients get the right OAuth origin, or `TRUSTED_PROXIES` behind a
reverse proxy. Email (SMTP) and notification channels are set up in Obzly settings (see
[Alerts & notifications](/docs/how-to/alerts/)).

## Object storage (optional)

By default every segment stays on local disk. With object storage on, segments are compacted and
uploaded, and downloaded back on demand when a query needs one that is no longer local. It is off
by default; local disk alone works fine for a single container.

### MinIO for local testing

`docker-compose.yml.example` contains a commented-out `minio` / `minio-init` service pair:

1. Uncomment both services. `minio-init` creates the `obzly-segments` bucket, since Obzly never
   creates a bucket itself.
2. In the `obzly` service, uncomment `OBJECT_STORAGE_URL` and the `AWS_ACCESS_KEY_ID` /
   `AWS_SECRET_ACCESS_KEY` lines.
3. Set `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` in `.env`. MinIO's root user doubles as the
   access key pair Obzly uses.

A MinIO `OBJECT_STORAGE_URL` looks like this:

```text
s3://obzly-segments?endpoint=http://minio:9000&region=us-east-1&use_path_style=true&disable_https=true&hostname_immutable=true
```

The MinIO console is published on `127.0.0.1:9001` only.

### AWS S3, GCS or Azure Blob

Set `OBJECT_STORAGE_URL` to `s3://harborline-obzly?region=eu-west-1` (or `gs://bucket`,
`azblob://container`) and provide credentials. Outside Kubernetes there is no IRSA, so for S3 use
static `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` credentials. The bucket must already exist.

## HA and scale-out

`docker-compose.ha.yml.example` runs the roles separately on one Docker host:

- **`obzly-api-a`, `obzly-api-b`**: two `api` replicas, each with its own disk, serving the UI,
  query API and ingest. Put your own load balancer in front of both (they publish `4005`/`4317` and
  `4006`/`4318`). Add more by copying a replica block and renaming it and its volume path.
- **`obzly-worker`**: writes ingested batches to Parquet and runs compaction, retention, quotas,
  uploads, alert evaluation and the integrity audit. More workers share the work through leases.
- **`broker`**: the NATS JetStream ingest buffer. An `api` replica acknowledges a batch once the
  broker holds it, so killing an `api` replica or the worker loses no acknowledged data. Rows are
  searchable while they wait.
- **`obzly-querier-a`, `obzly-querier-b`**: query executors. The `api` replicas split each query
  into fragments for them, and run queries themselves when none are up.
- **Postgres, Valkey and MinIO**. Object storage is **required** here: it is how one replica reads
  segments another wrote.

Setup is the same as above with the HA file, plus two more secrets in `.env`:

```bash
cp deploy/docker/docker-compose.ha.yml.example docker-compose.yml
cp deploy/docker/.env.example .env
# set POSTGRES_PASSWORD, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD,
# and NATS_TOKEN and QUERIER_TOKEN (openssl rand -hex 32 each)
docker compose up -d --build
```

:::note
Postgres, Valkey and MinIO are single instances in this file: make them highly available with your
usual tooling. One broker also keeps only one copy of each batch. For a broker cluster that
survives losing a node, use the Kubernetes [HA manifests](/docs/deploy/kubernetes-eks/) or the
[Helm chart](/docs/deploy/helm/), which run three.
:::

The executors' result port (`4319`) is never published to the host. `QUERY_MAX_SCAN_GB` (default
`100`) limits how much stored data one user query may read. To watch everything, scrape each
service's `:9464/metrics`; see [Monitoring Obzly](/docs/operations/monitoring/).

## Multi-site

A control plane gives many Obzly installs (Sites) one sign-in and one UI. Two ways to try it with
Compose:

- **Enroll an existing install as a Site**: uncomment the multi-site block (`SITE_ID`,
  `SITE_NAME`, `CONTROL_PLANE_ISSUER`, ...) in the `obzly` (or `obzly-api-*`) service's
  environment. Everything else about the install stays as it is.
- **Try the whole thing locally**: `docker-compose.multisite.yml.example` runs a control plane and
  a Site, each with its own Postgres and Valkey.

`docker-compose.control-plane.yml.example` is the production shape for a standalone control plane.
Once signed in to the control plane, register each Site in **Obzly settings → Sites**. See
[Control plane & Sites](/docs/deploy/multi-site/) for the full walkthrough.

The [Synthetics probe](/docs/deploy/probe/) is a separate image, `ghcr.io/obzly/obzly-probe`, that
you run wherever you want checks to come from.

## Upgrade

```bash
git pull
docker compose up -d --build
```

Or, with the published image, `docker compose pull && docker compose up -d`. Postgres and Valkey
data aren't touched, and migrations run automatically at startup. Read
[Upgrade](/docs/operations/upgrade/) before moving to a new version.

## Back up

Back up Postgres with its own tools (`pg_dump`, or WAL archiving for point-in-time recovery) and,
with object storage, keep bucket versioning on. With object storage, `./obzly-data` only holds
segments not yet uploaded and caches; without it, it holds every segment and must be backed up too.
See [Backup & restore](/docs/operations/backup-restore/).
