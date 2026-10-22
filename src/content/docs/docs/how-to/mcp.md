---
title: Claude & Cursor over MCP
description: Connect Claude Code, Cursor, claude.ai or Claude Desktop to Obzly's read-only MCP endpoint, and track Claude Code usage per project.
---
<!-- Source: obzly-dev/README.md, obzly-dev/ARCHITECTURE.md, obzly-dev/backend/internal/features/mcp/tools.go, obzly-dev/backend/internal/features/mcp/server.go, obzly-dev/frontend/src/features/users/ui/AccessTokensComponent.tsx, obzly-dev/frontend/src/features/projects/ui/dataSources/claudeCodeDataSource.ts -->

Obzly serves a Model Context Protocol (MCP) endpoint at `/mcp`. AI assistants such as
Claude Code and Cursor can use it to search logs, run SQL over them, inspect traces and service
maps, and run PromQL, with exactly the access your own account has.

The endpoint is **read-only by design**. Every tool calls the same REST API the UI uses, as you,
so project permissions, validation and limits are the same as in the UI.

## Connect Claude Code or Cursor

Tools that can send a header authenticate with a personal access token.

1. Open your profile (**Edit profile** in the user menu) and find **AI assistant access (MCP)**.
2. Create a token. Give it a name and a lifetime of 30 days, 90 days or 1 year. If you have MFA
   turned on, you also enter your authenticator code.
3. Copy the token. It starts with `obz_pat_` and is shown only once. The dialog also shows ready
   to paste setup snippets.

**Claude Code:**

```bash
claude mcp add --transport http obzly https://obzly.example.com/mcp \
  --header "Authorization: Bearer obz_pat_..."
```

**Cursor and other clients** that read an `mcp.json` file:

```json
{
  "mcpServers": {
    "obzly": {
      "url": "https://obzly.example.com/mcp",
      "headers": {
        "Authorization": "Bearer obz_pat_..."
      }
    }
  }
}
```

Tokens work only on `/mcp`, never on the REST API. You can see and revoke your tokens on the same
profile page.

## Connect claude.ai or Claude Desktop

claude.ai and Claude Desktop sign in through the browser instead of using a token:

1. Add a custom connector with the URL `https://obzly.example.com/mcp`.
2. Sign in to Obzly when asked, and allow access on the consent page.

Connected apps are listed under **Connected apps** on the same profile page, where you can
disconnect them.

:::caution[Set PUBLIC_URL]
Set [`PUBLIC_URL`](/docs/reference/configuration/#core) to the address users reach Obzly at, for
example `https://obzly.example.com`. OAuth metadata and tokens for MCP clients use this origin.
Without it, Obzly uses the scheme and host of each request.
:::

## Tools

| Tool | What it does |
| --- | --- |
| `list_sites` | Sites (regions) you can query. On a single install, the one local site |
| `list_projects` | Projects you can access on a site, with your role. Filter by name on large installs |
| `search_logs` | Search logs with the search-bar syntax. Newest matches first, with the total match count |
| `log_context` | The logs just before and after one log (by `id` and timestamp from `search_logs`), from the same source |
| `query_logs_sql` | A read-only DuckDB `SELECT` over the project's logs, for counts, group-bys and top-N |
| `log_patterns` | The most frequent message patterns among matching logs |
| `log_fields` | Fields available for filtering logs in a project, with their types |
| `list_traces` | Find traces by service, operation, duration or errors |
| `get_trace` | All spans of one trace |
| `list_services` | Services that reported spans in the window |
| `list_operations` | Operations (span names) of one service |
| `service_map` | The service dependency graph with request, error and latency stats |
| `list_metrics` | Metric names stored for a project |
| `metric_label_values` | Values of one metric label |
| `query_metrics` | Evaluate PromQL over a range or at an instant. Series are capped at 100 |
| `list_dashboards` | Dashboards in a project |
| `get_dashboard` | One dashboard's definition: panels and their queries |
| `list_correlation_sessions` | Recent correlated sessions linking logs, traces and metrics for one request flow |
| `get_correlation_session` | Everything linked to one correlated session |

`search_logs` takes the same syntax as the search bar, for example
`level:error service_name:api "timeout"`. Matching is case-sensitive except for `level`. See
[Search-bar syntax](/docs/reference/log-query-api/#search-bar-syntax).

To find what led up to an error, an assistant can pass a log's `id` and timestamp to
`log_context`. By default the context comes from the same workload. Its `same` argument picks
the fields the surrounding logs share with that log instead, for example `["k8s_pod_name"]` for
one pod, `["trace_id"]` for one trace or `["*"]` for the whole project.

:::note
Log content comes from the systems you monitor and is untrusted. The tool descriptions tell the
assistant never to follow instructions found in it.
:::

## Multi-site

On a [multi-site](/docs/deploy/multi-site/) control plane, one `/mcp` endpoint covers every Site
you can access. The assistant calls `list_sites`, then passes `site` to each tool. Access is
checked per Site exactly as it is in the UI.

## Limits

| Limit | Value |
| --- | --- |
| Rate | Per user, bursts of 30 calls, then 1 per second |
| Time per call | 175 seconds |
| Rows | 50 by default, at most 200 |
| Long log messages | Cut at 2,000 characters |
| Result size | Capped so results fit common MCP client output limits |

## AI observability for Claude Code

Each project has an **AI Observability** tab that shows Claude Code usage: estimated cost,
tokens, cache hit rate, sessions, users, models, tools and API errors, plus a timeline per
session. It is built from Claude Code's own OpenTelemetry events.

To send Claude Code telemetry to a project:

1. In the project's **Data Sources**, pick **Claude Code** (under AI Tools).
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
export OTEL_EXPORTER_OTLP_ENDPOINT="https://obzly.example.com"
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
