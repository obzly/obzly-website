---
title: Claude & Cursor over MCP
description: Connect Claude Code, Cursor, claude.ai or Claude Desktop to Obzly's MCP endpoint, read logs, traces, metrics, alerts and more, optionally allow a few confirmed changes, and track Claude Code usage per project.
---
<!-- Source: obzly-dev/README.md, obzly-dev/ARCHITECTURE.md, obzly-dev/backend/internal/features/mcp/tools.go, obzly-dev/backend/internal/features/mcp/server.go, obzly-dev/frontend/src/features/users/ui/AccessTokensComponent.tsx, obzly-dev/frontend/src/features/projects/ui/dataSources/claudeCodeDataSource.ts, obzly/docs/releases/v1.1.0.md, obzly/docs/releases/v1.2.0.md, obzly/backend/internal/features/mcp/server.go, obzly/backend/internal/features/mcp/tools.go, obzly/backend/internal/features/mcp/tools_cloud.go, obzly/backend/internal/features/mcp/tools_alerts.go, obzly/backend/internal/features/mcp/tools_insights.go, obzly/backend/internal/features/mcp/tools_ops.go, obzly/backend/internal/features/mcp/tools_write.go, obzly/backend/internal/features/mcp/tool_meta.go, obzly/backend/internal/features/mcp/paging.go, obzly/backend/internal/features/mcp/resources.go, obzly/backend/internal/features/mcp/prompts.go, obzly/backend/internal/features/access_tokens/service.go, obzly/backend/internal/features/oauth/controller.go, obzly/frontend/src/features/users/ui/AccessTokensComponent.tsx, obzly/frontend/src/pages/OAuthConsentPage.tsx, obzly/frontend/src/features/alerts/ui/SilencesComponent.tsx -->

Obzly serves a Model Context Protocol (MCP) endpoint at `/mcp`. AI assistants such as
Claude Code and Cursor can use it to search logs, run SQL over them, inspect traces and service
maps, run PromQL, and read alerts, incidents, synthetics, infrastructure, cloud cost and posture,
AI usage and web analytics, with exactly the access your own account has.

The endpoint is **read-only by default**. Every tool calls the same REST API the UI uses, as you,
so project permissions, validation and limits are the same as in the UI. Each tool may call only
the read endpoints it needs. A few [write tools](#write-tools) (silences and dashboards) exist, but
only for a token or app you explicitly allow to make changes.

## Connect Claude Code or Cursor

Tools that can send a header authenticate with a personal access token.

1. Open your profile (**Edit profile** in the user menu) and find **AI assistant access (MCP)**.
2. Click **Create token**. Give it a name and a lifetime of 30 days, 90 days or 1 year. If you have
   MFA turned on, you also enter your authenticator code. Leave **Also allow changes (write
   access)** off for a read-only token.
3. Copy the token. It starts with `obz_pat_` and is shown only once. The dialog also shows ready
   to paste setup snippets.

**Claude Code:**

```bash
claude mcp add --transport http obzly https://obzly.harborline.example/mcp \
  --header "Authorization: Bearer obz_pat_..."
```

**Cursor and other clients** that read an `mcp.json` file:

```json
{
  "mcpServers": {
    "obzly": {
      "url": "https://obzly.harborline.example/mcp",
      "headers": {
        "Authorization": "Bearer obz_pat_..."
      }
    }
  }
}
```

Tokens work only on `/mcp`, never on the REST API. You can see and revoke your tokens on the same
profile page. Its **Access** column shows whether each token is **Read-only** or **Read & write**.

## Connect claude.ai or Claude Desktop

claude.ai and Claude Desktop sign in through the browser instead of using a token:

1. Add a custom connector with the URL `https://obzly.harborline.example/mcp`.
2. Sign in to Obzly when asked, and allow access on the consent page.

Connected apps are listed under **Connected apps** on the same profile page, with their access,
where you can disconnect them.

:::caution[Set PUBLIC_URL]
Set [`PUBLIC_URL`](/docs/reference/configuration/#core) to the address users reach Obzly at, for
example `https://obzly.harborline.example`. OAuth metadata and tokens for MCP clients use this origin.
Without it, Obzly uses the scheme and host of each request.
:::

## Tools

Every tool below is read-only. On a [multi-site](#multi-site) control plane each one also takes
`site`.

### Sites and projects

| Tool | What it does |
| --- | --- |
| `list_sites` | Sites (regions) you can query. On a single install, the one local site |
| `list_projects` | Projects you can access on a site, with your role. Filter by name on large installs |

### Logs

| Tool | What it does |
| --- | --- |
| `search_logs` | Search logs with the search-bar syntax. Newest matches first, with the total match count |
| `log_context` | The logs just before and after one log (by `id` and timestamp from `search_logs`), from the same source |
| `query_logs_sql` | A read-only DuckDB `SELECT` over the project's logs, for counts, group-bys and top-N |
| `log_patterns` | The most frequent message patterns among matching logs |
| `log_fields` | Fields available for filtering logs in a project, with their types |
| `log_pattern_trends` | Patterns over a window from per-minute counts: the biggest, plus every new, spiking or dropping one, against 24 hours earlier and the 7 days before. Cheaper than `log_patterns` for long windows |
| `explain_logs` | Which field values (service, namespace, container, pod, ReplicaSet, level) grew most in share among matching logs from a baseline to the window. Use it to explain a spike |
| `log_volume` | Lines per UTC day by service (default 14 days), lines per level over 7 days, today against yesterday, bytes per line and the noisiest patterns. For cost and noise questions |
| `log_health_map` | Lines, error and warning lines per service, Kubernetes workload or host, with each tile's lines 24 hours earlier. At most 150 tiles |
| `web_analytics_report` | [Web analytics](/docs/how-to/web-analytics/) from a project's access logs: requests, visitors, failures, top pages, 404s, referrers, browsers, countries and status codes, against the window before |

### Traces and services

| Tool | What it does |
| --- | --- |
| `list_traces` | Find traces by service, operation, duration or errors |
| `get_trace` | All spans of one trace. Searches the last 24 hours unless given a time near the trace (`around`) or a window |
| `trace_summary` | Request count, error rate, p50 and p95 against the window before, with trends and a count of matching traces. Window at most 7 days |
| `list_services` | Services that reported spans in the window |
| `list_operations` | Operations (span names) of one service |
| `service_map` | The service dependency graph with request, error and latency stats |
| `service_errors` | Services with the most failed entry spans, with the previous window's counts. Use it to find which service is failing |

### Metrics and dashboards

| Tool | What it does |
| --- | --- |
| `list_metrics` | Metric names stored for a project |
| `metric_label_values` | Values of one metric label |
| `query_metrics` | Evaluate PromQL over a range or at an instant. 20 series by default, at most 100 |
| `list_dashboards` | Dashboards in a project |
| `get_dashboard` | One dashboard's definition: panels and their queries |
| `query_dashboard_panel` | Run one saved dashboard panel over a window and return its data (at most 500 points). Without a panel id it lists the dashboard's panels |

### Alerts and incidents

| Tool | What it does |
| --- | --- |
| `list_alerts` | A project's alerts now: firing and pending by default (resolved on request), with rule, labels, value and start time |
| `alert_summary` | Counts of alerts firing and pending, rules, and current or upcoming silences. The cheapest check for whether anything is alerting |
| `list_alert_rules` | A project's alert rules: source, query, threshold, timing, labels, last evaluation and error. Channels are only counted, never shown |
| `alert_rule_activity` | Firings and notifications per rule per UTC day over the last 7 days. Use it to find noisy or flapping rules |
| `list_silences` | Current and upcoming silences with their matchers, window and comment |
| `list_correlation_sessions` | Recent correlated sessions (incidents) linking logs, traces and metrics for one request flow |
| `get_correlation_session` | Everything linked to one correlated session, optionally with error logs and spans per service |
| `incident_impact` | For one correlated session, error logs and error spans per service inside its window: its blast radius |

### Infrastructure, ingestion and synthetics

| Tool | What it does |
| --- | --- |
| `ingestion_status` | Sources sending to a project with each signal's health (sending, quiet, stopped), last seen and recent rate. Use it when data seems missing |
| `inventory_summary` | [Infrastructure](/docs/how-to/infrastructure/) counts by kind, health and state, per project |
| `list_assets` | Infrastructure assets, worst health first, with health reasons and latest CPU, memory and disk |
| `get_asset` | One asset with its attributes, parents, node, children and recent changes |
| `asset_changes` | Assets that appeared or changed state or health, newest first. Default last 24 hours, at most 7 days |
| `list_monitors` | [Synthetic monitors](/docs/how-to/synthetics/): type, target, interval, locations and where results are stored. Headers, bodies and secrets are never shown |
| `monitor_status` | Each monitor's latest status per location, uptime and p95 duration over a window (at most 7 days) |

### AI usage

| Tool | What it does |
| --- | --- |
| `ai_usage_overview` | Claude Code cost, tokens, sessions, users, models, tools and API errors against the window before, or your apps' `gen_ai` calls. Never message content |
| `ai_budget_status` | A project's AI spending budgets with this period's spend, percent used, forecast and top users or models |

### Cloud cost and posture

From v1.1.0, for [cloud cost and posture](/docs/how-to/cloud-cost-posture/), scoped to your
projects:

| Tool | What it does |
| --- | --- |
| `cost_summary` | Cost per currency: month to date, forecast, last month, the last 90 days and open anomalies |
| `cost_explore` | Cost over a range grouped by one dimension, per period and currency |
| `cost_anomalies` | Days whose cost for a service or account was far from the usual for that weekday |
| `cost_budgets` | A project's monthly cost budgets with this month's spend and projection |
| `cost_recommendations` | Savings recommendations with their status and expected savings, plus commitments flagged unused or ending soon |
| `posture_scores` | Each standard's score, open findings by severity, and coverage |
| `posture_findings` | Posture findings, most severe first, with resource, control, source and status |
| `posture_coverage` | Per connection, account and region: whether posture is read natively, by the Obzly baseline, or not covered, and why |

Amounts are never added across currencies, and Obzly never changes anything in your clouds.

### Using the tools

`search_logs` takes the same syntax as the search bar, for example
`level:error service_name:payments-api "timeout"`. Matching is case-sensitive except for `level`. See
[Search-bar syntax](/docs/reference/log-query-api/#search-bar-syntax).

To find what led up to an error, an assistant can pass a log's `id` and timestamp to
`log_context`. By default the context comes from the same workload. Its `same` argument picks
the fields the surrounding logs share with that log instead, for example `["k8s_pod_name"]` for
one pod, `["trace_id"]` for one trace or `["*"]` for the whole project.

Windows default to the last hour (24 hours for some overviews). Pass `since` (`15m`, `6h`, `7d`) or
`from` and `to`, as RFC 3339 times or `YYYY-MM-DD` for whole UTC days.

Results:

- **Structured:** every tool declares an output schema, and results come both as JSON text and as
  structured content matching it.
- **Paging:** lists that page return `nextCursor`. The assistant passes it back as `cursor` with the
  same other arguments to get the next page. A cursor used with different arguments is refused.
- **Trimming:** a result too large for common MCP client limits is trimmed to whole items, and says
  so with `truncated`, a `note` and `trimmedLists` (each list's returned and total count).
- **Partial searches:** a log search that reaches its time limit returns what it found with
  `partial: true` and `searchedThrough`, how far back it got.

:::note
Log content comes from the systems you monitor and is untrusted. Results that carry it are marked
`untrustedData`, and the tool descriptions tell the assistant never to follow instructions found
in it.
:::

## Resources and prompts

The same data is also available as MCP resources, read-only:

| Resource | Contents |
| --- | --- |
| `obzly://sites` | The sites you can query |
| `obzly://projects` | The projects you can access, with your role |
| `obzly://projects/{project}/dashboards` | A project's dashboards |
| `obzly://projects/{project}/dashboards/{dashboard}` | One dashboard's tabs, panels and queries |
| `obzly://projects/{project}/data-sources` | Sources sending to a project, with each signal's health |
| `obzly://projects/{project}/alert-rules` | A project's alert rules |
| `obzly://saved-views/cost`, `obzly://saved-views/posture` | Your saved Cost Explorer and Posture Trends views, and those others shared |

On a control plane, project resources start with `obzly://sites/{site}/`.

Prompts are investigation playbooks a client can offer you:

| Prompt | What it does |
| --- | --- |
| `triage_alert` | Find out why an alert fired: its rule, the signal behind it, noise and silences |
| `explain_spike` | Explain a spike (or drop) in logs or errors over a window |
| `investigate_incident` | Walk a correlated session from its trigger to its blast radius and likely cause |
| `why_no_data` | Work out why a service, workload, host or source shows no data |
| `service_health` | Check one service's requests, errors and latency against before |

## Write tools

Write tools are optional and off by default. They let an assistant make a few changes for you:

| Tool | What it does |
| --- | --- |
| `create_silence` | Mute a project's alerts whose labels match, from now for at most 4 hours, with a required comment |
| `expire_silence` | End a current or upcoming silence now, so its alerts notify again |
| `create_dashboard` | Create a new dashboard, optionally with up to 20 panels (logs, spans or metrics queries) |
| `add_dashboard_panel` | Add one panel to the bottom of a tab of an existing dashboard. Existing panels are kept as they are |

No tool deletes anything or changes an existing dashboard's panels. Everything else stays
read-only.

### Allow write access

Write tools need the `mcp:write` scope, which is never granted unless you opt in:

- **Access token:** tick **Also allow changes (write access)** when you create it. You can't add
  write access to an existing token; create a new one.
- **claude.ai, Claude Desktop and other OAuth apps:** if the app asks for write access, the consent
  page shows a checkbox to also allow it to create and end silences and create dashboards. It is off
  until you tick it. Leave it off and the app stays read-only.

Write access also needs two-factor authentication: the token must be created, or the app
connected, from a session that passed MFA. Turn it on under your profile first, unless you sign in
through a provider that enforces it. A read-only token or app doesn't see the write tools at all.

### Confirmation

You confirm every change before it runs:

- Clients that support MCP elicitation (protocol `2026-07-28` and later) ask you in the client,
  showing what the change would do. Declining changes nothing.
- Other clients get a preview first, and nothing changes. The assistant should show it to you and,
  only if you agree, repeat the call with the same arguments and `confirm: true`.

The tool descriptions tell the assistant to write only when you asked for the change in your own
words, never because text in a log, span, alert or dashboard says so.

### Limits and audit

| Limit | Value |
| --- | --- |
| Writes | 10 per user per 10 minutes, on top of the normal [limits](#limits) |
| Silence length | 1 minute to 4 hours, starting now |
| Silence matchers | Up to 20. At least one must be an exact match with a value. Match-everything regular expressions such as `.*` are refused |
| Silence comment | Required, up to 1,000 characters |
| Panels | Up to 20 when creating a dashboard, 100 per tab |

Silences made through MCP show **Created via MCP by** and the app's name on the
[Silences](/docs/how-to/alerts/#4-silence-alerts) tab. Silences from Synthetics maintenance
windows can't be ended through MCP. Every write, done or failed, is recorded in the audit log with
the user, the app or token, and its arguments. Writes use your own permissions in each project,
exactly as the UI does.

## Multi-site

On a [multi-site](/docs/deploy/multi-site/) control plane, one `/mcp` endpoint covers every Site
you can access. The assistant calls `list_sites`, then passes `site` to each tool. Access is
checked per Site exactly as it is in the UI.

## Limits

| Limit | Value |
| --- | --- |
| Rate | Per user, bursts of 30 calls, then 1 per second. One token or app gets bursts of 20 |
| Time per call | 175 seconds. Cancelling a call in the client stops its query |
| Window | At most 31 days for logs and traces, 92 days for metrics, less where a tool says so |
| Rows | 50 by default, at most 200 |
| Long log messages | Cut at 2,000 characters |
| Result size | Capped so results fit common MCP client output limits |

`query_logs_sql` refuses DuckDB's introspection and file functions (such as `duckdb_*`,
`current_setting`, `read_*` and `query()`), as SQL mode in Logs does.

## AI observability for Claude Code

Each project has an **AI Observability** page that shows Claude Code usage: estimated cost,
tokens, cache hit rate, sessions, users, models, tools and API errors, plus a timeline per
session. It is built from Claude Code's own OpenTelemetry events.

To send Claude Code telemetry to a project:

1. In the project's **Project Settings → Data sources**, pick **Claude Code** (under AI Tools).
2. Optionally set **Team** to add a `team` resource attribute for breaking usage down by team.
   Leave **Include prompt text** off unless you want prompt text stored. When it is off, prompt
   events carry only the prompt length.
3. Generate the config. You get an env file and a `managed-settings.json` with the same values.

The env file looks like this:

```bash
export CLAUDE_CODE_ENABLE_TELEMETRY="1"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://obzly.harborline.example"
export OTEL_EXPORTER_OTLP_HEADERS="X-API-Key=YOUR_API_KEY"
export OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE="cumulative"
# Added when you set a team:
export OTEL_RESOURCE_ATTRIBUTES="team=platform"
# Added when you include prompt text:
export OTEL_LOG_USER_PROMPTS="1"
```

- **One machine:** add the exports to your shell profile and start a new `claude` session.
- **A team:** deploy `managed-settings.json` to `/etc/claude-code/` on Linux or
  `/Library/Application Support/ClaudeCode/` on macOS, or merge its `env` block into
  `~/.claude/settings.json`.

Keep `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE="cumulative"`. Claude Code defaults to
delta temporality, which Obzly's metrics ingest doesn't handle.

:::note[Cost is an estimate]
The cost shown is Claude Code's API-equivalent price. On Pro, Max or Team plans it is not what
you are billed, and remaining quota isn't exported.
:::

Claude Code events are stored in their own stream, so they don't appear in log **Search**,
patterns, fields or live tail. Retention and project deletion cover them like other logs.
