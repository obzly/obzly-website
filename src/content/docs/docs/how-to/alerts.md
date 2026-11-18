---
title: Alerts & notifications
description: Create alert rules over metrics, logs, log patterns and traces, set their severity, and deliver notifications to webhooks, Slack, PagerDuty or email with editable message templates.
---
<!-- Source: obzly-dev/README.md, obzly-dev/ARCHITECTURE.md, obzly-dev/docs/configuration.md, obzly-dev/backend/internal/features/alerting/models.go, obzly-dev/backend/internal/features/alerting/service.go, obzly-dev/backend/internal/features/alerting/channels.go, obzly-dev/backend/internal/features/alerting/controller.go, obzly-dev/backend/internal/features/alerting/settings_controller.go, obzly-dev/backend/internal/features/alerting/settings_channels.go, obzly-dev/backend/internal/features/alerting/managed_rules.go, obzly-dev/backend/internal/features/sharedconfig/controller.go, obzly-dev/backend/internal/features/sharedconfig/loader.go, obzly-dev/docs/runbooks/upgrade.md, obzly-dev/frontend/src/features/alerts/ui/RuleEditorDrawerComponent.tsx, obzly-dev/frontend/src/features/alerts/ui/RulesComponent.tsx, obzly-dev/frontend/src/features/alerts/ui/ChannelsComponent.tsx, obzly-dev/frontend/src/features/alerts/ui/NotificationSettingsComponent.tsx, obzly/docs/releases/v1.1.0.md, obzly/docs/releases/v1.2.0.md, obzly/docs/configuration.md, obzly/backend/internal/features/alerting/severity.go, obzly/backend/internal/features/alerting/templates.go, obzly/backend/internal/features/alerting/templates_defaults.go, obzly/backend/internal/features/alerting/templates_settings.go, obzly/backend/internal/features/alerting/incidents.go, obzly/backend/internal/features/alerting/activity.go, obzly/backend/internal/features/alerting/channels.go, obzly/backend/internal/features/alerting/site_managed_rules.go, obzly/backend/internal/features/alerting/controller.go, obzly/backend/internal/features/alerting/settings_controller.go, obzly/backend/migrations/20261119160000_add_notification_templates.sql, obzly/frontend/src/features/alerts/ui/RuleEditorDrawerComponent.tsx, obzly/frontend/src/features/alerts/ui/RulesComponent.tsx, obzly/frontend/src/features/alerts/ui/MessageTemplatesComponent.tsx, obzly/frontend/src/features/alerts/ui/ChannelTemplateModal.tsx, obzly/frontend/src/features/alerts/ui/TemplateEditorComponent.tsx, obzly/frontend/src/features/alerts/ui/SilencesComponent.tsx, obzly/frontend/src/features/alerts/lib/messageTemplates.ts, obzly/frontend/src/features/incidents/ui/IncidentNotificationsModal.tsx -->

Obzly evaluates alert rules over a project's metrics, logs and traces, and sends notifications
through webhooks, Slack, PagerDuty or email. Rules follow the familiar Prometheus lifecycle:
**pending** while the condition holds, **firing** after the `for` duration, **resolved** when it
stops. Once a rule fires, its notification typically arrives in about 15 seconds.

Rules live on the project's **Alerts** page, which has four tabs: **Active**, **Rules**,
**Channels** and **Silences**. Its header counts the alerts firing and pending now, the rules and
the current or upcoming silences. Notification channels, the email relay and message templates are
defined once, by an admin, in **Obzly settings → Notifications & alerting**, and shared across
projects.

## Who can do what

| Action | Who |
| --- | --- |
| View rules, active alerts, silences and the channels a project can use | Any project member |
| Create, edit and delete rules | Project owners and admins |
| Create and edit silences | Members who can write (not viewers) |
| View a project's incident notification settings | Any project member |
| Change a project's incident notification settings | Project owners and admins |
| Send a test notification from the project's **Channels** tab | The project owner or a global admin |
| Create, edit, test and delete notification channels, and set up email | Global admins, in Obzly settings (channels hold credentials) |
| Edit message templates | Global admins, in Obzly settings |

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
| Slack | An incoming webhook URL | A message with a side bar coloured by severity |
| Webhook | An `http(s)` URL and optional headers, for example `Authorization` | A JSON `POST` (see [Webhook payload](#webhook-payload)) |
| PagerDuty | An Events API v2 routing key | A trigger event at the rule's severity, resolved automatically on recovery |
| Email | 1 to 20 recipients, for example `ops@harborline.example` | A plain-text email through the relay above |

Then choose where it is **Available to**: every project, or some projects. On a control plane the
choices are every project on every Site, every project on some Sites, or some projects.

Channel settings (URLs, headers, keys, recipients) are stored encrypted and never shown in full
again. The list shows only a non-secret target, such as the URL's host or the last characters of
a routing key, and where each channel is available. **Send test** sends a test notification and
reports the receiver's HTTP status. Deleting a channel means rules stop notifying it.

Each channel also has a **Message template** action, where you choose whether it uses the
organisation's template for its kind or its own, and turn **Use emoji** on or off. See
[Message templates](#message-templates).

Each project's **Channels** tab lists the channels its rules can use, read-only, with a **Test**
button. A channel whose template failed at send time shows a **template error** tag in both lists.

### Multi-site

With a [control plane](/docs/deploy/multi-site/), channels, message templates and the email relay
are managed centrally, on the control plane:

- Each Site fetches them every 5 minutes and keeps the last copy, so alerts still go out while the
  control plane is unreachable. A change on the control plane reaches every Site within 5 minutes.
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

You can also start a rule from a chart in Logs: **Create alert** opens the rule
editor with the chart's query filled in. See [Explore logs](/docs/how-to/explore-logs/).

Then set the condition, timing and message:

| Field | Default | Range | Meaning |
| --- | --- | --- | --- |
| Fire when value | | `>`, `>=`, `<`, `<=`, `==`, `!=` | Comparison against the threshold |
| Threshold | | | The value to compare with |
| Over the last (s) | `300` | 60 s to 1 day | The window logs, log patterns and traces are counted over |
| Check every (s) | `60` | 15 s to 1 day | How often the rule is evaluated |
| For (s) | `0` | 0 to 1 day | How long the condition must hold before the alert fires |
| Remind every (s) | `14400` (4 hours) | 0 to 7 days | Notify again while still firing. `0` notifies once |
| Severity | Medium | Critical, High, Medium, Low | Sets the emoji, Slack's bar colour and PagerDuty's severity (see [Severity](#severity)) |
| Notify | | up to 20 channels | Channels available to this project |
| Summary | | up to 2,000 characters | Included in every notification |
| Description / runbook | | up to 4,000 characters | What to check or do. The built-in templates add it to every message, and templates can use it as `{{.Rule.Description}}` |
| Labels | | up to 20 | Added to every alert, for example `severity=page`, `team=core`. Names must match `[a-zA-Z_][a-zA-Z0-9_]*`, and `alertname` is reserved |

Use **Preview** to run the query once and see the series it would produce, without saving or
changing anything.

Each alert is labelled with the rule's labels, the series' own labels and `alertname`. If a
rule's query fails, the error is shown on the rule and no alert state changes.

:::tip[Attribute names]
PromQL and log fields use Obzly's normalized names, such as `k8s_pod_name` rather than
`k8s.pod.name`. See [Attribute names](/docs/how-to/grafana-promql/#attribute-names).
:::

## Severity

Every rule has a severity: **Critical**, **High**, **Medium** (the default) or **Low**. It decides
how each channel presents the alert:

| Severity | Emoji when firing | Slack side bar | PagerDuty severity |
| --- | --- | --- | --- |
| Critical | 📣❗🔥 | Red | `critical` |
| High | 📣❗🚨 | Orange | `error` |
| Medium | 📣 🔔⚠️ | Amber | `warning` |
| Low | 🔔🔔👀 | Blue | `info` |

Resolved notifications use ✅️ and a green bar, test notifications 🧪 and a grey bar. The emoji
starts each message's title in the built-in templates. Turn **Use emoji** off on a channel (its
**Message template** action) to leave it out of that channel's messages.

The severity is a field of the rule, separate from its labels. When you upgrade to v1.2.0, existing
rules take theirs from their `severity` label, and a rule created through the API without a
severity does the same:

| `severity` label | Severity |
| --- | --- |
| `critical` | Critical |
| `high`, `error` | High |
| `warning`, `medium` | Medium |
| `info`, `low` | Low |
| anything else, or none | Medium |

Rules kept by other features set their own: a Synthetics down rule is Critical, degraded and
certificate rules Medium; AI budget and posture finding alerts High (or the threshold's or
finding's own severity); cost anomalies and budgets Medium; commitments ending Low.

## Message templates

What each channel kind sends is a template you can edit. In **Obzly settings → Notifications &
alerting**, the **Message templates** card holds the organisation's template for each kind, used
for every rule, Synthetics monitor and incident. Pick the kind, edit, and **Save**:

| Kind | What you edit |
| --- | --- |
| Email | The subject and **Body (plain text)** |
| Slack | **Message (Slack mrkdwn)** |
| PagerDuty | **Summary (up to 1024 characters)** |
| Webhook | **Built-in JSON** (the fixed `obzly.alert/1` body, see [Webhook payload](#webhook-payload)) or **Custom template**, your own JSON. A custom template must render valid JSON, which is checked when you save |

While you edit:

- **Insert a variable** adds a variable or helper at the cursor.
- **Preview** renders the draft as it changes, against sample notifications: a firing alert of
  each severity, a resolved one, a test, and an incident opening and ending. **Preview with emoji**
  shows it with or without the emoji.
- Problems are listed with their line, and a template with problems can't be saved.
- **Send test** sends the draft, rendered with a test notification, to a channel of that kind you
  pick. It doesn't save the draft.
- **Discard changes** goes back to the saved template. **Reset to default** goes back to the
  built-in one.

A channel can use its own template instead. Its **Message template** action opens the same editor:
turn off **Use organisation default** to edit a copy of the organisation's template for that
channel only. The same dialog has the channel's **Use emoji** switch.

On a control plane, templates are central and reach the Sites with the channels. An enrolled Site
shows them read-only. Every template change is recorded in the audit log.

### Template syntax

Templates use Go's [`text/template`](https://pkg.go.dev/text/template) syntax. The built-in email
subject, for example, is:

```text
{{if .Emoji}}{{.Emoji}} {{end}}[{{upper .Status}}] {{if not .Test}}{{.Severity}}: {{end}}{{.Rule.Name}}
```

which renders as `📣❗🚨 [FIRING] High: Checkout error rate`.

| Variable | Value |
| --- | --- |
| `.Emoji` | The severity or status emoji, empty when the channel's **Use emoji** is off |
| `.Status` | `firing`, `resolved` or `test` |
| `.Severity`, `.SeverityKey` | `Critical` to `Low`, or `critical` to `low` |
| `.Test` | True for test notifications |
| `.Rule.Name`, `.Rule.Description` | The rule's name (or the incident's title) and its description / runbook |
| `.Summary` | The rule's summary |
| `.Value`, `.Comparison`, `.Threshold` | The measured value and the condition, for example `0.083`, `>`, `0.05` |
| `.Labels`, `.SortedLabels` | The alert's labels as a map, or sorted as a list of `.Name` and `.Value` |
| `.StartsAt`, `.EndsAt` | When it started and resolved, in UTC. `.StartsAtISO` and `.EndsAtISO` give RFC 3339 |
| `.Duration` | How long it has fired, for example `12m` |
| `.Project.Name`, `.Site.Name` | The project and the Site (empty on a standalone install) |
| `.Source` | `metrics`, `logs`, `traces` and so on, or `incident` |
| `.Link` | Opens the alert or incident in Obzly, empty when no address is set (see [Links](#links-in-messages)) |
| `.Incident` | Incident notifications only: `.Services`, `.SignalCount`, `.ErrorLogs`, `.ErrorSpans` and `.TopServices` (each with `.Name`, `.ErrorLogs`, `.ErrorSpans`, `.Total`). Wrap it in `{{if .Incident}}` |

Helpers: `upper`, `lower`, `title`, `trim`, `truncate`, `join`, `default`, `contains`,
`hasPrefix`, `hasSuffix`, and `label` (one label, for example `{{label .Labels "service_name"}}`).
They only work on strings: templates have no file, environment or network access.

Limits and safety:

- A template is at most 16 KB. It must render within 2 seconds, to at most 64 KB. `define`,
  `template` calls and ranging over a number are refused.
- Every value is escaped for its channel before the template sees it: Slack's `&`, `<` and `>`,
  JSON for webhooks, control characters dropped for email and PagerDuty. Text from telemetry can't
  add a Slack mention or link, or break a webhook's JSON.
- A template that fails at send time never drops the notification. The built-in template is sent
  instead, the worker logs the failure, and the channel or template shows **template error** on the
  deployment that sends it (a Site, or a standalone install). The next successful send clears it.

### Links in messages

`.Link` opens the alert's rule on the project's **Alerts** page, or the incident on its
**Incidents** page. It is built from [`PUBLIC_URL`](/docs/reference/configuration/#core). On a Site
enrolled in a control plane it uses the control plane's address (`CONTROL_PLANE_ISSUER`) with the
Site selected. Without either it is empty, and the built-in templates leave the link out. PagerDuty
events also get it as an **Open in Obzly** link.

## Incident notifications

Obzly's correlation scanner groups error signals across services into incidents (correlated
sessions), shown on the project's **Incidents** page. A project can notify its channels when an
incident opens and ends. On the **Incidents** page, click the gear icon (**Incident
notifications**):

| Setting | Default | Meaning |
| --- | --- | --- |
| **Notify when an incident opens** | Off | Turns incident notifications on |
| **Also notify when it ends** | Off | Notify again when no new errors arrived in its services for 15 minutes |
| **When an incident has at least** | 3 error signals, or 2 services | Smaller incidents don't notify |
| **Severity** | High | The severity incident notifications are sent at |
| **Notify** | | Channels available to the project. At least one is needed to turn notifications on |

Sessions that keep arriving for the same services count as one incident: a session sharing a
service with an open incident within 15 minutes joins it. Each incident therefore notifies once
when it opens and once when it ends.

Incident notifications use each channel's message template and go through the same delivery queue
as alerts. They carry the labels `alertname=Incident`, `obzly_kind=incident` and `severity`, so a
silence matching `alertname=Incident` mutes them. Silences on other labels, such as one service's
alerts, don't, because an incident spans services.

## 4. Silence alerts

On the **Silences** tab, mute notifications for alerts whose labels match every matcher in a
silence, for a chosen period (1 hour, 4 hours, 1 day, 1 week). A matcher compares one label to a
value, either exactly or as a regular expression anchored at both ends. Add a comment saying why.

Silences apply when a notification is sent. Alerts still change state while silenced and show on
the **Active** tab.

An AI assistant with [MCP write access](/docs/how-to/mcp/#write-tools) can also create silences of
up to 4 hours, and end silences early. Those show **Created via MCP by** and the app's name under
their comment, and the audit log records who made them.

## Rule activity

The **Rules** tab shows how often each rule fired, per day, over the last 7 days (**Fired, 7
days**), and a **Noisiest rules** list: the rules that sent the most notifications in that time,
with how often each fired and how many notifications it sent per firing. Under 5 per firing counts
as calm.

Firings count series that went from pending to firing. Notifications count deliveries to the
rule's channels: firing, reminders and resolved, but not silenced ones. Counting started with
v1.2.0, so earlier days, and days before a rule was created, show as unknown rather than zero.

## Rules managed by other features

Some rules are kept by another feature. They show on the **Rules** tab but are read-only there: you
can't turn them off, edit or delete them (the API answers `409`). Change them where they come from.

### Synthetics

A [Synthetics](/docs/how-to/synthetics/) monitor with alert channels gets alert rules of its own in
its destination project: a down rule, and optionally degraded and certificate rules. The control
plane sends them to the Site with the shared channels, and the Site keeps them in step.

On the **Rules** tab they carry a **Synthetics** tag. Change them in the monitor's editor on the
control plane. They need the destination Site on v0.56.0 or later.

When a monitor depends on another in the same project, its down and degraded rules stay quiet while
the parent is failing, so an outage notifies once, for its root cause.

### AI budgets

A project's AI spending budgets alert through rules with a **Budget** tag. Change them on the
budget itself, in the project's **AI Observability** page, **Budgets** tab.

### Cloud cost and posture

From v1.1.0, [cloud cost and security posture](/docs/how-to/cloud-cost-posture/) send alerts
through the same shared channels: monthly cost budgets (on the forecast), cost anomalies, Savings
Plans and reservations ending within 60 days, and new or reopened critical and high posture
findings. You set them up on the **Cost** and **Posture** pages, not on the **Rules** tab.

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
`User-Agent: Obzly-Alerting/1`, plus any headers you configured. With the **Built-in JSON**
template the body is:

```json
{
  "version": "obzly.alert/1",
  "kind": "alert",
  "status": "firing",
  "severity": "high",
  "projectId": "YOUR_PROJECT_ID",
  "ruleId": "6f1c2d3e-0000-4000-8000-000000000000",
  "ruleName": "API error rate",
  "source": "metrics",
  "summary": "Error rate above 5% for payments-api",
  "description": "Check the payments dashboard. Roll back the last deploy if it started then.",
  "labels": { "alertname": "API error rate", "service_name": "payments-api", "team": "payments" },
  "value": 0.083,
  "comparison": ">",
  "threshold": 0.05,
  "fingerprint": "a1b2c3d4",
  "startsAt": "2026-10-01T12:00:00Z",
  "endsAt": null,
  "link": "https://obzly.harborline.example/?project=YOUR_PROJECT_ID&rule=6f1c2d3e-0000-4000-8000-000000000000&tab=alerts"
}
```

- `status` is `firing`, `resolved` or `test`. `endsAt` is set on resolved notifications.
- `kind` is `alert` or `incident`. Incident notifications also carry an `incident` object with
  `id`, `services`, `signalCount`, `errorLogs`, `errorSpans` and `topServices` (each with `name`,
  `errorLogs`, `errorSpans` and `total`).
- `severity` is `critical`, `high`, `medium` or `low`. `description` is the rule's description /
  runbook.
- `link` opens the alert in Obzly. It is empty when no address is set (see
  [Links in messages](#links-in-messages)).

`kind`, `severity`, `description`, `link` and `incident` were added in v1.2.0. The other fields are
unchanged, so existing receivers keep working. To send a different body, use a **Custom template**
(see [Message templates](#message-templates)).

PagerDuty events use `<ruleId>:<fingerprint>` as the `dedup_key`, so a resolved notification closes
the incident its firing notification opened. Their `custom_details` hold the labels, value and
summary, plus the runbook and incident details when there are any.

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
| `GET /projects/{id}/alert-rules/activity` | Each rule's firings and notifications per UTC day, last 7 days |
| `GET /projects/{id}/alerts` | Pending, firing and recently resolved alerts |
| `GET /projects/{id}/alerts/summary` | Counts of alerts firing and pending, rules and silences |
| `GET /projects/{id}/notification-channels` | The channels available to the project |
| `POST /projects/{id}/notification-channels/{channelId}/test` | Send a test notification |
| `GET`, `POST /projects/{id}/silences` | List or create silences |
| `POST /projects/{id}/silences/{silenceId}/expire` | End a silence now, keeping it on record |
| `DELETE /projects/{id}/silences/{silenceId}` | Delete a silence |
| `GET`, `PUT /projects/{id}/incident-notifications` | Read or replace the project's incident notification settings |

Channels, templates and email in Obzly settings, for global admins:

| Method and path | Purpose |
| --- | --- |
| `GET`, `POST /settings/channels` | List or create channels |
| `PUT`, `DELETE /settings/channels/{channelId}` | Update or delete a channel |
| `POST /settings/channels/{channelId}/test` | Send a test notification |
| `PUT /settings/channels/{channelId}/template` | Set a channel's own template and **Use emoji** switch |
| `GET /settings/message-templates` | The organisation's template for each channel kind |
| `PUT`, `DELETE /settings/message-templates/{kind}` | Save a kind's template, or reset it to the built-in one |
| `POST /settings/message-templates/preview` | Render a template against the sample notifications |
| `POST /settings/message-templates/test` | Send a test rendered with a template |
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
  "severity": "high",
  "labels": { "team": "payments" },
  "summary": "Error rate above threshold",
  "description": "Check the payments dashboard. Roll back the last deploy if it started then.",
  "channelIds": ["YOUR_CHANNEL_ID"]
}
```

`severity` is `critical`, `high`, `medium` or `low`. Leave it out to take it from the `severity`
label, or Medium. Log rules put a [query tree](/docs/reference/log-query-api/#query-structure) in
`query.logs` and an optional field in `query.groupBy`. Trace rules use `query.metric`,
`query.serviceName`, `query.operationName` and `query.groupBy`.
