---
title: Monitoring Obzly
description: Scrape Obzly's own Prometheus metrics, load its alert rules and Grafana dashboard, and read its self-traces.
---

<!-- Source: obzly-dev/deploy/observability/README.md, obzly-dev/README.md, obzly-dev/docs/runbooks/upgrade.md, obzly-dev/ARCHITECTURE.md, obzly-dev/frontend/src/features/settings/ui/UpdatesComponent.tsx, obzly-dev/frontend/src/features/settings/ui/SettingsOverviewComponent.tsx -->

Every Obzly role serves Prometheus metrics on an internal port, the
[`deploy/observability`](https://github.com/obzly/obzly/tree/main/deploy/observability) directory
has SLO alert rules and a ready Grafana dashboard, and each Site samples its own requests and
background work as traces in a system project.

## Metrics endpoint

Every process (`all`, `api`, `worker`, `control-plane`, `broker`, `querier`) serves `/metrics` on a
listener separate from the UI and API port:

| Setting | Default | Notes |
| --- | --- | --- |
| `METRICS_ADDR` | `:9464` (`127.0.0.1:9464` when `ENV_MODE=development`) | `host:port`, or `off` to disable. Must differ from `HTTP_PORT` and `OTLP_GRPC_PORT`. |

:::caution
Keep the metrics port private: don't publish it on a public load balancer. The control plane never
proxies it.
:::

The [Kubernetes manifests](/docs/deploy/kubernetes-eks/) expose it as a `metrics` container port
with `prometheus.io/scrape|port|path` pod annotations and no Service. The
[Helm chart](/docs/deploy/helm/) can create a Prometheus Operator PodMonitor for every tier
(`metrics.serviceMonitor`). With Docker Compose, scrape each service's `:9464/metrics`.

## Self-tracing

Each Site records a sample of its own HTTP requests, OTLP gRPC calls and background passes as
traces in a reserved project, **Obzly (system)**. The project is created automatically and visible
only to global admins. Open it in the Traces view to see which routes or background passes are
slow.

- `SELF_TRACING_SAMPLE_RATE` sets the sampled fraction: default `0.01`, `0` turns it off.
- Spans carry the route template and status only, never query strings or headers.
- They are kept for 7 days.
- The control plane does not trace itself.

## Alert rules

[`prometheus/obzly-rules.yaml`](https://github.com/obzly/obzly/blob/main/deploy/observability/prometheus/obzly-rules.yaml)
holds recording rules and alerts for these SLOs:

- ingest acknowledgement p99 under 500 ms;
- ingest to queryable p95 under 2 minutes;
- query p95 under 5 s;
- compaction and upload backlog.

It also alerts on failed segment flushes (those rows are lost), object storage errors, a filling or
lagging ingest buffer, failing query fragments or executors, a saturated Postgres pool, alert
notifications given up after every retry, and integrity audits that failed or stopped running.

Load it with Prometheus `rule_files:`, or wrap the `groups:` list in a `PrometheusRule` for the
Prometheus Operator.

## Grafana dashboard

[`grafana/obzly-overview.json`](https://github.com/obzly/obzly/blob/main/deploy/observability/grafana/obzly-overview.json)
is a starting dashboard covering:

- **Ingest**: accepted rows, ack p99, status codes, JetStream buffer batches and fill.
- **Segment writer**: rows in memory, ingest to queryable, rows lost to failed flushes.
- **Object storage and catalog**: request rate and latency, upload lag, compaction backlog.
- **Queries**: p95, segment reads by source, cold cache hit ratio, bytes scanned.
- **Distributed query**: fragments by location and result, fragment duration, executors seen and
  retries, planned bytes per query, queries refused by the scan budget, executor load.
- **Background tasks**: time since last success, pass duration.
- **Runtime**: DuckDB memory, Go heap, Postgres pool, CPU.
- **Alerting, access and integrity**: notifications by result, rule-to-notification p95,
  authorization decisions, the last integrity audit.

Import it in Grafana and pick your Prometheus data source. The SLO panels use the recording rules
above, so load those first.

:::note
`obzly_catalog_*`, `obzly_jetstream_*` and `obzly_integrity_audit_*` are cluster-wide values that
every replica reports, so aggregate them with `max()`, not `sum()`.
:::

## Upgrade status

**Obzly settings → Updates** lists each deployment (on a control plane, the control plane and
every Site) with its version and whether it is **Ready for the next version**. Expand a row for
the full upgrade status: schema state, segments waiting to be rewritten or uploaded, ingest buffer
lag, broker replicas and the last integrity audit. Check it before each deploy; see
[Upgrade](/docs/operations/upgrade/).

**Obzly settings → Overview** shows each deployment's health, CPU, memory and disk, and the data
ingested and stored, per Site on a control plane.
