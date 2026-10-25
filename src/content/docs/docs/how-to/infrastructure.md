---
title: Infrastructure inventory
description: See every cluster, node, host, workload, pod, container and service your agents report, with health, lifecycle and changes.
---

<!-- Source: obzly-dev/docs/INFRASTRUCTURE.md, obzly-dev/README.md, obzly-dev/docs/configuration.md, obzly-dev/docs/runbooks/upgrade.md -->

The **Infrastructure** tab lists every asset Obzly knows about, with its health and the reason for
it, its lifecycle, and recent changes. It is built from the data your agents already send:
**there is nothing to install or configure.**

## What's listed

| Kind | Identified by | Parent |
| --- | --- | --- |
| Cluster | `k8s_cluster_name` | |
| Node | cluster and host name | cluster |
| Host / VM | `host_id`, else host name (shown as an EC2 instance or Azure VM when the agent reports its cloud platform) | |
| Namespace | cluster and namespace | cluster |
| Workload | cluster, namespace, kind and name (Deployment, StatefulSet, DaemonSet, ...) | namespace |
| Pod | cluster, namespace and pod UID (else name) | workload, node |
| Container | pod and container name | pod |
| Docker container | host and container ID | host |
| Service | namespace and `service_name`, from traces | workload, when known |

Each asset keeps its resource attributes (OS, instance type, region, zone, Kubernetes version,
image, ...) and the signals it was seen in (metrics, logs, traces).

With [cloud connections](/docs/how-to/cloud-connections/), the inventory also lists cloud resources
that run no agent: load balancers, databases, buckets, functions and scaling groups.

## How it's built

A background job on each **Site** rebuilds every project's inventory **every 5 minutes**. It reads
which resource label combinations were seen and when, the log and error counts per pod, container
and service, the services in traces, a batch of instant PromQL queries for CPU, memory, disk,
restarts, pod phase and replicas, and the alerts firing in the project. It never reads raw samples
or raw logs, so the cost is a handful of small queries per project.

- A **standalone Site** shows the Infrastructure tab with its own inventory.
- On a **control plane**, the tab merges the inventories of every Site you can reach, in your
  browser. Each user sees only the projects they can read. A Site that doesn't answer shows as
  "unavailable" instead of failing the page.

## Health

Each asset has a colour and the reasons for it. The default thresholds are:

| Colour | Health | Reasons |
| --- | --- | --- |
| Green | Healthy | Every rule passes |
| Amber | Warning | Node or host CPU at 90 % or more; memory at 90 % or more (a pod's or container's against its limit, when it has one); filesystem at 85 % or more; 3 or more container restarts in the last hour; error logs above 5 % of a pod's lines in the last 15 minutes; a pod Pending for over 10 minutes or in phase Unknown; fewer replicas available than desired; some of a cluster's nodes critical |
| Red | Critical | A node, host or cluster not reporting; a node NotReady; memory at 97 % or more or filesystem at 95 % or more on a node or host; 10 or more restarts in an hour (crash looping); pod phase Failed; no replicas available; no healthy node in a cluster |
| Blue | Inactive | Terminated, or stopped in the cloud |
| Grey | Unknown | No data, for example a pod that stopped reporting, or a service seen only in traces |

- A workload, namespace or cluster rolls up its children: it takes the worst health of its pods or
  namespaces, capped at amber unless its own replicas or nodes say red.
- A **firing alert** whose labels name an asset (for example `k8s_pod_name` or `host_name`) gives
  it the alert's severity, with "Alert ... is firing" as the reason.

## Lifecycle and changes

| State | When |
| --- | --- |
| **New** | First seen in the last 24 hours |
| **Active** | Reporting |
| **Not reporting** | No data for 10 minutes |
| **Terminated** | A pod or container gone for 30 minutes (usually replaced); a host or node gone for 24 hours |

The **change feed** records new assets, state changes (such as a pod terminating) and health
changes. It is kept **7 days**.

## Using the tab

- **Overview:** health across all assets that aren't terminated, **Needs attention** (critical
  first, with the reason), recent changes over the last 24 hours, top CPU and memory consumers
  (pods, nodes and hosts), and breakdowns by Site (or project on a standalone Site) and by cloud
  and region.
- **Assets:** kind and health filters, Site and cluster filters, a search by name, label or IP,
  and sorting from the table headers. Columns include CPU, memory, restarts in
  24 hours, age, last seen and lifecycle. Switch between **Flat** and **Tree**: cluster → node →
  pod, cluster → namespace → workload → pod, host → containers.
- **Asset detail** opens as a panel from the right: health and its reasons, relationships (parents
  and what runs under it), CPU, memory, network and disk charts, the lifecycle timeline, every
  resource attribute, and where Obzly sees it. **Open logs** (with a search for the asset),
  **Open traces** (for a service) and **Open dashboards** jump to the asset's project.

## Pod phase, restarts and replicas (Kubernetes)

Pod phase, restart counts, replica counts and node readiness come from the **cluster agent**, a
one-replica Deployment with read-only access to the Kubernetes API that the Kubernetes manifest
adds (on by default). Its workload labels on pod metrics also group pods under their Deployment,
StatefulSet or DaemonSet.

Clusters on an older manifest still appear, without phase, replicas or restarts. To get them,
generate the manifest again from **Data Sources → Kubernetes** and re-apply it; see
[Kubernetes OpenTelemetry Collector](/docs/how-to/kubernetes-otel-collector/). Pod and container
series start afresh once after re-applying, because they now carry their workload's name;
dashboards are unaffected.

:::caution[Set a cluster name when a project has several clusters]
A cluster can't report its own name. Data without `k8s_cluster_name` is grouped under **(unnamed
cluster)**. When one project receives data from more than one cluster, set **Cluster name** (for
example `harbor-prod-1`) when you generate each cluster's manifest.
:::

Without the workload labels (an older manifest), only Deployment pods (`<name>-<hash>-<suffix>`)
and StatefulSet pods (`<name>-<n>`) are grouped under a workload; DaemonSet and Job pods sit
directly under their namespace.

## Limits and retention

- Each Site returns at most **5000 assets**, worst health first. The tab says when a Site has more.
- An asset that isn't seen for `INVENTORY_RETENTION_DAYS` days (default `30`) is dropped;
  terminated pods and containers go after 7 days. See
  [Configuration](/docs/reference/configuration/#infrastructure-inventory).
- Health thresholds are the defaults above; they can't be changed per project.

## Cloud resources

[Cloud connections](/docs/how-to/cloud-connections/) add what runs in your AWS accounts and Azure
subscriptions without an agent, and join cloud VMs and managed clusters to the hosts and clusters
the agents report. On a control plane, **Infrastructure → Cloud connections** lists them.
