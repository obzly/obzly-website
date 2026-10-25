---
title: Quick install
description: Install Obzly on a single Debian or Ubuntu host with one command.
---

<!-- Source: obzly-dev/README.md, obzly-dev/install-obzly.sh, obzly-dev/backend/cmd/main.go, obzly-dev/deploy/helm/obzly/templates/NOTES.txt -->

The install script is the fastest way to run Obzly on one Linux host. It works on **Ubuntu,
Debian and Raspberry Pi OS** and must run as root. On other systems, use
[Docker Compose](/docs/getting-started/docker-compose/) instead.

```bash
sudo apt-get install -y curl && \
sudo curl -sSL https://raw.githubusercontent.com/obzly/obzly/main/install-obzly.sh \
| sudo bash
```

Check the [system requirements](/docs/#system-requirements) first: at least 2 CPU cores, 4 GB of
RAM and 20 GB of disk.

## What the script does

1. Installs Docker and the Docker Compose plugin if they are missing, and enables Docker on boot so
   Obzly comes back after a reboot.
2. Creates `/opt/obzly` and, on the first run only, writes:
   - `/opt/obzly/.env` (mode `600`) with a randomly generated `POSTGRES_PASSWORD`;
   - `/opt/obzly/docker-compose.yml` with three containers: `obzly-postgres` (Postgres 18),
     `obzly-valkey` (Valkey) and `obzly` (the `ghcr.io/obzly/obzly` image). Data is stored under
     `/opt/obzly/obzly-data`.
3. If `ufw` is active, allows the web and OTLP ports (`4005/tcp` and `4317/tcp` by default).
4. Pulls the image, starts the containers and waits for Obzly to report healthy.

The install log is written to `/var/log/obzly-install.log`.

:::note[Safe to re-run]
Re-running the script never overwrites an existing `docker-compose.yml` or `.env`, so your edits
and your Postgres password are kept. A re-run just pulls the latest image and restarts.
:::

## Options

Set these environment variables to change the defaults. Because the script runs under `sudo`, put
them after `sudo`:

```bash
curl -sSL https://raw.githubusercontent.com/obzly/obzly/main/install-obzly.sh \
| sudo OBZLY_IMAGE_TAG=v0.48.1 OBZLY_HTTP_PORT=8080 bash
```

| Variable | Default | What it does |
| --- | --- | --- |
| `OBZLY_IMAGE_TAG` | `latest` | Image tag to install |
| `OBZLY_HTTP_PORT` | `4005` | Host port for the web UI, API and OTLP/HTTP |
| `OBZLY_OTLP_PORT` | `4317` | Host port for the OTLP gRPC receiver |
| `ADMIN_EMAIL` | `admin` (`superadmin` for a control plane) | Login of the bootstrap admin account. Only applied on the first install; edit `.env` later to change it |
| `OBZLY_ROLE` | `standalone` | `standalone`, `control-plane` or `site` (see below) |

### Installing a control plane or a Site

`OBZLY_ROLE` turns the same install into part of a [multi-site setup](/docs/deploy/multi-site/):

- `OBZLY_ROLE=control-plane` requires `PUBLIC_URL`: the control plane's public, browser-facing
  origin (scheme and host, no path), for example `https://cp.harborline.example`.
- `OBZLY_ROLE=site` requires `SITE_ID` (the slug you register the Site under in the control plane)
  and `CONTROL_PLANE_ISSUER` (the control plane's exact `PUBLIC_URL`). `SITE_NAME`,
  `CONTROL_PLANE_JWKS_URL` and `CONTROL_PLANE_EGRESS_CIDRS` are optional; see the
  [configuration reference](/docs/reference/configuration/).

```bash
curl -sSL https://raw.githubusercontent.com/obzly/obzly/main/install-obzly.sh \
| sudo OBZLY_ROLE=site SITE_ID=site-north CONTROL_PLANE_ISSUER=https://cp.harborline.example bash
```

## Sign in

Open `http://localhost:4005` (or `http://<server-ip>:4005` from another machine).

On first start Obzly creates the bootstrap admin account, `admin` unless you set `ADMIN_EMAIL`, and
writes a one-time **bootstrap token** to the container log. The sign-in page asks for that token
before it lets you set the admin password:

```bash
docker logs obzly 2>&1 | grep bootstrapToken
```

Admin accounts must set up TOTP multi-factor authentication (Google Authenticator, Authy,
1Password and similar apps work) at their first sign-in. Then continue with
[your first project](/docs/getting-started/first-project/).

:::caution[Plain HTTP]
The install serves unencrypted HTTP. Passwords, session tokens, API keys and all ingested data
travel in the clear. If `ufw` was active, the script also opened ports `4005` and `4317` to the
internet. Before using Obzly beyond local or trusted-network testing, put a TLS-terminating reverse
proxy (nginx, Caddy, Nginx Proxy Manager and so on) in front of it, stop exposing the ports
directly, and set `TRUSTED_PROXIES` so client IPs are real.
:::

### Lost bootstrap token

The token is logged only once, when the admin account is created, so it is gone if the container
was replaced or its log rotated. Print a new one (the previous token stops working):

```bash
docker exec -it obzly ./main --reset-bootstrap-token
```

This works only while the bootstrap admin has no password yet. Once it has one, use
[Reset the admin password](#reset-the-admin-password) instead.

## Manage the install

```bash
cd /opt/obzly && docker compose ps                          # status
cd /opt/obzly && docker compose logs -f                     # logs
cd /opt/obzly && docker compose pull && docker compose up -d   # update to the latest image
```

Before updating, check **Obzly settings → Updates** and read [Upgrade](/docs/operations/upgrade/).

## Reset the admin password

```bash
docker exec -it obzly ./main --email="admin"
```

You are prompted for the new password with hidden input. `--new-password=...` also works for
scripted use, but avoid it interactively: a password on the command line is visible to other
processes (`ps`) and stays in shell history.

Replace `admin` with the email of the account to reset, or with your `ADMIN_EMAIL` value for the
bootstrap admin. On a control plane the bootstrap account is `superadmin` by default. On a Site,
this resets the Site's own local (break-glass) account; centrally managed users are reset from the
control plane.

## Reset MFA for a lost authenticator

If an admin loses their authenticator and no other admin can use **Reset MFA** in user management,
clear it from the command line:

```bash
docker exec -it obzly ./main --email="admin" --reset-mfa
```

The user signs in with their password and is asked to set MFA up again. Add `--new-password` (or
run the password reset above) if the password is lost too. The reset is recorded in the audit log.

## Change the admin email

The bootstrap admin's login is the literal `admin` by default. Set `ADMIN_EMAIL` in
`/opt/obzly/.env` to a real email address and restart: the existing account is renamed in place,
not duplicated.

```bash
cd /opt/obzly && docker compose up -d
```
