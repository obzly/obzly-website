---
title: Kubernetes logs & metrics with the OTel Collector
description: Collect pod logs and node and kubelet metrics with an OpenTelemetry Collector DaemonSet, and add zero-code traces with OBI.
---
<!-- Source: obzly-dev/frontend/src/features/projects/ui/kubernetesOtelConfig.ts, obzly-dev/frontend/src/features/projects/ui/dataSources/kubernetesDataSource.ts, obzly-dev/frontend/src/features/projects/ui/dataSources/obiDataSource.ts, obzly-dev/deploy/kubernetes/obi/README.md -->

This guide runs an OpenTelemetry Collector on every node of a Kubernetes cluster. It sends
everything to one Obzly project over OTLP/HTTP, authenticated with an API key:

- **Pod logs**: every container's log files on the node, tagged with pod, namespace, node,
  deployment and container names.
- **Node metrics**: CPU, memory, disk, filesystem, network and load for the node itself.
- **Pod and container metrics**: CPU, memory, network and filesystem from the node's kubelet
  (the same data `kubectl top pod` uses).
- **App telemetry**: OTLP logs, traces and metrics that apps in the cluster push to the
  collector.

You need a project in Obzly (see [Create your first project](/docs/getting-started/first-project/)),
`kubectl` access to the cluster, and an Obzly URL the cluster's nodes can reach.

## Generate the manifest

The quickest route is the **Kubernetes** entry in the Data Sources catalog. It generates one
manifest with a dedicated API key already in it.

1. In your project, open **Data Sources** and pick **Kubernetes**.
2. Leave **API key** empty to create a new key for this collector, or select an existing one and
   paste its value.
3. Set **Obzly endpoint** to a URL reachable from the cluster, for example
   `https://obzly.example.com`.
4. Fill in the options:

   | Field | Default | What it does |
   | --- | --- | --- |
   | Kubernetes namespace | `obzly-otel` | Namespace the collector is deployed into |
   | Cluster name | empty | Added to every log and metric as `k8s.cluster.name`. A cluster can't report its own name, so set it if you run more than one |
   | Exclude namespaces | empty | Logs and pod metrics from these namespaces are not collected. Comma-separated, `*` and `?` wildcards allowed, for example `kube-system, monitoring-*` |
   | Only these namespaces | empty (all) | If set, only these namespaces are collected, minus any excluded ones. Node-level metrics are always collected |
   | Exclude pods | empty | Skip logs and metrics from pods whose name matches, in any namespace, for example `noisy-batch-*` |
   | Use host network | off | Runs the collector on each node's network. Needed on EKS Auto Mode, and on any node with an instance-metadata hop limit of 1, to get cloud and host attributes. Node network metrics then report the node's interfaces. Ports 4317 and 4318 must be free on every node |

5. Generate the config and save it as `obzly-otel-collector.yaml`.

:::caution[The manifest contains a secret]
The API key is embedded in the manifest's Secret and shown only once. Store the file somewhere
safe. To rotate the key, delete it on the project's **API Keys** page and generate a new config.
:::

## Apply it

```bash
kubectl apply -f obzly-otel-collector.yaml
```

Check that one collector pod is running on each node and that it isn't logging export errors:

```bash
kubectl -n obzly-otel get pods -o wide
kubectl -n obzly-otel logs daemonset/obzly-otel-collector
```

Pod logs appear in **Search** shortly after they are written. The collector tails from the end
of each file, so lines written before it started are not sent. Metrics appear on the next 30-second
scrape.

For ready-made views, create a dashboard from the **Kubernetes Pods & Nodes** or
**K8S Cluster Overview (Grafana 15661)** template on the **Dashboards** page.

## What the manifest deploys

The generated file contains a Namespace, a Secret holding the API key, a ConfigMap with the
collector config, a ServiceAccount with a ClusterRole and binding, a Service on ports 4317 and
4318, and the DaemonSet itself (image `otel/opentelemetry-collector-contrib:0.161.0`, requesting
100m CPU and 128Mi memory, limited to 512Mi memory).

The collector config, abridged. It omits the `transform/severity` statements, so generate the
full version from Data Sources rather than copying this one:

```yaml
receivers:
  # Tails every container's log files on this node.
  file_log:
    include: ["/var/log/pods/*/*/*.log"]
    exclude: ["/var/log/pods/obzly-otel_obzly-otel-collector*/*/*.log"]
    start_at: end
    include_file_path: true
    include_file_name: false
    operators:
      - type: container

  # OTLP pushed by apps in the cluster.
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Node-level metrics, from the node's root filesystem mounted at /hostfs.
  host_metrics:
    root_path: /hostfs
    collection_interval: 30s
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
      filesystem: {}
      network: {}
      load: {}

  # Pod and container metrics from this node's kubelet.
  kubelet_stats:
    collection_interval: 30s
    auth_type: serviceAccount
    endpoint: "https://${env:KUBE_NODE_IP}:10250"
    insecure_skip_verify: true
    metric_groups: [container, pod, node, volume]

processors:
  batch:
    send_batch_size: 2500
    send_batch_max_size: 2500
  # transform/severity: the generated config also fills in a missing log level from
  # JSON level/severity keys, klog prefixes, logfmt level=, [level] brackets or a bare
  # ERROR/WARN token. Lines with no level stay info.
  resource_detection:
    detectors: [env, eks, ec2, system]
    timeout: 5s
    override: false
  k8s_attributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.pod.name
        - k8s.namespace.name
        - k8s.node.name
        - k8s.deployment.name
        - k8s.container.name
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.uid

exporters:
  otlp_http:
    endpoint: "https://obzly.example.com"
    headers:
      X-API-Key: "${env:OBZLY_API_KEY}"

service:
  pipelines:
    logs:
      receivers: [file_log, otlp]
      processors: [transform/severity, resource_detection, k8s_attributes, batch]
      exporters: [otlp_http]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp_http]
    metrics:
      receivers: [otlp, host_metrics, kubelet_stats]
      processors: [resource_detection, batch]
      exporters: [otlp_http]
```

When you set a cluster name or namespace and pod filters, the generator adds a
`resource/cluster_name` processor and a `filter/namespaces` processor to the logs and metrics
pipelines, and narrows the `file_log` include and exclude paths so filtered log files are never
read.

A few details worth knowing:

- **Batch size.** `send_batch_max_size: 2500` keeps each export under Obzly's per-request batch
  limit. Obzly rejects an oversized request as a whole, so keep this cap if you edit the config.
- **Kubelet access.** The ClusterRole grants `get` on `nodes/stats` and `nodes/proxy` for
  `kubelet_stats`, and `get`/`list`/`watch` on pods, namespaces, nodes and ReplicaSets for
  `k8s_attributes` (ReplicaSets are needed to resolve `k8s.deployment.name`). The kubelet is
  reached by the node's IP because node names don't always resolve in DNS, and its certificate
  is self-signed on most clusters, hence `insecure_skip_verify`.
- **EKS detection.** The `eks` detector reads the `aws-auth` ConfigMap in `kube-system`, so the
  ClusterRole also allows `get` on that one ConfigMap. Off EKS the cloud detectors simply find
  nothing.
- **Self-signed Obzly certificate.** If your Obzly endpoint uses an internal CA, uncomment the
  `tls: insecure_skip_verify: true` lines under the exporter in the generated file.

In Obzly, attribute names are stored with underscores, so `k8s.pod.name` becomes `k8s_pod_name`
in searches and PromQL. See [Attribute names](/docs/how-to/grafana-promql/#attribute-names).

## Send app telemetry through the collector

Apps instrumented with an OpenTelemetry SDK can export to the collector's Service instead of to
Obzly directly. The collector adds the API key, so the apps don't need it:

```bash
# OTLP/gRPC
OTEL_EXPORTER_OTLP_ENDPOINT=http://obzly-otel-collector.obzly-otel.svc.cluster.local:4317
# or OTLP/HTTP
OTEL_EXPORTER_OTLP_ENDPOINT=http://obzly-otel-collector.obzly-otel.svc.cluster.local:4318
```

Replace `obzly-otel` with your namespace if you changed it. Logs pushed this way keep the
service name and attributes the SDK sets.

## Zero-code traces with OBI

OBI (OpenTelemetry eBPF Instrumentation) runs as a second, optional DaemonSet. It needs `hostPID`, `hostNetwork` and
eBPF capabilities, so it lives in its own namespace and adopting it is a separate decision.

- **Network map.** With OBI's `network` metrics feature, it exports `obi.network.flow.bytes` and
  `obi.network.flow.packets`. Obzly's **Service Map** uses them to draw edges for services that
  have no tracing SDK, such as a bare Postgres or Redis. OBI reports each flow twice per node
  (workload and Service), and Obzly de-duplicates this when building the map.
- **Application traces.** OBI can also produce traces for your applications with no code
  changes (HTTP, gRPC, SQL, Redis, Kafka and similar calls), plus request-rate and latency
  metrics, over the same OTLP connection. This costs extra CPU on every node.

### Generate the OBI bundle

In **Data Sources**, pick **eBPF Network Map (OBI)**:

| Field | Default | What it does |
| --- | --- | --- |
| Kubernetes namespace | `obzly-obi` | Namespace OBI is deployed into |
| Cluster name | empty | Sets `k8s.cluster.name`. OBI often can't detect it (it logs a warning), so setting it is recommended |
| Trace applications | No | Also generate application traces for the namespaces below |
| Namespaces to trace | empty (all except system namespaces) | Where your **applications** run, comma-separated with wildcards. Not OBI's own namespace: pointing it there finds nothing to instrument, with no error |
| Trace permissions | Capabilities only | How much privilege the tracing DaemonSet gets (see below) |
| Deploy Kubernetes metadata cache | No | Adds OBI's k8s-cache: one shared API-server watch instead of one per node. Recommended for large clusters |

Save the result as `obzly-obi.yaml`, review it, and apply it:

```bash
kubectl apply -f obzly-obi.yaml
```

Network edges appear on the Service Map once `obi.network.flow.bytes` metrics arrive.

### Trace permissions

Uprobe-based tracing needs more privilege than the network map. Pick the narrowest option that
works on your nodes:

| Option | securityContext | Result |
| --- | --- | --- |
| Capabilities only | adds `DAC_OVERRIDE` | Works where SELinux isn't enforcing. On Bottlerocket it hangs at "attaching uprobes" |
| SELinux label | adds `seLinuxOptions: {type: super_t}` | Traces work. OBI's Node.js injector fails, so no Node.js runtime metrics |
| SELinux label + SYS_ADMIN | also adds `SYS_ADMIN` | Traces and the Node.js injector work |
| Privileged | `privileged: true` | Everything works, with full host access |

:::tip[Troubleshooting traces]
If OBI logs "attaching uprobes as uprobe_multi links" and then nothing more, while network
metrics keep arriving, the pod lacks the privilege it needs: move one step down the table. Check
a node that actually runs the target pods, since a node with no matching workload also stops at
that line. Pin the OBI image version, because `otel/ebpf-instrument:main` moves.
:::

### Deploy OBI by hand

Plain manifests are in
[`deploy/kubernetes/obi`](https://github.com/obzly/obzly/blob/main/deploy/kubernetes/obi/README.md):

1. In `daemonset.yaml`, set `OTEL_EXPORTER_OTLP_ENDPOINT` to your Obzly URL, and optionally
   `OTEL_EBPF_KUBE_CLUSTER_NAME`.
2. Put an Obzly API key in `secret.yaml`.
3. Apply everything. The Secret needs the namespace to exist first:

   ```bash
   kubectl apply -k .
   kubectl apply -f secret.yaml
   kubectl apply -k .
   ```

To enable traces by hand, apply `traces-config.yaml` and edit its `discovery.instrument` list of
namespaces (`k8s_namespace: "*"` means everything except OBI's built-in system exclusions). Then
add to the DaemonSet `OTEL_EBPF_METRICS_FEATURES=application,network,network_flow_packets`,
`OTEL_EBPF_CONFIG_PATH=/config/obi-config.yml`, a mount of the `obi-config` ConfigMap at
`/config`, and one of the permission levels above.

The optional metadata cache is in `k8s-cache.yaml`, which is not part of `kustomization.yaml`.
Apply it and set `OTEL_EBPF_KUBE_META_CACHE_ADDRESS=obi-k8s-cache.obzly-obi.svc:50055` on the
DaemonSet.

:::note[Multi-site]
If you generate either bundle from a control plane, set the endpoint to the Site's public URL.
The control plane does not accept telemetry. See [Multi-site](/docs/deploy/multi-site/).
:::

## Next steps

- [Data sources](/docs/reference/data-sources/) lists the other generated configs.
- [Alerts & notifications](/docs/how-to/alerts/) covers alerting on error logs or pod metrics.
- [Grafana via the PromQL API](/docs/how-to/grafana-promql/) lets existing Grafana dashboards
  query these metrics.
