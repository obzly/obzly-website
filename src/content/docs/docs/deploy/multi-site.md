---
title: Control plane & Sites
description: Put one sign-in and UI in front of many independently deployed Obzly installs, while each keeps its own data.
---

<!-- Source: obzly-dev/README.md, obzly-dev/deploy/README.md, obzly-dev/deploy/kubernetes/eks/control-plane/README.md, obzly-dev/ARCHITECTURE.md, obzly-dev/deploy/docker/docker-compose.multisite.yml.example, obzly-dev/deploy/docker/docker-compose.control-plane.yml.example, obzly-dev/docs/configuration.md, obzly-dev/docs/runbooks/upgrade.md, obzly-dev/frontend/src/features/settings/ui/SettingsComponent.tsx, obzly-dev/frontend/src/features/alerts/ui/NotificationSettingsComponent.tsx -->

Multi-site is optional. Once you run Obzly in more than one region, cluster or environment, a
**control plane** gives users one place to sign in and one UI for all of them, without moving any
data and without exposing each install's query and admin API to the internet.

## Concepts

- **Site**: a normal Obzly installation (any of the [deployment options](/docs/deploy/docker/))
  with a few extra environment variables set. It keeps its own Postgres, projects, plans, API keys,
  root admin, local MFA and audit log, and receives its own ingest.
- **Control plane**: the same image with `SERVICE_MODE=control-plane`. It holds central sign-in
  (users, SSO, MFA, invites), organizations and teams that span Sites, a SCIM 2.0 endpoint at
  `/scim/v2`, the Site registry and per-Site access grants, the notification channels and email
  relay every Site uses, [Synthetics](/docs/how-to/synthetics/) monitors and probe groups, and
  [cloud connections](/docs/how-to/cloud-connections/). It serves the UI and has its own
  Postgres and Valkey, never shared with a Site. It has no ingest, no OTLP listener and no object
  storage: it never stores a log, trace or metric.

### How requests flow

The browser only ever talks to the control plane. Site-scoped requests go to
`/sites/{siteId}/api/v1/...` on the control plane, which checks the user's grant on every request,
exchanges it for a short-lived token from that Site, and proxies the request. A Site's real address
is never sent to the browser.

Only the query and data surface is proxied (projects, log, trace and metric queries, Live Tail,
dashboards, settings, API keys, and so on). A Site's own sign-in, user admin and ingest endpoints
are never reachable through the control plane.

**Ingest is never proxied.** Collectors keep sending to each Site directly, with that Site's API
keys, so ingest keeps working even when the control plane is down.

### Data stays in each Site

Each Site keeps its ingest, projects, plans, API keys, root admin, local break-glass login and
audit log. The UI addresses one Site at a time; there is no cross-site query aggregation, and the
control plane never stores or caches query results. The exceptions are
[Infrastructure](/docs/how-to/infrastructure/) and **Obzly settings → Overview**, which read each
Site you can reach and combine the results in the browser. Sites with the same name (case-insensitive) appear as
one entry in the Site picker, and the project picker then lists each member Site's projects.

## Accounts: `superadmin` and `admin`

:::note[The control plane's bootstrap admin is `superadmin`]
A control plane's bootstrap admin is `superadmin` (unless you set `ADMIN_EMAIL`), while every
Site's root admin stays `admin`. The two break-glass accounts can't shadow each other.
:::

- When a central user first opens a Site, they are matched to an existing local account **by
  email** (`CONTROL_PLANE_LINK_BY_EMAIL`, on by default). Otherwise a new member account without
  a password is created on the Site.
- A Site's root admin is never linked. A central account must therefore not share its email with a
  Site's root admin: the Site refuses it, and the control plane shows that refusal.
- `superadmin` itself can't be used **on** a Site. Onboard everyone else from the control plane's
  **Users → Invite user**, or through SSO.
- MFA is enforced once, on the control plane; Sites don't ask again for those sessions.

Password and MFA resets work the same way as on a single install, but each role only manages its
own local users. On a control plane, use its container and login:

```bash
docker exec -it obzly-control-plane ./main --email="superadmin" --reset-mfa
```

## Per-Site grants

Being a central admin gives **no implicit access** to any Site; admins grant access explicitly,
including to themselves. A grant is either Site-wide or for one project:

| Grant | Gives |
| --- | --- |
| Site-wide `ADMIN` | Site admin |
| Site-wide `MEMBER` / `VIEWER` | `PROJECT_MEMBER` / `PROJECT_VIEWER` on every project of the Site, including projects created later |
| Project `PROJECT_ADMIN` / `PROJECT_MEMBER` / `PROJECT_VIEWER` | That role on one project. A higher per-project grant wins over a Site-wide one |

A Site's `OWNER` role stays local and can't be granted centrally. Grants are checked on every
request, so a revoked grant takes effect immediately. SSO groups can also map to Site roles; see
[SSO and SCIM](/docs/how-to/sso-scim/).

## Try it locally

One Compose file runs a control plane and one Site, each with its own Postgres and Valkey:

```bash
cp deploy/docker/docker-compose.multisite.yml.example docker-compose.yml
cp deploy/docker/.env.example .env   # set POSTGRES_PASSWORD
docker compose up -d --build
```

1. Sign in at `http://localhost:4005` (the control plane) as `superadmin`. The first sign-in asks
   for the bootstrap token from the control plane's log
   (`docker logs obzly-control-plane 2>&1 | grep bootstrapToken`).
2. Open **Obzly settings → Sites** and register `site-a` with the API URL `http://site-a:4005`. Plain
   `http://` is allowed here only because the example sets `SITE_ALLOW_INSECURE_URLS`.
3. Use **check connection**, then grant yourself `ADMIN` on the Site.
4. Pick the Site in the top bar and use it like a single install. Send data to the Site directly,
   with an API key from one of its projects.

To add more Sites, copy the `site-a` block with its own Postgres, Valkey, container name, `SITE_ID`
and volume path.

## Deploy a control plane

Pick one:

- **Docker Compose**: `deploy/docker/docker-compose.control-plane.yml.example`. Set
  `POSTGRES_PASSWORD` in `.env` and `PUBLIC_URL` in the file. To run more than one replica, copy
  the `control-plane` service behind a shared load balancer.
- **Install script**: `OBZLY_ROLE=control-plane` with `PUBLIC_URL`; see
  [Quick install](/docs/getting-started/quick-install/#installing-a-control-plane-or-a-site).
- **Helm**: `mode: control-plane`; see [Helm chart](/docs/deploy/helm/).
- **Kubernetes manifests**: see below.

`PUBLIC_URL` is required: the control plane's real, public, browser-facing origin. It is the
issuer (`iss`) of every assertion the control plane signs, so each Site's `CONTROL_PLANE_ISSUER`
must match it character for character. MCP clients' OAuth uses it too.

### On Kubernetes

[`deploy/kubernetes/eks/control-plane`](https://github.com/obzly/obzly/tree/main/deploy/kubernetes/eks/control-plane)
is a separate Kustomization in its own `obzly-control-plane` namespace, typically on its own
cluster or at least apart from the Sites it fronts.

1. Fill in `DATABASE_DSN` in `secret.yaml`: an externally hosted Postgres used only by the control
   plane. Migrations run on startup.
2. Set `PUBLIC_URL` in `configmap.yaml`.
3. Bring your own Ingress; `service.yaml` is a plain `ClusterIP`. The proxied Live Tail route
   (`/sites/{id}/api/v1/logs/tail/...`) streams, so turn off proxy buffering and allow a generous
   read timeout for it. If you use SCIM, your identity provider must reach `/scim/v2` on the same
   host.
4. `deployment.yaml` pins `kubernetes.io/arch: arm64`; remove it on amd64 nodes.

```bash
cd deploy/kubernetes/eks/control-plane
kubectl apply -k .
kubectl apply -f secret.yaml
```

It runs `replicas: 2` with `RollingUpdate`: unlike a single-replica Site, a control-plane outage
blocks queries against every Site it fronts. It is safe to run more, since it keeps no per-pod
state and migrations are leader-locked.

## Enroll a Site

Set these on the Site (in Compose, the commented multi-site block of the `obzly` service; in Helm,
`config.extra`; in the EKS manifests, `common/configmap.yaml`):

| Variable | |
| --- | --- |
| `CONTROL_PLANE_ISSUER` | The control plane's exact `PUBLIC_URL`. Enables enrollment |
| `SITE_ID` | Required. The slug you register the Site under in the control plane |
| `SITE_NAME` | Display name; defaults to `SITE_ID` |
| `CONTROL_PLANE_JWKS_URL` | Where the Site fetches the control plane's signing keys, if it reaches the control plane at another address (for example an internal one). Defaults to `<CONTROL_PLANE_ISSUER>/.well-known/jwks.json` |
| `CONTROL_PLANE_EGRESS_CIDRS` | Accept token exchange only from these CIDRs |
| `CONTROL_PLANE_LINK_BY_EMAIL` | Link a central user to an existing local account with the same verified email. Default `true` |

Then, signed in to the control plane, register the Site in **Obzly settings → Sites**, check the
connection and grant access. The Site's own **Obzly settings → General** shows the Site ID to
register it under. The Site's API URL must be an absolute `https://` URL with no path (unless
`SITE_ALLOW_INSECURE_URLS` is set, for local Compose only) and not a loopback or link-local address;
private network addresses are allowed. On the control plane, `CONTROL_PLANE_EGRESS_ALLOWLIST`
limits which CIDRs it may call Sites at.

For a Kubernetes Site, restrict its query and admin surface at the ingress to the control plane's
addresses while leaving ingest open; see
[Kubernetes on EKS](/docs/deploy/kubernetes-eks/#enroll-as-a-site).

:::tip[Load balancer timeouts]
The control plane waits up to 180 seconds for a Site, and a Site's search deadline is 170 seconds.
Set the idle timeout of the load balancers in front of both to at least 180 seconds (on an AWS
ALB: `alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=180`), or a
slow search ends in a `504` at 60 seconds.
:::

## Operating multi-site

- **Upgrades**: upgrade each Site first and the control plane last. The control plane ships the UI
  and must not be more than one version newer than the Sites it proxies. See
  [Upgrade](/docs/operations/upgrade/).
- **Backups**: the control plane's Postgres is the identity root for every Site; restore it first.
  See [Disaster recovery](/docs/operations/disaster-recovery/).
- **Notification channels and email**: defined once on the control plane, in **Obzly settings →
  Notifications & alerting**. Each Site fetches them every 5 minutes and keeps the last copy. A
  Site that had its own channels before keeps them until you use **Move Site's own here** on the
  control plane. See [Alerts & notifications](/docs/how-to/alerts/#multi-site).
- **Overview and updates**: the control plane's **Obzly settings → Overview** shows every
  deployment with ingest and storage per Site, and **Updates** shows whether each one is ready for
  the next version.
- **Outages**: if the control plane is down, queries through it stop, but ingest, alert
  notifications (from each Site's last copy of the channels) and each Site's local break-glass
  login keep working.
- **AI assistants**: one MCP endpoint on the control plane covers every Site you can access; see
  [MCP](/docs/how-to/mcp/).
