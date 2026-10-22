---
title: Grafana via the PromQL API
description: Point a Grafana Prometheus datasource at Obzly, push metrics with Prometheus remote-write, and understand rollups and attribute names.
---
<!-- Source: obzly-dev/README.md, obzly-dev/ARCHITECTURE.md, obzly-dev/backend/internal/features/metrics/promapi/controller.go, obzly-dev/backend/internal/features/metrics/promapi/service.go, obzly-dev/backend/internal/features/prometheus/remotewrite/http_controller.go, obzly-dev/backend/internal/features/traces/jaeger/controller.go, obzly-dev/backend/internal/features/dashboards/services/import_grafana.go -->

Obzly stores metrics from OTLP and from Prometheus remote-write, and serves them through a
Prometheus-compatible HTTP query API. An existing Grafana Prometheus datasource, and most
dashboards built on one, work against Obzly by changing the datasource URL and adding an API key.

## The PromQL API

Each project has its own Prometheus API root:

```text
https://obzly.example.com/api/v1/metrics/YOUR_PROJECT_ID
```

Under it, Obzly serves the standard Prometheus HTTP API paths:

| Path | Methods |
| --- | --- |
| `/api/v1/query` | `GET`, `POST` |
| `/api/v1/query_range` | `GET`, `POST` |
| `/api/v1/series` | `GET`, `POST` |
| `/api/v1/labels` | `GET`, `POST` |
| `/api/v1/label/<name>/values` | `GET` |
| `/api/v1/status/buildinfo` | `GET` (a fixed stub some clients probe when a datasource is saved) |

Authenticate with an API key **of that project**, either in the `X-API-Key` header or, for
clients that can only add query parameters, as `?api_key=`. Your user session does not work
here. Create keys on the project's **API Keys** page.

Try it with curl:

```bash
curl -s -H "X-API-Key: YOUR_API_KEY" \
  "https://obzly.example.com/api/v1/metrics/YOUR_PROJECT_ID/api/v1/query" \
  --data-urlencode 'query=sum by (k8s_pod_name) (rate(system_cpu_time[5m]))'
```

Responses follow the documented Prometheus JSON shape (`status`, `data.resultType`,
`data.result`, and `warnings` when there are any). Timestamps may be Unix seconds or RFC 3339.

## Add Obzly as a Grafana datasource

1. In Grafana, add a new **Prometheus** datasource.
2. Set the Prometheus server URL to the project root, **without** a trailing `/api/v1`:

   ```text
   https://obzly.example.com/api/v1/metrics/YOUR_PROJECT_ID
   ```

3. Under custom HTTP headers, add header `X-API-Key` with your project API key as the value.
4. Save and test. Grafana's Explore view and Prometheus-based panels now query Obzly.

Use one datasource per project. A key from another project is rejected.

:::tip
Metric and label names in Obzly have no dots (see [Attribute names](#attribute-names)). Queries
that use dotted OpenTelemetry names are rewritten to the stored form, so they work too.
:::

### Traces in Grafana

Obzly also serves a Jaeger-compatible query API per project, which a Grafana **Jaeger**
datasource can use. Set its URL to:

```text
https://obzly.example.com/api/v1/jaeger/YOUR_PROJECT_ID
```

It takes the same `X-API-Key` header or `?api_key=` parameter. Search filters by service,
operation, duration and errors. Jaeger's `tags` filter is ignored.

## Ingest with Prometheus remote-write

Obzly accepts Prometheus remote-write at the same path Prometheus's own receiver uses:

```text
POST https://obzly.example.com/api/v1/write
```

The API key identifies the project, so the URL carries no project ID. Send the key as a Bearer
token, which Prometheus's `authorization` block does by default, or in an `X-API-Key` header:

```yaml
# prometheus.yml
remote_write:
  - url: https://obzly.example.com/api/v1/write
    authorization:
      credentials: YOUR_API_KEY
```

Things to know:

- **Remote Write 1.0 only.** Obzly takes the snappy-compressed protobuf format that Prometheus,
  Grafana Agent and the OTel Collector's remote-write exporter send by default. A request marked
  as Remote Write 2.0 is rejected with HTTP 415 and a clear message.
- **No basic auth.** Use a Bearer token or the `X-API-Key` header.
- **Retries.** When the ingest buffer is full or unavailable, Obzly answers 503, which Prometheus
  always retries.
- **Metric types** come from the request's metadata when present. Otherwise names ending in
  `_total`, `_count`, `_sum` or `_bucket` are treated as counters and everything else as gauges.

OTLP metrics go to `/v1/metrics` instead. See [Data sources](/docs/reference/data-sources/#custom-otlp).

## Rollups

Obzly keeps two downsampled copies of older metrics, at **5-minute** and **1-hour**
resolution, so long ranges stay fast. Each bucket keeps the first, last, minimum and maximum
samples with their timestamps, plus a count and sum.

A query reads rollups automatically when its step is at least one bucket wide and any range
selector (such as `[1h]`) spans at least five buckets. Recent data that hasn't been rolled up yet
is read from raw samples in the same query.

- Line charts look the same, and `max_over_time`, `min_over_time` and `last_over_time` are exact.
- `rate` and `increase` can miss a counter reset inside a bucket and are approximate where a
  series starts or stops inside the window.
- `count_over_time`, `sum_over_time` and `avg_over_time` see a few points per bucket rather than
  every sample, so they are approximate at coarse steps.

Rollups can outlive raw samples. In **Project settings → Retention & sampling**, set **Metric
rollup retention (days)** to keep the 5-minute and 1-hour rollups that long after raw samples are
deleted (`0` deletes them together). Charts of that older data show fewer points.

## Attribute names

Obzly stores every attribute, label and metric name in one PromQL-safe form:

- A leading `resource.` is dropped.
- Every character outside `[a-zA-Z0-9_]` becomes `_`.
- A leading digit gets a `_` prefix.

| Sent as | Stored as |
| --- | --- |
| `resource.k8s.pod.name` | `k8s_pod_name` |
| `system.cpu.time` | `system_cpu_time` |
| `app.kubernetes.io/name` | `app_kubernetes_io_name` |

So PromQL never needs quoting:

```text
sum by (k8s_pod_name) (system_cpu_time)
```

When two source attributes map to the same name, the most specific one wins (record, then scope,
then resource). Log levels are stored lowercase (`error`, `warn`, ...) and matched
case-insensitively.

Old dotted names still work in log searches, PromQL and imported dashboards, because Obzly
rewrites them on the way in. After an upgrade, data stored with the old names is converted in the
background. Admins can follow progress at `GET /api/v1/system/data-migration`.

## Import Grafana and OpenObserve dashboards

On the **Dashboards** page, the **Import** button accepts Grafana dashboard JSON (a UI "Export as
JSON" or the API/provisioning format) and OpenObserve dashboard JSON.

:::note[Layout only]
Import brings over the dashboard title, panel titles, chart types and grid layout. Queries are
not translated, so each panel's query starts empty. Edit each panel and add a query, for metrics
panels a PromQL expression. Row panels are skipped.
:::

To keep using a Grafana dashboard with its queries intact, point Grafana itself at Obzly as
described [above](#add-obzly-as-a-grafana-datasource) instead of importing it.

## Related

- [Kubernetes logs & metrics](/docs/how-to/kubernetes-otel-collector/) sends node and pod
  metrics.
- [Alerts & notifications](/docs/how-to/alerts/) evaluates PromQL rules.
- [Monitoring Obzly](/docs/operations/monitoring/) covers Obzly's own metrics and Grafana
  dashboard.
