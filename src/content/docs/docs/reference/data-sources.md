---
title: Data sources
description: The built-in Data Sources catalog, what each entry generates, and how to send OTLP from anything else.
---
<!-- Source: obzly-dev/frontend/src/features/projects/ui/dataSources/catalog.ts, obzly-dev/frontend/src/features/projects/ui/dataSources/types.ts, obzly-dev/frontend/src/features/projects/ui/dataSources/DataSourceConfigModal.tsx, obzly-dev/frontend/src/features/projects/ui/dataSources/otelCollectorCommon.ts, obzly-dev/frontend/src/features/projects/ui/dataSources/customOtlpDataSource.ts, obzly-dev/README.md -->

Obzly speaks OTLP over gRPC and HTTP, so anything that exports OpenTelemetry can send it logs,
traces and metrics without a proprietary client library. For common infrastructure you don't
instrument yourself, each project's **Data Sources** page has a catalog of 39 sources. Pick one
and Obzly generates a ready-to-run config, with an API key already filled in.

## How a generated config works

1. Open a project and go to **Data Sources**, then pick a source.
2. Choose the API key:
   - Leave **API key** empty to create a new, dedicated key (named `<source> OTel Collector` by
     default). Its value is embedded in the config and shown **once**.
   - Or select an existing key and paste its value. Key values are stored hashed and can't be
     shown again, so you need the value you saved when you created it. Obzly checks the pasted
     value against the selected key before using it.
3. Check **Obzly endpoint**. It defaults to the URL you are using right now and must be
   reachable from wherever the collector runs.
4. Fill in any source-specific fields (host, port, namespace and so on) and generate the config.
   Copy each file and follow the instructions shown under it.

:::caution[The config contains a secret]
The generated file embeds a live API key. Treat it as a secret. If you lose a newly created key,
delete it on the project's **API Keys** page and generate a new config.
:::

:::note[Multi-site]
On a control plane, set **Obzly endpoint** to the Site's public URL. The control plane does not
accept telemetry. See [Multi-site](/docs/deploy/multi-site/).
:::

Collector-based configs share a few conventions:

- **OTLP/HTTP export.** The exporter uses the same host and port you use to reach the UI, so any
  TLS or reverse proxy in front of Obzly already works. The API key is sent in the `X-API-Key`
  header, read from the `OBZLY_API_KEY` environment variable.
- **Batch size cap.** A `batch` processor caps each export at 2,500 records. Obzly rejects a
  single request above its own batch limit as a whole, so keep this cap if you edit the config.
- **Resource detection.** A `resource_detection` processor fills in cloud and host attributes
  (`cloud.provider`, `cloud.region`, `host.name`, `os.type` and so on) from wherever the
  collector runs. Values you set in `OTEL_RESOURCE_ATTRIBUTES` win over detected ones.
- **Pinned image.** Collector configs use `otel/opentelemetry-collector-contrib:0.161.0`, a
  version known to work when the config was generated. Check for newer collector releases before
  deploying to production.

Attribute names are normalized on arrival (`k8s.pod.name` is stored as `k8s_pod_name`). See
[Grafana via the PromQL API](/docs/how-to/grafana-promql/#attribute-names).

## Catalog

### Infrastructure

| Source | What it collects |
| --- | --- |
| Kubernetes | DaemonSet collector: container logs, node metrics, and OTLP from your apps. See [Kubernetes logs & metrics](/docs/how-to/kubernetes-otel-collector/) |
| eBPF Network Map (OBI) | OpenTelemetry eBPF agent: service-to-service network edges for the Service Map, and optional zero-code traces |
| Docker / Docker Compose | Container logs from the Docker daemon's own JSON log files, via a sidecar collector |
| Linux Server | systemd journal logs, host metrics (CPU, memory, disk) and OTLP, as a systemd service |
| Windows Server | Windows Event Log (Application, System, Security) plus host metrics |
| Syslog | RFC3164/RFC5424 syslog over UDP or TCP, for firewalls, network gear and appliances |
| SNMP (network devices) | Interface and system metrics from routers, switches and other SNMP-capable devices |
| ZooKeeper | Ensemble metrics (watches, znodes, latency) via the four-letter-word admin protocol |
| VMware vCenter | Host, VM and datastore metrics (CPU, memory, disk, network) via the vSphere API |
| Consul | Agent and cluster metrics (raft, catalog, health checks) via its Prometheus endpoint |
| etcd | Cluster metrics (leader changes, proposal latency, DB size) via its Prometheus endpoint |

### Web servers

| Source | What it collects |
| --- | --- |
| Nginx | Access and error logs plus request metrics, via `stub_status` |
| Apache HTTP Server | Access and error logs plus worker and request metrics, via `mod_status` |
| HAProxy | Frontend and backend metrics (sessions, queue, errors) via the stats page |
| Traefik | JSON access logs plus request and router metrics via its Prometheus endpoint |
| Envoy Proxy | JSON access logs plus listener and cluster metrics via the admin stats endpoint |
| IIS | Request and connection metrics plus W3C access logs, for Windows-hosted IIS sites |

### Databases

| Source | What it collects |
| --- | --- |
| PostgreSQL | Connections, commits, locks and replication metrics, plus the Postgres log file |
| MySQL | Threads, buffer pool and replication metrics, plus the MySQL error log |
| MongoDB | Operations, connections and cache metrics, plus the `mongod` log file |
| Redis | Memory, connected clients, ops/sec and keyspace hits via `INFO` |
| Valkey | Memory, connected clients, ops/sec and keyspace hits via `INFO` |
| Elasticsearch | Cluster, node and index metrics (health, JVM heap, indexing rate) via the cluster API |
| Cassandra | Read/write latency, compaction and storage metrics via JMX |
| CouchDB | Request rate, active tasks and replication metrics via the `_stats` API |
| Memcached | Connections, hit rate, evictions and bytes via the stats protocol |
| Microsoft SQL Server | Batch requests, page life expectancy and locks via a Windows perf counter or a direct connection |
| Riak | Node and vnode metrics (latency, gets/puts, ring status) via the HTTP stats endpoint |

### Message queues

| Source | What it collects |
| --- | --- |
| RabbitMQ | Queue and node metrics (message rates, consumers, memory) via the management API |
| Apache Kafka | Broker, topic and consumer-group metrics (partitions, lag, throughput) |

### Application runtimes

| Source | What it collects |
| --- | --- |
| JVM (Java application) | Heap, GC and thread metrics from any JVM app via JMX, with no code changes |
| Apache Flink | Job, task and checkpoint metrics via the JobManager REST API |
| Apache Spark | Application, executor and stage metrics via the Spark REST API |

### AI tools

| Source | What it collects |
| --- | --- |
| Claude Code | Claude Code's built-in telemetry: cost, tokens, sessions and tool usage per user and model. See [Claude & Cursor over MCP](/docs/how-to/mcp/#ai-observability-for-claude-code) |

### Custom

| Source | What it collects |
| --- | --- |
| Custom (OTLP) | Any other OTLP-speaking source, pointed directly at Obzly with no collector. See [below](#custom-otlp) |
| Prometheus-format metrics | Scrapes any existing `/metrics` endpoint (app, exporter, sidecar) that already speaks Prometheus |
| StatsD | Accepts metrics from anything that emits the StatsD wire protocol (counters, gauges, timers) |
| HTTP Uptime Check | Black-box monitoring: status code and response time for any URL, no agent on the target |
| Fluent Bit | For an existing Fluent Bit: points its built-in OpenTelemetry output plugin at Obzly |

## Custom OTLP

Most language SDKs and many agents (Vector, Fluent Bit's OTLP output, Grafana Alloy and others)
export OTLP themselves and need no collector. Obzly accepts OTLP/HTTP, protobuf or JSON, at:

| Signal | Endpoint |
| --- | --- |
| Logs | `POST https://obzly.example.com/v1/logs` |
| Traces | `POST https://obzly.example.com/v1/traces` |
| Metrics | `POST https://obzly.example.com/v1/metrics` |

Every request needs the `X-API-Key` header. The API key also identifies the project, so the
URL has no project ID. OTLP/gRPC is served on port `4317` (`OTLP_GRPC_PORT`) when that port is
exposed.

For anything that follows the standard OpenTelemetry SDK environment variables:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="https://obzly.example.com"
export OTEL_EXPORTER_OTLP_HEADERS="X-API-Key=YOUR_API_KEY"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
```

Or test with a single log over curl:

```bash
curl -X POST "https://obzly.example.com/v1/logs" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "resourceLogs": [{
      "resource": { "attributes": [{ "key": "service.name", "value": { "stringValue": "my-app" } }] },
      "scopeLogs": [{
        "logRecords": [{
          "timeUnixNano": "'"$(date +%s%N)"'",
          "severityText": "INFO",
          "body": { "stringValue": "Hello from curl" }
        }]
      }]
    }]
  }'
```

For a quick one-off without OTLP, Obzly also has a plain JSON endpoint. See
[Send your first logs](/docs/getting-started/send-first-logs/).

Prometheus servers and agents can also push with `remote_write`. See
[Grafana via the PromQL API](/docs/how-to/grafana-promql/#ingest-with-prometheus-remote-write).
