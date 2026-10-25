---
title: Alerts & notifications
description: Create alert rules over metrics, logs, log patterns and traces, and deliver notifications to webhooks, Slack, PagerDuty or email.
---
<!-- Source: obzly-dev/README.md, obzly-dev/ARCHITECTURE.md, obzly-dev/docs/configuration.md, obzly-dev/backend/internal/features/alerting/models.go, obzly-dev/backend/internal/features/alerting/service.go, obzly-dev/backend/internal/features/alerting/channels.go, obzly-dev/backend/internal/features/alerting/controller.go, obzly-dev/backend/internal/features/alerting/settings_controller.go, obzly-dev/backend/internal/features/alerting/settings_channels.go, obzly-dev/backend/internal/features/alerting/managed_rules.go, obzly-dev/backend/internal/features/sharedconfig/controller.go, obzly-dev/backend/internal/features/sharedconfig/loader.go, obzly-dev/docs/runbooks/upgrade.md, obzly-dev/frontend/src/features/alerts/ui/RuleEditorDrawerComponent.tsx, obzly-dev/frontend/src/features/alerts/ui/RulesComponent.tsx, obzly-dev/frontend/src/features/alerts/ui/ChannelsComponent.tsx, obzly-dev/frontend/src/features/alerts/ui/NotificationSettingsComponent.tsx -->

Obzly evaluates alert rules over a project's metrics, logs and traces, and sends notifications
through webhooks, Slack, PagerDuty or email. Rules follow the familiar Prometheus lifecycle:
**pending** while the condition holds, **firing** after the `for` duration, **resolved** when it
stops. Once a rule fires, its notification typically arrives in about 15 seconds.

Rules live on the project's **Alerts** page, which has four tabs: **Active**, **Rules**,
**Channels** and **Silences**. Notification channels and the email relay are defined once, by an
admin, in **Obzly settings → Notifications & alerting**, and shared across projects.

## Who can do what

| Action | Who |
| --- | --- |
| View rules, active alerts, silences and the channels a project can use | Any project member |
| Create, edit and delete rules | Project owners and admins |
| Create and edit silences | Members who can write (not viewers) |
| Send a test notification from the project's **Channels** tab | The project owner or a global admin |
| Create, edit, test and delete notification channels, and set up email | Global admins, in Obzly settings (channels hold credentials) |

## 1. Set up email

Skip this if you won't use email channels. In **Obzly settings → Notifications & alerting**,
under **Email**, enter your SMTP relay:

| Field | Notes |
| --- | --- |
| SMTP host and Port | For example `smtp.harborline.example` and `587` |
| TLS | **STARTTLS** or **Implicit TLS**. Plaintext is never used |
| Username and Password | The password is stored encrypted and never shown again. Leave it empty when editing to keep the stored one |
| From address | For example `alerts@harborline.example` |

Use **Send test email** to check it (it goes to you unless you enter another address). Obzly sends
alert emails and [user invites](/docs/getting-started/first-project/#teams-and-organizations)
through this relay. **Remove** stops both.

## 2. Add a notification channel

In **Obzly settings → Notifications & alerting**, under **Notification channels**, click **New
channel** and pick a kind:

| Kind | Settings | Delivery |
| --- | --- | --- |
| Slack | An incoming webhook URL | A plain-text message |
| Webhook | An `http(s)` URL and optional headers, for example `Authorization` | A JSON `POST` (see [Webhook payload](#webhook-payload)) |
| PagerDuty | An Events API v2 routing key | A trigger event, resolved automatically on recovery |
| Email | 1 to 20 recipients, for example `ops@harborline.example` | A plain-text email through the relay above |

Then choose where it is **Available to**: every project, or some projects. On a control plane the
choices are every project on every Site, every project on some Sites, or some projects.

Channel settings (URLs, headers, keys, recipients) are stored encrypted and never shown in full
again. The list shows only a non-secret target, such as the URL's host or the last characters of
a routing key, and where each channel is available. **Send test** sends a test notification and
reports the receiver's HTTP status. Deleting a channel means rules stop notifying it.

Each project's **Channels** tab lists the channels its rules can use, read-only, with a **Test**
button.

### Multi-site

With a [control plane](/docs/deploy/multi-site/), channels and the email relay are managed
centrally, on the control plane:

- Each Site fetches them every 5 minutes and keeps the last copy, so alerts still go out while the
  control plane is unreachable. A relay change on the control plane reaches every Site within 5
  minutes.
- On an enrolled Site, Obzly settings show them read-only, and new channels can't be created there.
- On the control plane, the **Sites** section of **Notifications & alerting** shows when each Site
  last fetched them and whether it is up to date. **Move Site's own here** takes over a Site's
  existing channels under the same ids, so its rules keep working, plus its email relay if the
  control plane has none yet.

### Upgrading from `ALERT_SMTP_*`

Before v0.55.0, the relay was set with `ALERT_SMTP_*` environment variables and each project had
its own channels. On the first start of v0.55.0 or later the variables are imported once (a control
plane's as its central relay, a Site's as its own) and then ignored, so remove them from your
environment, Helm values or ConfigMaps. Existing project channels keep their ids, available to their
own project only, so existing rules keep working. See [Upgrade](/docs/operations/upgrade/).

## 3. Create a rule

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
| Notify | | up to 20 channels | Channels available to this project |
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

## 4. Silence alerts

On the **Silences** tab, mute notifications for alerts whose labels match every matcher in a
silence, for a chosen period (1 hour, 4 hours, 1 day, 1 week). A matcher compares one label to a
value, either exactly or as a regular expression anchored at both ends. Add a comment saying why.

Silences apply when a notification is sent. Alerts still change state while silenced and show on
the **Active** tab.

## Rules managed by Synthetics

A [Synthetics](/docs/how-to/synthetics/) monitor with alert channels gets alert rules of its own in
its destination project: a down rule, and optionally degraded and certificate rules. The control
plane sends them to the Site with the shared channels, and the Site keeps them in step.

On the **Rules** tab they carry a **Synthetics** tag and are read-only: you can view them, but not
turn them off, edit or delete them (the API answers `409`). Change them in the monitor's editor on
the control plane. They need the destination Site on v0.56.0 or later.

When a monitor depends on another in the same project, its down and degraded rules stay quiet while
the parent is failing, so an outage notifies once, for its root cause.

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
  "summary": "Error rate above 5% for payments-api",
  "labels": { "alertname": "API error rate", "service_name": "payments-api", "severity": "page" },
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
| `GET /projects/{id}/notification-channels` | The channels available to the project |
| `POST /projects/{id}/notification-channels/{channelId}/test` | Send a test notification |
| `GET`, `POST /projects/{id}/silences` | List or create silences |
| `DELETE /projects/{id}/silences/{silenceId}` | Delete a silence |

Channels and email in Obzly settings, for global admins:

| Method and path | Purpose |
| --- | --- |
| `GET`, `POST /settings/channels` | List or create channels |
| `PUT`, `DELETE /settings/channels/{channelId}` | Update or delete a channel |
| `POST /settings/channels/{channelId}/test` | Send a test notification |
| `GET`, `PUT`, `DELETE /settings/smtp` | Read, set or remove the email relay. The password is never returned |
| `POST /settings/smtp/test` | Send a test email |

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
