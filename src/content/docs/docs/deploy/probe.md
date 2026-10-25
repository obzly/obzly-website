---
title: Synthetics probe
description: Install obzly-probe on a Linux VM, in Docker or with Helm, to run synthetic monitors and cloud scans from your own locations.
---

<!-- Source: obzly-dev/deploy/probe/install.sh, obzly-dev/deploy/probe/obzly-probe.service, obzly-dev/deploy/helm/obzly-probe/values.yaml, obzly-dev/deploy/helm/obzly-probe/Chart.yaml, obzly-dev/deploy/helm/obzly-probe/templates/NOTES.txt, obzly-dev/deploy/helm/obzly-probe/templates/deployment.yaml, obzly-dev/deploy/helm/obzly-probe/templates/pdb.yaml, obzly-dev/deploy/helm/obzly-probe/templates/serviceaccount.yaml, obzly-dev/docs/configuration.md, obzly-dev/docs/SYNTHETICS.md, obzly-dev/docs/runbooks/upgrade.md -->

`obzly-probe` is a small static binary that runs [synthetic monitors](/docs/how-to/synthetics/)
and [cloud connection](/docs/how-to/cloud-connections/) scans from where you install it. It pulls
its configuration from the control plane, runs the monitors on its own schedule, and sends the
results as OTLP straight to the destination Site. It ships as Linux binaries (amd64 and arm64)
with an install script and a systemd unit, a distroless image `ghcr.io/obzly/obzly-probe`, and the
Helm chart [`deploy/helm/obzly-probe`](https://github.com/obzly/obzly/tree/main/deploy/helm/obzly-probe).

## Probe groups

A **probe group** is one location, such as `edge-north`, with **one token**. Every instance you run
with that token joins the group:

- Instances are named by `OBZLY_PROBE_INSTANCE`: the host name by default, the pod name with the
  Helm chart.
- Each monitor (and each cloud connection) runs on **one live instance** of the group per interval,
  spread across the instances. The data volume is the same as with one probe.
- Instances check in every 25 seconds. One that stays silent for 60 seconds leaves, and its monitors
  move to the others, typically **within a minute**.
- **Test** runs from the monitor editor go to any live instance.

Create a group in **Synthetics → Probe groups → Add probe group** with a name and a location. The
token (`obz_prb_...`) is shown once, with ready-made install snippets for Linux, Docker and Helm.

The group list shows each instance with its version, last heartbeat and the monitors it runs now
(instances heard from in the last 24 hours). A group is amber when an instance stopped in the last
10 minutes and red when it has no live instance.

**Rotate token** issues a new token. Instances on the old one keep working for **24 hours**, so
update them within a day.

## Linux VM (systemd)

On Linux amd64 or arm64 with systemd, run as root:

```bash
curl -fsSL https://github.com/obzly/obzly/releases/latest/download/install.sh | \
  sudo OBZLY_RELEASES=https://github.com/obzly/obzly/releases \
    OBZLY_CONTROL_PLANE_URL=https://obzly.harborline.example \
    OBZLY_PROBE_TOKEN=obz_prb_... sh
```

The script:

1. downloads `obzly-probe_linux_<arch>` and `checksums.txt` from the release and refuses to install
   on a checksum mismatch;
2. installs the binary as `/usr/local/bin/obzly-probe` and creates an `obzly-probe` system user;
3. writes the URL and token to `/etc/obzly-probe.env` (mode `0600`);
4. installs `obzly-probe.service`, then enables and starts it.

`OBZLY_PROBE_VERSION=0.56.0` installs a given release instead of the latest; `OBZLY_RELEASES` is
where releases are downloaded from. Follow the logs with `journalctl -u obzly-probe -f`, and print
the version with `obzly-probe version`.

Run the same command on every VM of a location: each VM joins the group as an instance named after
its host name. To install by hand instead, download the same files:

```bash
curl -fsSLO https://github.com/obzly/obzly/releases/latest/download/obzly-probe_linux_amd64
curl -fsSLO https://github.com/obzly/obzly/releases/latest/download/checksums.txt
curl -fsSLO https://github.com/obzly/obzly/releases/latest/download/obzly-probe.service
sha256sum --check --ignore-missing checksums.txt
```

The systemd unit runs the probe as the `obzly-probe` user with its cache in `/var/lib/obzly-probe`,
restarts it on failure, and grants only `CAP_NET_RAW` (for ICMP monitors) on top of a hardened
sandbox.

## Docker

```bash
docker run -d --name obzly-probe --restart unless-stopped \
  -e OBZLY_CONTROL_PLANE_URL=https://obzly.harborline.example \
  -e OBZLY_PROBE_TOKEN=obz_prb_... \
  -e OBZLY_PROBE_INSTANCE=edge-north-1 \
  -e OBZLY_PROBE_HEALTH_ADDR=:8080 \
  -v obzly-probe:/var/lib/obzly-probe \
  ghcr.io/obzly/obzly-probe:v0.56.0
```

The image is distroless and runs as a non-root user. Images are tagged `v<version>` and `latest`.

:::tip[Name each instance]
Inside a container the host name is the container ID, which changes when the container is
recreated. Set `OBZLY_PROBE_INSTANCE` (or `--hostname`) so the instance keeps its name in the group.
:::

ICMP monitors use unprivileged ping sockets, which Docker's default `net.ipv4.ping_group_range`
allows; otherwise add `--cap-add NET_RAW`.

## Kubernetes (Helm)

From a clone of the [repository](https://github.com/obzly/obzly):

```bash
helm upgrade --install obzly-probe deploy/helm/obzly-probe \
  --namespace obzly-probe --create-namespace \
  --set controlPlaneUrl=https://obzly.harborline.example \
  --set token=obz_prb_... \
  --set replicas=3
```

The chart deploys one probe group's instances:

- **`replicas: 3`** by default. All replicas share the group token and each is named after its pod.
- A **PodDisruptionBudget** keeps all but one running through node drains (when `replicas` is more
  than 1; `podDisruptionBudget.enabled`).
- Preferred **anti-affinity** spreads the replicas across zones and nodes (unless you set
  `affinity`). Rolling updates replace one pod at a time.
- A Secret holds the token, or use `existingSecret` with a key `OBZLY_PROBE_TOKEN`.
- Pods run as non-root with a read-only root filesystem and all capabilities dropped, and serve
  `/healthz` on port 8080 for the readiness probe.

| Value | Default | Description |
| --- | --- | --- |
| `controlPlaneUrl` | required | The control plane as the cluster reaches it |
| `token` / `existingSecret` | required (one of them) | The group token, or a Secret of your own with key `OBZLY_PROBE_TOKEN` |
| `replicas` | `3` | Instances of the group. Set `1` to keep one |
| `podDisruptionBudget.enabled` | `true` | Keep all but one replica during drains |
| `maxConcurrency` | `256` | Checks run at once per instance. Each mostly waits on the network, so a mass outage of slow timeouts still fits; set it lower on a small host |
| `taskWait` | `25s` | Long-poll for editor **Test** runs |
| `denyCidrs` | empty | Comma-separated CIDRs monitors must never reach |
| `netRaw` | `false` | Add `CAP_NET_RAW` for ICMP when the node doesn't allow ping sockets |
| `env` | `[]` | Extra environment, for example values for `${env:NAME}` placeholders |
| `serviceAccount.create` / `.name` / `.annotations` | `true` / release name / `{}` | The service account the probe runs as |
| `podLabels`, `podAnnotations` | `{}` | Extra pod labels and annotations |
| `image.tag` | the chart's `appVersion` | Image tag to deploy |
| `resources` | requests 100m CPU, 128Mi; limit 512Mi | Container resources |

### The probe group's cloud identity

For [cloud connections](/docs/how-to/cloud-connections/) that use the probe's own identity, give
the chart's service account one:

```yaml
# AWS IRSA
serviceAccount:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::111122223333:role/obzly-probe
```

```yaml
# Azure workload identity
serviceAccount:
  annotations:
    azure.workload.identity/client-id: <client ID>
podLabels:
  azure.workload.identity/use: "true"
```

EKS Pod Identity needs no annotation, only an association with the service account.

## Environment variables

The probe reads only these (see also
[Configuration](/docs/reference/configuration/#synthetics-probe-obzly-probe)):

| Variable | Default | Description |
| --- | --- | --- |
| `OBZLY_CONTROL_PLANE_URL` | required | The control plane, as the probe reaches it |
| `OBZLY_PROBE_TOKEN` | required | The probe group's token. Every instance of a group uses the same token |
| `OBZLY_PROBE_INSTANCE` | the host name | This instance's name in its group (letters, digits, `.`, `_`, `-`; up to 128 characters) |
| `OBZLY_PROBE_DATA_DIR` | `/var/lib/obzly-probe` | Where the last configuration is cached (secrets included, mode `0600`), so monitors keep running while the control plane is unreachable, and each cloud connection's latest inventory, so a restart doesn't rediscover |
| `OBZLY_PROBE_MAX_CONCURRENCY` | `256` | Checks run at once |
| `OBZLY_PROBE_TASK_WAIT` | `25s` | Long-poll for editor **Test** runs, 1 to 55 seconds |
| `OBZLY_PROBE_DENY_CIDRS` | empty | Comma-separated CIDRs monitors may never reach |
| `OBZLY_PROBE_HEALTH_ADDR` | off | For example `:8080` serves `/healthz`: `200` once the probe has a configuration and the control plane answered recently |

Values for a monitor's `${env:NAME}` placeholders that aren't stored on the monitor are read from
the probe's own environment.

## Network

- The probe needs outbound HTTPS to the control plane and to each destination Site's OTLP URL. It
  never accepts inbound connections, apart from the optional health port.
- Monitors **may reach private addresses** (probes test internal services). **Loopback and
  link-local addresses, including cloud metadata (169.254.0.0/16), are always refused.** Block more
  with `OBZLY_PROBE_DENY_CIDRS`, for example your cluster's service range.
- Cloud connection scans don't go through this policy: they call the AWS and Azure APIs, and
  Azure's instance metadata for a managed identity.

:::caution[Proxies with a short read timeout]
Each instance keeps one long-poll open to the control plane for **Test** runs. Keep
`OBZLY_PROBE_TASK_WAIT` (Helm `taskWait`) under the read timeout of any proxy or CDN between the
probe and the control plane. The 25-second default fits CloudFront's 30-second default.
:::

## Upgrading from before v0.56.0

Probes became probe groups in v0.56.0. An existing probe becomes a group of one, keeping its token
and location, and a probe older than v0.56.0 keeps working as one instance named **`default`**.
Upgrade the probes after the control plane:

- **Linux VM:** run the install command again; it downloads the latest release and restarts the
  service.
- **Docker:** recreate the container with the new image tag.
- **Helm:** `helm upgrade` with the new chart. Chart 0.2.0 runs `replicas: 3` with a
  PodDisruptionBudget and creates a service account; set `replicas: 1` to keep one instance.
