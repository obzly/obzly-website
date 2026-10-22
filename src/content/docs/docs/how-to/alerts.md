---
title: Alerts & notifications
description: Create alert rules over metrics, logs, log patterns and traces, and deliver notifications to webhooks, Slack, PagerDuty or email.
---
<!-- Source: obzly-dev/README.md, obzly-dev/ARCHITECTURE.md, obzly-dev/docs/configuration.md, obzly-dev/backend/internal/features/alerting/models.go, obzly-dev/backend/internal/features/alerting/service.go, obzly-dev/backend/internal/features/alerting/channels.go, obzly-dev/backend/internal/features/alerting/controller.go, obzly-dev/frontend/src/features/alerts/ui/RuleEditorDrawerComponent.tsx -->

Obzly evaluates alert rules over a project's metrics, logs and traces, and sends notifications
through webhooks, Slack, PagerDuty or email. Rules follow the familiar Prometheus lifecycle:
**pending** while the condition holds, **firing** after the `for` duration, **resolved** when it
stops. Once a rule fires, its notification typically arrives in about 15 seconds.

Everything lives on the project's **Alerts** page, which has four tabs: **Active**, **Rules**,
**Channels** and **Silences**.

## Who can do what

| Action | Who |
| --- | --- |
| View rules, active alerts, channels and silences | Any project member |
| Create, edit and delete rules | Project owners and admins |
| Create and edit silences | Members who can write (not viewers) |
| Create, edit, test and delete notification channels | The project owner or a global admin (channels hold credentials) |

## 1. Add a notification channel

On the **Channels** tab, add a channel of one of these kinds:

| Kind | Settings | Delivery |
| --- | --- | --- |
| Slack | An incoming webhook URL | A plain-text message |
| Webhook | An `http(s)` URL and optional headers, for example `Authorization` | A JSON `POST` (see [Webhook payload](#webhook-payload)) |
| PagerDuty | An Events API v2 routing key | A trigger event, resolved automatically on recovery |
| Email | 1 to 20 recipients | A plain-text email through your SMTP relay |

Channel settings (URLs, headers, keys, recipients) are stored encrypted and never shown in full
again. The list shows only a non-secret target, such as the URL's host or the last characters of
a routing key. Use **Test** to send a test notification. It reports the receiver's HTTP status.

:::note[Email needs an SMTP relay]
Email channels work only when the operator has configured a relay with `ALERT_SMTP_HOST`
(and usually `ALERT_SMTP_PORT`, `ALERT_SMTP_USERNAME`, `ALERT_SMTP_PASSWORD`, `ALERT_SMTP_FROM`).
Mail is sent with STARTTLS or TLS 1.2+ (`ALERT_SMTP_TLS`), never in plaintext. See
[Configuration](/docs/reference/configuration/#alerting).
:::

## 2. Create a rule

On the **Rules** tab, create a rule and pick its **Data**:

| Data | What it measures |
| --- | --- |
| Metrics (PromQL) | An instant PromQL query. Every series it returns is checked, for example `sum by (service_name) (rate(http_errors_total[5m]))` |
| Logs (count) | The number of logs matching a query in the window. Leave the query empty to count every log. Optionally one alert per value of a field, such as `service_name` |
| Log patterns (new or spiking) | One alert per message pattern among matching logs (usually errors) that is new against a baseline, or whose rate rose to at least the threshold times the baseline's. A threshold of 3 fires when a pattern triples |
| Traces | `count`, `error_count`, `avg_duration_ms`, `p50_duration_ms`, `p95_duration_ms` or `p99_duration_ms` of a service's or operation's spans in the window, optionally per `service_name`, `name`, `status_code` or `kind` |

For log pattern rules, the baseline is the time just before the window: an hour, 6 hours, a day
(the default) or a week. **At least (logs)** ignores patterns with fewer logs in the window. A
pattern not seen in the baseline gets a very large value, so it always passes the threshold.

Then set the condition and timing:

| Field | Default | Range | Meaning |
| --- | --- | --- | --- |
| Fire when value | | `>`, `>=`, `<`, `<=`, `==`, `!=` | Comparison against the threshold |
| Threshold | | | The value to compare with |
| Over the last (s) | `300` | 60 s to 1 day | The window logs, log patterns and traces are counted over |
| Check every (s) | `60` | 15 s to 1 day | How often the rule is evaluated |
| For (s) | `0` | 0 to 1 day | How long the condition must hold before the alert fires |
| Remind every (s) | `14400` (4 hours) | 0 to 7 days | Notify again while still firing. `0` notifies once |
| Notify | | up to 20 channels | Channels from this project |
| Summary | | up to 2,000 characters | Included in every notification |
| Labels | | up to 20 | Added to every alert, for example `severity=page`, `team=core`. Names must match `[a-zA-Z_][a-zA-Z0-9_]*`, and `alertname` is reserved |

Use **Preview** to run the query once and see the series it would produce, without saving or
changing anything.

Each alert is labelled with the rule's labels, the series' own labels and `alertname`. If a
rule's query fails, the error is shown on the rule and no alert state changes.

:::tip[Attribute names]
PromQL and log fields use Obzly's normalized names, such as `k8s_pod_name` rather than
`k8s.pod.name`. See [Attribute names](/docs/how-to/grafana-promql/#attribute-names).
:::

## 3. Silence alerts

On the **Silences** tab, mute notifications for alerts whose labels match every matcher in a
silence, for a chosen period (1 hour, 4 hours, 1 day, 1 week). A matcher compares one label to a
value, either exactly or as a regular expression anchored at both ends. Add a comment saying why.

Silences apply when a notification is sent. Alerts still change state while silenced and show on
the **Active** tab.

## Delivery and retries

Notifications go through a delivery queue (an outbox) stored in Postgres, so they survive
restarts:

- A failed send is retried with backoff: 10 seconds, doubling up to 15 minutes between tries.
- After 8 failed attempts (about 40 minutes) the notification is given up.
- Each HTTP send times out after 10 seconds and must get a `2xx` answer. Redirects are not
  followed.

### Outgoing address restrictions

By default, webhook and Slack channels can only reach **public** addresses. Private, loopback,
link-local, CGNAT and reserved ranges are refused, including IPv4 addresses embedded in IPv6
forms. Every resolved address is checked, and no environment proxy is used.

To deliver to a receiver inside your network, allow its range. To block a range that would
otherwise be public, deny it:

```bash
# Let webhooks reach an in-cluster receiver
ALERT_EGRESS_ALLOWLIST=10.20.0.0/16
# Never reach the cluster's service range
ALERT_EGRESS_DENYLIST=172.20.0.0/16
```

`ALERT_EGRESS_DENYLIST` always wins. Both take comma-separated CIDRs.

## Webhook payload

Webhook channels receive a JSON `POST` with `Content-Type: application/json` and
`User-Agent: Obzly-Alerting/1`, plus any headers you configured:

```json
{
  "version": "obzly.alert/1",
  "status": "firing",
  "projectId": "YOUR_PROJECT_ID",
  "ruleId": "6f1c2d3e-0000-4000-8000-000000000000",
  "ruleName": "API error rate",
  "source": "metrics",
  "summary": "Error rate above 5% for the api service",
  "labels": { "alertname": "API error rate", "service_name": "api", "severity": "page" },
  "value": 0.083,
  "comparison": ">",
  "threshold": 0.05,
  "fingerprint": "a1b2c3d4",
  "startsAt": "2026-10-01T12:00:00Z",
  "endsAt": null
}
```

`status` is `firing`, `resolved` or `test`. `endsAt` is set on resolved notifications.

PagerDuty events use `<ruleId>:<fingerprint>` as the `dedup_key`, so a resolved notification closes the
incident its firing notification opened.

## Scaling evaluation

Rule evaluation runs on `worker` replicas (or the single container in `all` mode). On large
installs, split it across workers with `ALERT_EVAL_SHARDS`. Each shard runs under its own leader
lock, so every rule is evaluated by exactly one worker.

## API

The UI uses these routes, all under `/api/v1` with a user session token. See
[Log query API](/docs/reference/log-query-api/#authentication) for how to get one.

| Method and path | Purpose |
| --- | --- |
| `GET`, `POST /projects/{id}/alert-rules` | List or create rules |
| `PUT`, `DELETE /projects/{id}/alert-rules/{ruleId}` | Replace or delete a rule |
| `POST /projects/{id}/alert-rules/preview` | Run a rule's query once without saving |
| `GET /projects/{id}/alerts` | Pending, firing and recently resolved alerts |
| `GET`, `POST /projects/{id}/notification-channels` | List or create channels |
| `PUT`, `DELETE /projects/{id}/notification-channels/{channelId}` | Update or delete a channel |
| `POST /projects/{id}/notification-channels/{channelId}/test` | Send a test notification |
| `GET`, `POST /projects/{id}/silences` | List or create silences |
| `DELETE /projects/{id}/silences/{silenceId}` | Delete a silence |

A metrics rule as JSON:

```json
{
  "name": "API error rate",
  "source": "metrics",
  "query": { "promql": "sum by (service_name) (rate(http_errors_total[5m]))" },
  "comparison": ">",
  "threshold": 0.05,
  "intervalSeconds": 60,
  "forSeconds": 300,
  "repeatSeconds": 14400,
  "labels": { "severity": "page" },
  "summary": "Error rate above threshold",
  "channelIds": ["YOUR_CHANNEL_ID"]
}
```

Log rules put a [query tree](/docs/reference/log-query-api/#query-structure) in `query.logs` and
an optional field in `query.groupBy`. Trace rules use `query.metric`, `query.serviceName`,
`query.operationName` and `query.groupBy`.
