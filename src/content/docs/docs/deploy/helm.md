---
title: Helm chart
description: Deploy an Obzly Site or control plane on any Kubernetes cluster with the Helm chart.
---

<!-- Source: obzly-dev/deploy/helm/obzly/README.md, obzly-dev/deploy/helm/obzly/templates/NOTES.txt, obzly-dev/deploy/helm/obzly/values.yaml -->

One chart, in [`deploy/helm/obzly`](https://github.com/obzly/obzly/tree/main/deploy/helm/obzly),
deploys every role. It renders the same pods as the
[plain Kubernetes manifests](/docs/deploy/kubernetes-eks/), with values instead of edited YAML.

| `mode` | What runs |
| --- | --- |
| `ha` (default) | `broker` StatefulSet (NATS JetStream ingest buffer), `api` (UI, REST, OTLP, query coordination), `worker` (Parquet writes, compaction, retention, alert evaluation), `querier` (query executors) |
| `single` | One `SERVICE_MODE=all` pod on a PersistentVolumeClaim |
| `control-plane` | The [multi-site control plane](/docs/deploy/multi-site/) |

Postgres and object storage are always yours: RDS/Aurora or any Postgres, and S3 or any
S3-compatible store. Valkey runs in the release unless you set `valkey.enabled: false` and point
the chart at your own.

## Install

```bash
kubectl create namespace obzly
helm install obzly deploy/helm/obzly -n obzly \
  --set config.objectStorageUrl='s3://my-bucket?region=eu-west-1' \
  --set secrets.databaseDsn='host=... user=obzly password=... dbname=obzly port=5432 sslmode=require' \
  --set serviceAccount.annotations.eks\.amazonaws\.com/role-arn=arn:aws:iam::123456789012:role/obzly-s3 \
  --set broker.nodeSelector.karpenter\.sh/capacity-type=on-demand
```

The chart's notes print how to reach the UI and the OTLP endpoints:

- UI and API: `kubectl -n obzly port-forward svc/<release> 4005:4005`, then open
  `http://localhost:4005`, or enable `ingress.enabled`.
- OTLP: gRPC on port `4317` of the service, HTTP at `:4005/v1/logs`, `/v1/traces`, `/v1/metrics`.

The first start creates the bootstrap admin (`config.adminEmail`, `admin` by default) and logs a
one-time bootstrap token for setting its password:

```bash
kubectl -n obzly logs -l app.kubernetes.io/instance=obzly --tail=-1 | grep bootstrapToken
```

### S3 permissions

On AWS, the service account's IAM role (IRSA, set through `serviceAccount.annotations`) needs
`s3:PutObject`, `s3:PutObjectTagging`, `s3:GetObject`, `s3:ListBucket` and `s3:DeleteObject` on
the bucket.

### Bring your own Secret

To manage the Secret yourself (External Secrets, Sealed Secrets, ...), create it with the keys
`DATABASE_DSN`, `NATS_TOKEN` and `QUERIER_TOKEN` (ha mode), and optionally `VALKEY_PASSWORD` and
the `GITHUB_*` / `GOOGLE_*` OAuth settings, then set `secrets.existingSecret`. Otherwise the chart
creates `<release>-secrets`; NATS and querier tokens left empty are generated on install and kept
on upgrade.

## Production settings

- **`broker.nodeSelector` / `tolerations`**: on-demand nodes only. Brokers hold acknowledged
  batches until a worker writes them. Size `broker.storage.size` for about an hour of ingest and
  keep three times `broker.streamMaxBytes` inside it.
- **`broker.replicas`**: `3` (streams replicated three ways, one pod per zone) or `1` (no
  failover). `2` is refused.
- **`config.trustedProxies`**: your load balancer's CIDRs, so client IPs are real.
- **`api.autoscaling`** and **`querier.autoscaling`**: HPA on CPU.
- **`querier.networkPolicy`**: limits the executors' result port to `api` pods; needs a CNI that
  enforces NetworkPolicy.
- **`metrics.serviceMonitor`**: a Prometheus Operator PodMonitor for every tier. See
  [Monitoring Obzly](/docs/operations/monitoring/).
- **`config.publicUrl`**: the address users reach Obzly at, for [MCP](/docs/how-to/mcp/) clients'
  OAuth.

## Other settings

Any setting from the [configuration reference](/docs/reference/configuration/) goes in
`config.extra`, or `secrets.extra` for credentials. For example, alert email:

```yaml
config:
  extra:
    ALERT_SMTP_HOST: email-smtp.eu-west-1.amazonaws.com
    ALERT_SMTP_FROM: alerts@example.com
    ALERT_SMTP_USERNAME: AKIA...
secrets:
  extra:
    ALERT_SMTP_PASSWORD: ...
```

Use `config.extra` for `QUERY_MAX_SCAN_GB`, or for `SITE_ID` and `CONTROL_PLANE_ISSUER` to enroll
the release as a Site in a [control plane](/docs/deploy/multi-site/).

A control plane serves SCIM at `/scim/v2`. If you provision users that way, keep it reachable
through the Ingress; see [SSO and SCIM](/docs/how-to/sso-scim/).

## Upgrade

```bash
helm upgrade obzly deploy/helm/obzly -n obzly -f values.yaml --set image.tag=vX.Y.Z
```

The chart rolls brokers one pod at a time and keeps generated tokens. See
[Upgrade](/docs/operations/upgrade/) for the order across Sites and the control plane.

## Restore

After a Postgres restore, reconcile the catalog with the bucket (see
[Backup & restore](/docs/operations/backup-restore/)):

```bash
kubectl -n obzly exec deploy/obzly-worker -- ./main reconcile
```

## Architectures

Releases from v0.47.0 are published for `linux/arm64` and `linux/amd64`, so the chart pins no
architecture. Earlier releases are arm64 only: on amd64 nodes use v0.47.0 or later (the chart's
default), or add `nodeSelector: {kubernetes.io/arch: arm64}` for an older tag.

## Not included

The chart doesn't run a migration Job (the app migrates at startup, under a lock), in-cluster
Postgres, or a Valkey operator.
