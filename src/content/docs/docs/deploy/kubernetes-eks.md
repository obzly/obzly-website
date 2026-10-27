---
title: Kubernetes on EKS
description: Deploy Obzly on AWS EKS with plain kubectl apply -k manifests, as a single replica or a highly available Site.
---

<!-- Source: obzly-dev/deploy/kubernetes/eks/README.md, obzly-dev/deploy/kubernetes/eks/ha/README.md, obzly-dev/deploy/kubernetes/eks/control-plane/README.md, obzly-dev/deploy/kubernetes/eks/common/configmap.yaml, obzly-dev/deploy/kubernetes/eks/secret.yaml -->

[`deploy/kubernetes/eks`](https://github.com/obzly/obzly/tree/main/deploy/kubernetes/eks) holds
plain manifests for `kubectl apply -k` and GitOps tools that prefer them. They target AWS EKS with
an arm64 (Graviton) node pool, externally hosted Postgres (RDS/Aurora) and S3 access through IRSA.
The [Helm chart](/docs/deploy/helm/) deploys the same shapes from values.

| Directory | Deploys |
| --- | --- |
| `eks/` | One `obzly` replica on a PVC, plus in-cluster Valkey |
| `eks/ha/` | Three brokers, `obzly-api`, `obzly-worker` and `obzly-querier` |
| `eks/control-plane/` | A [multi-site control plane](/docs/deploy/multi-site/), in its own namespace |

Both `eks/` and `eks/ha/` share the namespace, service account, ConfigMap and Valkey in
`eks/common/`. Apply one or the other to a namespace, never both.

## Before applying

Check [System requirements](/docs/getting-started/requirements/#kubernetes) for node sizes, sizing
by ingest volume and which tiers can run on Spot.

1. **IAM role for S3 (IRSA)**: create an IAM role trusted by your cluster's OIDC provider, with
   `s3:PutObject`, `s3:PutObjectTagging`, `s3:GetObject`, `s3:ListBucket` and `s3:DeleteObject` on
   the bucket. Uploads carry object tags for bucket lifecycle rules, and S3 refuses a tagged upload
   without `s3:PutObjectTagging`. Put the role ARN in the `eks.amazonaws.com/role-arn` annotation in
   `common/serviceaccount.yaml`.
2. **Bucket and region**: set `OBJECT_STORAGE_URL` in `common/configmap.yaml` to
   `s3://harborline-obzly?region=eu-west-1`. Leave out `endpoint` and `use_path_style`, which are for
   MinIO only. The bucket must already exist; Obzly never creates it.
3. **Postgres**: fill in `DATABASE_DSN` in `secret.yaml`. Obzly runs its own migrations on every
   startup.
4. **Storage class**: `pvc.yaml` uses `storageClassName: gp3`. Check `kubectl get storageclass` and
   change it if your cluster names its EBS class differently.
5. **Real client IPs**: set `TRUSTED_PROXIES` in `common/configmap.yaml` to your VPC CIDR. An ALB or
   ingress controller connects from an address in that range and passes the client in
   `X-Forwarded-For`. Left empty, request logs, the audit log, sign-in rate limiting, project IP
   allow-lists and the `client_ip` of ingested logs all show the load balancer's private IP. An NLB
   with client IP preservation needs nothing here. Pods read the ConfigMap only at startup, so run
   `kubectl -n obzly rollout restart deployment` after changing it.

## Single replica

```bash
cd deploy/kubernetes/eks

# Everything except secrets:
kubectl apply -k .

# Secrets separately, after filling in secret.yaml:
kubectl apply -f secret.yaml
```

You can swap the last step for your own secret manager (External Secrets Operator, Sealed Secrets,
the AWS Secrets Manager CSI driver, ...) as long as the Secret's name, namespace and keys stay the
same.

How this shape is built:

- **One replica with a `ReadWriteOnce` PVC** and the **`Recreate`** strategy, so two pods never
  fight over the volume or run migrations at once. Each deploy has a short downtime window. Use
  `ha/` for several replicas.
- **No Ingress**: `service.yaml` is a plain `ClusterIP`. Point your own Ingress or ALB at it.
- **Valkey in the cluster, without a PVC**: it only holds caches and rate limits. Point
  `VALKEY_HOST` / `VALKEY_PORT` at an external instance (for example ElastiCache) if you prefer.
- **`nodeSelector: kubernetes.io/arch: arm64`**: pins pods to Graviton nodes. Releases from v0.47.0
  are also published for `linux/amd64`, so remove it on amd64 nodes.

:::caution[Data not yet uploaded]
The PVC holds segments written in the last ~15 seconds that aren't uploaded to S3 yet, plus rows
buffered in memory. If the pod is lost first, they are lost with it. Setting
`INGEST_BUFFER=jetstream` (without `NATS_URL`) runs the JetStream buffer inside the pod, on the
PVC: a batch is acknowledged only once the buffer holds it, so a process crash or pod restart loses
nothing. Losing the node can still drop up to the last ~2 minutes. For no loss on a node failure,
use `ha/`.
:::

## High availability (`ha/`)

| Component | Runs |
| --- | --- |
| `obzly-broker` | `SERVICE_MODE=broker`: three-pod StatefulSet (one per zone, on-demand nodes, a 50 Gi PVC each), streams replicated three ways, a PodDisruptionBudget so brokers roll one at a time |
| `obzly-api` | `SERVICE_MODE=api`, 2 replicas, `RollingUpdate`, `emptyDir` disk. UI, query API, ingest (REST, OTLP HTTP and gRPC) and query coordination |
| `obzly-worker` | `SERVICE_MODE=worker`, 1 replica, no ports. Parquet writes, compaction, retention, quotas, uploads, reconciliation, alerting and the weekly integrity audit. 3 GiB memory limit |
| `obzly-querier` | `SERVICE_MODE=querier`, 2 replicas with a 20 Gi `emptyDir` segment cache. Stateless, so they suit Spot nodes |

`networkpolicy-querier.yaml` lets only `obzly-api` pods reach the executors' result port (`4319`),
while metrics (`9464`) stay open to scrapers; it needs a CNI that enforces NetworkPolicy.
`service.yaml` points only at `obzly-api`.

**Ingest.** `obzly-api` acknowledges a batch only after the brokers hold it, and `obzly-worker`
writes it to Parquet, so losing an `api` pod, a worker or one broker loses no acknowledged data.
Rows are searchable while they wait. When the buffer is full, ingest answers `429` /
`RESOURCE_EXHAUSTED` and OTel Collectors retry. Each signal's buffer holds up to 10 GiB
(`INGEST_STREAM_MAX_BYTES`); keep all three inside the broker PVC, sized for about an hour of ingest.

**Queries.** Each `obzly-api` replica splits a query into fragments for the executors and merges
the results. A segment keeps going to the same executor, so caches stay warm. A failed fragment is
retried on another executor, then in the `api` pod; with no executors running, `api` pods run
queries themselves.

### Before applying `ha/`

The same prerequisites as above, plus:

- **`NATS_TOKEN` and `QUERIER_TOKEN`** in `secret.yaml`: replace both `<RANDOM_SECRET>` placeholders
  with different long random strings (`openssl rand -hex 32`).
- **On-demand nodes for the brokers**: `broker.yaml` selects `eks.amazonaws.com/capacityType:
  ON_DEMAND`. Change it to your cluster's on-demand label (for example
  `karpenter.sh/capacity-type: on-demand`). Brokers must never run on Spot.
- **`OBJECT_STORAGE_URL` is required**: each pod's disk is its own, and object storage is how one
  replica reads segments another wrote.

`QUERY_MAX_SCAN_GB` (default `100`) limits how much stored data one user query may read; raise it
in `common/configmap.yaml` if your largest legitimate queries need more.

```bash
cd deploy/kubernetes/eks/ha
kubectl apply -k .
kubectl apply -f ../secret.yaml
```

### Moving from single replica to `ha/`

Apply the `ha/` kustomization. It creates the brokers, `obzly-api`, `obzly-worker` and
`obzly-querier` next to the running `obzly` Deployment. Once `obzly-api` is healthy and serving
traffic, remove the old pieces:

```bash
kubectl delete deployment obzly service obzly pvc obzly-data -n obzly
```

An older `ha/` install without brokers upgrades as a normal rolling update: the brokers start
first, the `api` and `worker` pods restart until the brokers answer, and existing segments stay
readable.

### Scaling further

- `obzly-api`: `kubectl scale deployment obzly-api -n obzly --replicas=N`, or an HPA. Every replica
  is identical.
- `obzly-worker`: more replicas add ingest and compaction throughput (each signal's 64 shards are
  shared out by lease); a lost worker's shards move to the others when its lease expires.
- `obzly-querier`: add replicas for query throughput. Adding or removing one moves only about 1/N
  of the segments, so caches mostly stay warm.
- `obzly-broker`: stays at three. Size its PVCs and `INGEST_STREAM_MAX_BYTES` for your ingest rate.

## Enroll as a Site

Either shape can join a [control plane](/docs/deploy/multi-site/) while keeping its own data,
projects, plans, API keys and root admin:

1. Uncomment the `SITE_ID` / `SITE_NAME` / `CONTROL_PLANE_ISSUER` / `CONTROL_PLANE_JWKS_URL` /
   `CONTROL_PLANE_EGRESS_CIDRS` block in `common/configmap.yaml`. `SITE_ID` must match the slug you
   register the Site under in the control plane's **Obzly settings → Sites**.
2. `CONTROL_PLANE_ISSUER` must be the control plane's exact public `PUBLIC_URL`.
   `CONTROL_PLANE_JWKS_URL` is the address this cluster can actually reach the control plane at:
   its public origin, or an internal DNS name if both run in the same or a peered network. It
   defaults to `<CONTROL_PLANE_ISSUER>/.well-known/jwks.json`.
3. Restrict the Site's query and admin surface to the control plane at the ingress, for example
   with an ALB `alb.ingress.kubernetes.io/inbound-cidrs` allow-list or a WAF rule for the control
   plane's egress addresses (and set `CONTROL_PLANE_EGRESS_CIDRS` to the same range), or with mTLS.
   On `ha/`, only `obzly-api` needs this. Keep ingest open: `/v1/logs`, `/v1/traces`,
   `/api/v1/logs/receiving` and the OTLP gRPC port (`4317`) stay reachable by collectors directly.
4. The Site's own root admin and local accounts keep working as a break-glass path.

## Control plane manifests

`eks/control-plane/` deploys a control plane in its own `obzly-control-plane` namespace with
`replicas: 2`, no PVC, no object storage and no OTLP port. It needs its own Postgres (never shared
with a Site), `PUBLIC_URL` in `configmap.yaml`, and your own Ingress. See
[Control plane & Sites](/docs/deploy/multi-site/#on-kubernetes).

## Operate

Every setting is in the [configuration reference](/docs/reference/configuration/): add it to
`common/configmap.yaml`, or to `secret.yaml` for credentials. Email (SMTP) and notification
channels are not among them: set them up in Obzly settings (see
[Alerts & notifications](/docs/how-to/alerts/)). If an older install still has `ALERT_SMTP_*` in
its ConfigMap or Secret, it was imported on the first start of v0.55.0 and can be removed. After a Postgres restore, reconcile
the catalog with the bucket from any Obzly pod:

```bash
kubectl -n obzly exec deploy/obzly -- ./main reconcile            # report only
```

See [Upgrade](/docs/operations/upgrade/), [Backup & restore](/docs/operations/backup-restore/) and
[Monitoring Obzly](/docs/operations/monitoring/). The pods expose metrics on a `metrics` container
port with `prometheus.io/scrape|port|path` annotations.
