---
title: Send your first logs
description: Send logs to Obzly over plain HTTP, OTLP, or Prometheus remote-write.
---

<!-- Source: obzly-dev/README.md, obzly-dev/docs/configuration.md, obzly-dev/backend/internal/features/logs/receiving/controller.go, obzly-dev/backend/internal/features/prometheus/remotewrite/http_controller.go -->

You need a [project ID and an API key](/docs/getting-started/first-project/). The examples use
`localhost:4005`; replace it with your Obzly host.

## Plain HTTP

For a quick one-off from your own app, post JSON to the project's receiving endpoint:

```bash
curl -X POST "http://localhost:4005/api/v1/logs/receiving/YOUR_PROJECT_ID" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"logs": [{"level": "INFO", "message": "User logged in", "fields": {"user_id": "12345"}}]}'
```

- `level` is one of `DEBUG`, `INFO`, `WARN` or `ERROR`, and `message` must not be empty.
- `fields` holds any attributes you want to filter on.
- The server sets the timestamp.
- A batch holds up to 5,000 logs and 10 MB.

A successful request returns `202 Accepted`. The project's settings decide whether the API key is
required and which domains or IPs may send; a `429` means you hit the project's rate limit or the
ingest buffer is full, so retry later.

## OpenTelemetry (OTLP)

Obzly speaks OTLP, so the standard OpenTelemetry SDK for your language, or an OTel Collector, can
send logs, traces and metrics with no Obzly-specific library. Authenticate with the API key in the
`X-API-Key` header (gRPC metadata `x-api-key`); the key identifies the project.

| Protocol | Endpoint |
| --- | --- |
| OTLP/HTTP | `http://localhost:4005/v1/logs`, `/v1/traces`, `/v1/metrics` (same port as the UI, `HTTP_PORT`) |
| OTLP/gRPC | `localhost:4317` (`OTLP_GRPC_PORT`) |

For example, an OTel Collector exporter:

```yaml
exporters:
  otlphttp:
    endpoint: http://localhost:4005
    headers:
      X-API-Key: YOUR_API_KEY
```

The **Data Sources** page generates a ready-to-run Collector config, with a dedicated API key
included, for 35+ common sources such as Nginx, Postgres, Kafka, Kubernetes and Redis. See
[Data sources](/docs/reference/data-sources/) and
[Kubernetes with an OTel Collector](/docs/how-to/kubernetes-otel-collector/).

## Prometheus remote-write

Metrics can also arrive by Prometheus remote-write (protocol 1.0) at `POST /api/v1/write`, with the
API key in `X-API-Key` or as an `Authorization: Bearer` token. To query metrics with PromQL from
Grafana, see [Grafana and PromQL](/docs/how-to/grafana-promql/).

## Attribute names

Obzly stores every attribute, label and metric name in one PromQL-safe form: no dots and no
`resource.` prefix. For example:

| Sent as | Stored as |
| --- | --- |
| `resource.k8s.pod.name` | `k8s_pod_name` |
| `system.cpu.time` | `system_cpu_time` |

So PromQL needs no quoting:

```text
sum by (k8s_pod_name) (system_cpu_time)
```

Log levels are stored lowercase (`error`, `warn`, ...). The original dotted names still work in
searches, PromQL and imported dashboards.

## Next steps

- Search your logs in the UI, or over HTTP with the [log query API](/docs/reference/log-query-api/).
- Set up [alerts](/docs/how-to/alerts/).
- Let an AI assistant query your data through [MCP](/docs/how-to/mcp/).
