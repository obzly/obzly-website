---
title: Docker Compose
description: Run Obzly, Postgres and Valkey on one host with Docker Compose.
---

<!-- Source: obzly-dev/README.md, obzly-dev/deploy/docker/README.md, obzly-dev/deploy/docker/docker-compose.yml.example, obzly-dev/deploy/docker/.env.example -->

Obzly runs as one app container next to its own Postgres and Valkey containers. This is the same
shape the [install script](/docs/getting-started/quick-install/) sets up; use Compose directly if
you want to customize it or aren't on a Debian/Ubuntu host.

You need Docker Engine 20.10+ and Docker Compose v2.0+.

## Set up

Run everything from the **repository root**, not from inside `deploy/docker/`: the example builds
the image from source, and its build context is the repository root where the `Dockerfile` lives.

```bash
git clone https://github.com/obzly/obzly.git
cd obzly
cp deploy/docker/docker-compose.yml.example docker-compose.yml
cp deploy/docker/.env.example .env
```

Edit `.env` and set a real `POSTGRES_PASSWORD`. One way to generate one:

```bash
openssl rand -hex 16
```

Everything else in `.env` is optional and documented in the file's comments. Then start it:

```bash
docker compose up -d --build
```

Obzly comes up on `http://localhost:4005`. The ports it publishes:

| Port | Serves |
| --- | --- |
| `4005` | Web UI, REST API and OTLP/HTTP (`/v1/logs`, `/v1/traces`, `/v1/metrics`) |
| `4317` | OTLP/gRPC |

Data lives under `./obzly-data` (Parquet segments, plus the Postgres and Valkey data directories),
relative to where you ran `docker compose`.

For the first sign-in (bootstrap token, admin password and MFA), see
[Quick install: Sign in](/docs/getting-started/quick-install/#sign-in). The container is named
`obzly`, so the same `docker logs obzly` and `docker exec -it obzly ./main ...` commands apply.

## Use the published image instead of building

To run a release instead of building from source, replace the `build:` block of the `obzly`
service with:

```yaml
image: ghcr.io/obzly/obzly:${OBZLY_IMAGE_TAG:-latest}
```

and set `OBZLY_IMAGE_TAG` in `.env` (for example `v0.48.1`). Images are published for
`linux/amd64` and `linux/arm64`.

## Configure

Add any setting from the [configuration reference](/docs/reference/configuration/) to the `obzly`
service's `environment:`. Common ones:

- `ADMIN_EMAIL` (set in `.env`): the bootstrap admin's login instead of `admin`. Changing it later
  renames the existing account rather than creating a second one.
- `TRUSTED_PROXIES`: the CIDR of your reverse proxy or load balancer, so logs, the audit log, rate
  limits and project IP allow-lists see real client IPs. Never use `0.0.0.0/0`.
- `PUBLIC_URL`: the address users reach Obzly at, so [MCP clients](/docs/how-to/mcp/) get the right
  OAuth origin.

Email (SMTP) for alert notifications and invites, and the notification channels themselves, are
set up in **Obzly settings → Notifications & alerting**, not in the environment. See
[Alerts & notifications](/docs/how-to/alerts/).

## Upgrade

When building from source:

```bash
git pull
docker compose up -d --build
```

With the published image:

```bash
docker compose pull && docker compose up -d
```

Only the `obzly` container is replaced; Postgres and Valkey data are untouched. Migrations run
automatically on startup. Check [Upgrade](/docs/operations/upgrade/) for versions that need action.

## Next steps

- [Create your first project and API key](/docs/getting-started/first-project/).
- Move older data to object storage, run every role separately for HA, or try multi-site:
  see [Docker](/docs/deploy/docker/).
- Plan backups: [Backup & restore](/docs/operations/backup-restore/).
