---
title: System requirements
description: What a Docker or Kubernetes installation of Obzly needs - hosts, versions, CPU, memory, disk, the services you provide and the ports it uses.
---

<!-- Source: obzly-dev/README.md, obzly-dev/install-obzly.sh, obzly-dev/deploy/docker/docker-compose.yml.example, obzly-dev/deploy/docker/docker-compose.ha.yml.example, obzly-dev/deploy/helm/obzly/values.yaml, obzly-dev/deploy/helm/obzly/README.md, obzly-dev/deploy/helm/obzly/templates/broker.yaml, obzly-dev/deploy/helm/obzly-probe/values.yaml, obzly-dev/ARCHITECTURE.md (Capacity and cost model) -->

Obzly runs as one image, `ghcr.io/obzly/obzly`, next to Postgres and Valkey. On Docker it starts
as a single container on one host; on Kubernetes the Helm chart runs each role as its own tier.
This page lists what each needs, using the defaults that ship with Obzly v0.57.0.

## At a glance

| Install | Machines | CPU | Memory | Disk | You also provide |
| --- | --- | --- | --- | --- | --- |
| [Quick install](/docs/getting-started/quick-install/) or [Docker Compose](/docs/getting-started/docker-compose/), one container | 1 Linux host | 2 cores | 4 GB | 20 GB, plus retention | Nothing: Postgres and Valkey run beside it |
| [Docker](/docs/deploy/docker/), every role split out | 1 Linux host | 4 cores suggested | 16 GB suggested | Object storage, plus local caches | Nothing: the example includes MinIO |
| [Helm](/docs/deploy/helm/), `ha` mode (default) | 3 nodes suggested | 2.9 vCPU requested | 5.6 GiB requested | 150 GiB of volumes | Postgres, object storage |
| [Helm](/docs/deploy/helm/), `single` mode | 1 node | 0.3 vCPU requested | 0.6 GiB requested | 20 GiB volume | Postgres |
| [Helm](/docs/deploy/helm/), `control-plane` mode | 1 node or more | 0.55 vCPU requested | 0.6 GiB requested | None | Postgres |

These are starting points for a small team. To size for your volume, see
[Sizing for your volume](#sizing-for-your-volume).

## Docker

### Host

- **OS**: Linux on `amd64` or `arm64`. Images are published for both.
- **Docker**: Docker Engine 20.10 or later and Docker Compose v2.0 or later.
- **Quick install**: the install script supports Ubuntu, Debian and Raspberry Pi OS, and installs
  Docker and the Compose plugin if they are missing. On any other distribution, use
  [Docker Compose](/docs/getting-started/docker-compose/).
- **Network**: outbound access to `ghcr.io` and Docker Hub to pull images on install and upgrade.

### One container

The default install runs three containers: `obzly`, Postgres 18 and Valkey 9.2.

| Resource | Minimum |
| --- | --- |
| CPU | 2 cores |
| Memory | 4 GB |
| Disk | 20 GB free, more for longer retention |

All data is stored on the host in the mounted volume (`./obzly-data`, or `/opt/obzly/obzly-data`
with the quick install). Disk use grows with what you ingest and how long you keep it, and the
retention settings of each project keep it in check. To keep local disk small, offload older
segments to S3-compatible object storage (S3, GCS, Azure Blob or MinIO) with `OBJECT_STORAGE_URL`;
see [Docker](/docs/deploy/docker/).

### Every role split out

`docker-compose.ha.yml.example` runs two `api` replicas, a `worker`, a `broker`, two `querier`s,
Postgres, Valkey and MinIO on one host.

- **Object storage is required**, because the replicas read segments that other replicas wrote.
  The example includes MinIO; point `OBJECT_STORAGE_URL` at your own store instead if you have one.
- **Memory**: the `worker` is capped at 3 GB and each `querier` at 2 GB, 7 GB together. With the
  two `api` replicas, the broker, Postgres, Valkey and MinIO on top, start with **4 cores and
  16 GB**.
- **Disk**: each `api` replica, the `worker`, the broker and each `querier` keep their own
  directory under `./obzly-data`. Plan for MinIO's data (your retention) plus the querier caches.

Everything runs on one host, so the host is still a single point of failure. To survive losing a
machine, run on Kubernetes.

### Control plane

A [multi-site](/docs/deploy/multi-site/) control plane runs the same image with Postgres and Valkey
and stores no telemetry, so the one-container host above is plenty. It needs no object storage.

## Kubernetes

### Cluster

- **Kubernetes** 1.23 or later (the chart uses `autoscaling/v2` and `policy/v1`). Use a version
  your provider still supports.
- **Helm** 3 or later.
- **Nodes** on `amd64` or `arm64`, or both.
- **A default StorageClass** that provisions volumes dynamically, or set `storageClass` on each
  volume in the values.
- **Zone labels**: with `broker.zoneSpread` on (the default), brokers spread across
  `topology.kubernetes.io/zone` and only schedule on nodes that carry that label. Managed clusters
  set it. For broker failover across zones, run nodes in three zones. On a cluster without zone
  labels, set `broker.zoneSpread: false`.
- **On-demand nodes for brokers**: they hold acknowledged batches until a worker writes them, so
  keep them off Spot or preemptible nodes with `broker.nodeSelector` or `tolerations`. See
  [Spot and on-demand nodes](#spot-and-on-demand-nodes) for the other components.

Optional:

- A **CNI that enforces NetworkPolicy** (for example Calico or Cilium), for the policies that limit
  who can reach Valkey, the brokers and the queriers. Without one, the policies are ignored.
- An **Ingress controller** for `ingress.enabled`. Give the load balancer an **idle timeout of at
  least 180 seconds**: a wide search can take up to 170 seconds.
- The **Prometheus Operator** CRDs, for `metrics.serviceMonitor.enabled`.

### Services you provide

| Service | `ha` | `single` | `control-plane` | Notes |
| --- | --- | --- | --- | --- |
| PostgreSQL | Required | Required | Required | Obzly ships and tests with Postgres 18. Managed Postgres such as Amazon RDS or Aurora works. Set `secrets.databaseDsn` or `secrets.existingSecret`. |
| Object storage | Required | Optional | Not used | S3, GCS, Azure Blob or MinIO, in `config.objectStorageUrl`. On S3 the role needs `s3:PutObject`, `s3:PutObjectTagging`, `s3:GetObject`, `s3:ListBucket` and `s3:DeleteObject` on the bucket. |
| Valkey | Bundled | Bundled | Bundled | Runs in the release (Valkey 9.2). Set `valkey.enabled: false` and `valkey.external.host` to use your own, such as ElastiCache. It holds caches and leases, not durable data. |

### `ha` mode

The default. Each tier is its own Deployment or StatefulSet; these are the chart's defaults.

| Tier | Replicas | CPU request / limit | Memory request / limit | Disk per pod |
| --- | --- | --- | --- | --- |
| `broker` | 3 | 250m / none | 512 MiB / 2 GiB | 50 GiB volume |
| `api` | 2 | 500m / 2 | 512 MiB / 2 GiB | Up to 20 GiB `emptyDir` |
| `worker` | 1 | 100m / 1 | 1 GiB / 3 GiB | Up to 10 GiB `emptyDir` |
| `querier` | 2 | 500m / 2 | 1 GiB / 2 GiB | Up to 20 GiB `emptyDir`, or a 40 GiB volume with `querier.persistence` |
| `valkey` | 1 | 50m / 250m | 64 MiB / 256 MiB | None |
| **Total** | 9 pods | **2.9 vCPU** requested | **5.6 GiB** requested, 17.3 GiB at the limits | **150 GiB** of volumes, up to 90 GiB of node disk |

Three nodes of **2 vCPU and 8 GiB** each fit these defaults with room for system pods, and give
each broker its own node. The `emptyDir` sizes are caps, not reservations, but node disks need
room for them: a pod that grows past its cap is evicted.

Brokers keep about an hour of ingest. Size `broker.storage.size` for that, and keep the three
`broker.streamMaxBytes` (one per signal) inside it. `broker.replicas` is 3 or 1; 2 is refused.

### `single` mode

One pod runs every role on a PersistentVolumeClaim:

| Pod | CPU request / limit | Memory request / limit | Disk |
| --- | --- | --- | --- |
| Obzly (`SERVICE_MODE=all`) | 250m / 2 | 512 MiB / 2 GiB | 20 GiB volume |
| Valkey | 50m / 250m | 64 MiB / 256 MiB | None |

### `control-plane` mode

| Pod | Replicas | CPU request / limit | Memory request / limit |
| --- | --- | --- | --- |
| Control plane | 2 | 250m / 1 | 256 MiB / 1 GiB |
| Valkey | 1 | 50m / 250m | 64 MiB / 256 MiB |

Set `config.publicUrl` to the address users reach it at; the control plane requires it.

## Synthetics probe

The [`obzly-probe`](/docs/deploy/probe/) is a small static binary for Linux (`amd64` and `arm64`),
a container image, or a Helm chart.

- **Helm**: 3 instances by default, each requesting 100m CPU and 128 MiB, capped at 512 MiB.
- **Linux VM or Docker**: a small VM is enough.
- **Network**: outbound HTTPS to the control plane and to each destination Site's OTLP endpoint. It
  accepts no inbound connections apart from an optional health port.

## Sizing for your volume

Size Obzly by how much raw telemetry you send per day: logs, spans and metrics before
compression. The figures come from Obzly's capacity model and are planning estimates, not
benchmarks: measure your own load, then adjust replicas or turn on `api.autoscaling` and
`querier.autoscaling`.

The model's rates:

- an `api` replica takes about **0.7 MB/s of raw ingest per vCPU** at a comfortable load, and two
  to four times that at peak;
- a `worker` needs about **3 vCPU per TB/day**;
- a `querier` needs about **1 vCPU per 25 TB stored**;
- each broker keeps about **an hour of ingest** on its volume;
- data compresses about **8×**, so a year of 1 GB/day takes about 46 GB of storage.

"2 × 4 vCPU, 16 GiB" means two replicas, each with 4 vCPU and 16 GiB of memory.

### Minimum

The least that keeps up: one replica of each role and no failover, so losing a machine stops
ingest until it is back. Fine for evaluation, or where a short gap in data is acceptable.

| Ingest per day | Layout | Compute | Postgres | Data stored, 1 year |
| --- | --- | --- | --- | --- |
| Up to 5 GB | One container, or `single` mode | 1 × 2 vCPU, 4 GB | Bundled (Docker), or 2 vCPU, 4 GiB | 46 to 228 GB |
| 10 GB | One container, or `single` mode | 1 × 2 vCPU, 8 GiB | 2 vCPU, 4 GiB | 456 GB |
| 50 GB | One container, or `single` mode | 1 × 2 vCPU, 8 GiB | 2 vCPU, 8 GiB | 2.3 TB |
| 100 GB | One container, or `single` mode | 1 × 4 vCPU, 16 GiB | 2 vCPU, 8 GiB | 4.6 TB |
| 1 TB | `ha` mode, `broker.replicas: 1` | `api` 2 × 4 vCPU, 16 GiB; `worker` 1 × 4 vCPU, 16 GiB; `querier` 1 × 4 vCPU, 16 GiB; `broker` 1 × 2 vCPU, 8 GiB with 50 GiB | 4 vCPU, 16 GiB | 46 TB |
| 5 TB | `ha` mode, `broker.replicas: 1` | `api` 10 × 4 vCPU, 16 GiB; `worker` 4 × 4 vCPU, 16 GiB; `querier` 3 × 4 vCPU, 16 GiB; `broker` 1 × 4 vCPU, 16 GiB with 210 GiB | 8 vCPU, 32 GiB | 228 TB |

From 10 GB/day, keep the data on object storage rather than local disk. In `single` mode, raise
`single.resources` to the size in the table: the chart's default caps the pod at 2 CPU and 2 GiB.

### Recommended

Room for peaks, and no single machine whose loss stops ingest: `api` runs two or more replicas,
brokers replicate each batch three ways across zones, and Postgres runs Multi-AZ. One `worker` is
enough at the smaller tiers: if it stops, batches wait in the brokers until its replacement
starts.

| Ingest per day | `api` | `worker` | `querier` | `broker` (on-demand) | Postgres |
| --- | --- | --- | --- | --- | --- |
| Up to 5 GB | 1 × 2 vCPU, 8 GiB running every role (one container, or `single` mode) | In the same pod | In the same pod | Not needed | 2 vCPU, 4 GiB |
| 10 GB | 2 × 2 vCPU, 8 GiB | 1 × 2 vCPU, 8 GiB | Queries run in `api` (`querier.enabled: false`) | 3 × 1 vCPU, 4 GiB, 50 GiB each | 2 vCPU, 4 GiB, Multi-AZ |
| 50 GB | 2 × 2 vCPU, 8 GiB | 1 × 2 vCPU, 8 GiB | Queries run in `api` | 3 × 1 vCPU, 4 GiB, 50 GiB each | 2 vCPU, 8 GiB, Multi-AZ |
| 100 GB | 2 × 4 vCPU, 16 GiB | 1 × 2 vCPU, 8 GiB | In `api`, or 1 × 4 vCPU, 16 GiB | 3 × 1 vCPU, 4 GiB, 50 GiB each | 2 vCPU, 8 GiB, Multi-AZ |
| 1 TB | 4 × 4 vCPU, 16 GiB | 1 × 4 vCPU, 16 GiB | 2 × 4 vCPU, 16 GiB | 3 × 2 vCPU, 8 GiB, 50 GiB each | 4 vCPU, 16 GiB, Multi-AZ |
| 5 TB | 20 × 4 vCPU, 16 GiB | 4 × 4 vCPU, 16 GiB | 10 × 4 vCPU, 16 GiB | 3 × 4 vCPU, 16 GiB, 210 GiB each | 8 vCPU, 32 GiB, Multi-AZ |

The bundled Valkey pod is enough up to about 100 GB/day. Above that, give Valkey its own node or
a managed service with 2 vCPU and about 6 GiB at 1 TB/day, and 4 vCPU and about 13 GiB at
5 TB/day. Below about 100 GB/day, Postgres and Valkey are most of the bill; at the TB tiers,
storage is.

## Spot and on-demand nodes

Spot (or preemptible) nodes cost much less, but the provider can take them back at short notice.
Run a component on them only if losing a pod loses nothing.

| Component | Spot | Why |
| --- | --- | --- |
| `querier` | **Yes**, the best fit | Stateless: its cache is an `emptyDir`. A search whose executor disappears is retried on another one within seconds. A replacement starts with a cold cache. Leave `querier.persistence` off on Spot: a volume ties the pod to one zone, so it can't follow a replacement node. |
| `worker` | **Yes** | Brokers hand unfinished batches to the next worker, and its writes are safe to repeat, so a reclaimed worker loses nothing. |
| `api` | **Yes, with an on-demand share** | It acknowledges a batch only after the brokers hold it, and it drains on shutdown: readiness fails at once and it keeps serving for `api.drainSeconds`. Keep about a third of the replicas on on-demand nodes, so one wave of reclaims can't take them all. Collectors retry the `503`s in between. |
| Control plane | **Yes, with one on-demand replica** | Stateless, but every request to every Site passes through it. |
| Synthetics probe | **Yes, with two or more instances** | A group's monitors move to the other instances within a minute. |
| `broker` | **No**, on-demand only | Holds acknowledged batches that aren't written yet, and the cluster's consensus state. Pin it with `broker.nodeSelector`, for example `karpenter.sh/capacity-type: on-demand`. |
| One container, or `single` mode | **No** | Every role runs in one pod on one volume, including recent data that isn't uploaded yet. |
| Postgres | **No**, on-demand and Multi-AZ, with point-in-time recovery | The catalog of every segment: the source of truth. |
| Valkey | **No** | Holds only caches, limits and leases, so a loss is brief, but it affects every request. |

Each tier in the Helm chart has its own `nodeSelector`, `tolerations` and `affinity` to place it.

## Network ports

| Port | Where | What |
| --- | --- | --- |
| `4005` | `obzly`, `api`, control plane | Web UI, REST API and OTLP/HTTP (`/v1/logs`, `/v1/traces`, `/v1/metrics`) |
| `4317` | `obzly`, `api` | OTLP/gRPC |
| `9464` | Every Obzly pod | Prometheus metrics |
| `4319` | `querier` | Query results for `api` pods only; never expose it |
| `4222`, `6222`, `8222` | `broker` | NATS client, cluster and monitoring; inside the cluster only |
| `6379` | `valkey` | Valkey; inside the cluster only |

The quick install lets you change the host ports with `OBZLY_HTTP_PORT` and `OBZLY_OTLP_PORT`.
