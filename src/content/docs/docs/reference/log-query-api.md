---
title: Log query API
description: Search a project's logs over HTTP with structured query trees, SQL or streaming, with request and response shapes, operators and limits.
---
<!-- Source: obzly-dev/backend/internal/features/logs/querying/readme.md, obzly-dev/backend/internal/features/logs/querying/controller.go, obzly-dev/backend/internal/features/logs/querying/validator.go, obzly-dev/backend/internal/features/logs/querying/dto.go, obzly-dev/backend/internal/features/logs/core/dto.go, obzly-dev/backend/internal/features/logs/core/search_query.go -->

The log query API is what Obzly's own **Search** page uses. It takes a structured query tree
over a time range and returns matching logs, newest first, with cursor paging. The same
project's logs can also be queried with SQL.

All paths below are relative to `https://obzly.harborline.example/api/v1`.

:::tip
With `ENV_MODE=development`, Obzly serves interactive Swagger docs for every endpoint at
`/api/v1/docs/swagger/index.html`.
:::

## Authentication

Query endpoints take a **user session token**, not a project API key:

```text
Authorization: Bearer YOUR_SESSION_TOKEN
```

Get one by signing in:

```bash
curl -X POST "https://obzly.harborline.example/api/v1/users/signin" \
  -H "Content-Type: application/json" \
  -d '{"email": "ops@harborline.example", "password": "YOUR_PASSWORD"}'
```

The response carries `token`. If the account has MFA, the response instead has
`mfaRequired: true` and an `mfaToken`. Complete the sign-in with a current authenticator code:

```bash
curl -X POST "https://obzly.harborline.example/api/v1/users/mfa/login-verify" \
  -H "Content-Type: application/json" \
  -d '{"mfaToken": "MFA_TOKEN_FROM_SIGNIN", "code": "123456"}'
```

You can query any project you are a member of. Global admins can query every project. The
project ID always comes from the URL path, never the request body.

:::note
Project API keys (`X-API-Key`) are for sending data and for the
[PromQL and Jaeger APIs](/docs/how-to/grafana-promql/). MCP tokens work only on `/mcp` (see
[Claude & Cursor over MCP](/docs/how-to/mcp/)).
:::

## Endpoints

| Method and path | Purpose |
| --- | --- |
| `POST /logs/query/execute/{projectId}` | Run a structured query and return one page of logs |
| `POST /logs/query/stream/{projectId}` | The same query, streamed as NDJSON window by window |
| `POST /logs/query/execute-sql/{projectId}` | Run one SQL `SELECT` over the project's logs |
| `GET /logs/query/fields/{projectId}?query=...` | List queryable fields, optionally filtered by name |
| `POST /logs/query/patterns/{projectId}` | The most frequent message patterns among matching logs |
| `POST /logs/query/field-values/{projectId}` | A field's most frequent values among matching logs |
| `POST /logs/query/context/{projectId}` | The logs just before and after one log, from the same source |
| `POST /logs/query/changes/{projectId}` | Message patterns that are new, spiking or dropping between two time ranges |
| `POST /logs/query/deploys/{projectId}` | Kubernetes Deployment rollouts that began in a time range |
| `GET /logs/query/stats/{projectId}` | Log count, stored size and time range for the project |

## Execute a query

```text
POST /logs/query/execute/{projectId}
```

### Request

```json
{
  "query": {
    "type": "condition",
    "condition": { "field": "level", "operator": "equals", "value": "error" }
  },
  "timeRange": {
    "from": "2026-10-01T00:00:00Z",
    "to": "2026-10-01T23:59:59Z"
  },
  "limit": 100,
  "sortOrder": "desc"
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `query` | [QueryNode](#query-structure) | Optional. Omit it to match every log in the range |
| `timeRange.from` | RFC 3339 time | Optional |
| `timeRange.to` | RFC 3339 time | **Required**, so pages stay consistent while new logs arrive |
| `limit` | integer | Logs per page. Default 100, maximum 1000 |
| `sortOrder` | `desc` or `asc` | Default `desc` (newest first). Results are always sorted by timestamp |
| `cursor` | string | The previous response's `nextCursor`, to fetch the next page |
| `offset` | integer | Still accepted, but ignored when `cursor` is set. Prefer cursors |
| `trackTotal` | boolean | `false` skips counting matches. Default counts on the first page |

A full example:

```bash
curl -X POST "https://obzly.harborline.example/api/v1/logs/query/execute/YOUR_PROJECT_ID" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "type": "logical",
      "logic": {
        "operator": "and",
        "children": [
          { "type": "condition", "condition": { "field": "level", "operator": "equals", "value": "error" } },
          { "type": "condition", "condition": { "field": "service_name", "operator": "equals", "value": "checkout" } }
        ]
      }
    },
    "timeRange": { "from": "2026-10-01T00:00:00Z", "to": "2026-10-01T12:00:00Z" },
    "limit": 50
  }'
```

### Response

```json
{
  "logs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2026-10-01T11:58:12.345Z",
      "level": "error",
      "message": "Payment processing failed for order #12345",
      "fields": { "user_id": "user123", "order_id": "12345", "k8s_pod_name": "checkout-7d9f8-abcde" },
      "clientIp": "192.168.1.100",
      "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
      "spanId": "00f067aa0ba902b7",
      "patternHash": "9c1e4f2a",
      "createdAt": "2026-10-01T11:58:12.401Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0,
  "executedIn": "45ms",
  "nextCursor": ""
}
```

| Field | Notes |
| --- | --- |
| `logs` | The page. `fields`, `clientIp`, `traceId`, `spanId` and `patternHash` are omitted when empty |
| `total` | Matches in the whole range, counted on the first page only. `-1` on later pages, with `trackTotal: false`, or when counting was skipped |
| `nextCursor` | Send it back as `cursor` for the next page. Empty or absent on the last page |
| `countSkipped` | `true` when counting would have read more than the scan budget. The page itself is complete |
| `partial`, `searchedThrough` | Set when the search hit its time limit before filling the page. It covered the range from its newest end back to `searchedThrough` (from the oldest end up to it when ascending) |

### Paging and counting

- Send each response's `nextCursor` as `cursor` to get the next page. Logs arriving in the
  meantime don't shift pages.
- The total is counted once, on the first page. Send `"trackTotal": false` to skip it.
- Every query is checked against the server's scan budget (`QUERY_MAX_SCAN_GB`, 100 GiB by
  default). A query that would read more is refused before reading anything, with HTTP 422 and
  `"code": "QUERY_TOO_LARGE"`. Narrow the time range or add filters.

### Streaming

`POST /logs/query/stream/{projectId}` takes the same request. It reads the range in growing time
windows, newest first (oldest first for `asc`), and answers with NDJSON, one frame per line:

| `type` | Contents |
| --- | --- |
| `rows` | `logs` that window added to the page, and the `window` (`from`, `to`) it covered |
| `progress` | A window that added no rows |
| `heartbeat` | Sent every 10 seconds while the search runs |
| `done` | `nextCursor`, `total`, `countSkipped`, `executedIn`, and `partial` / `searchedThrough` if set |
| `error` | `status` and `error` |

Access, validation and concurrency errors come back as plain JSON before any frame.

## Query structure

A query is a tree of two node types:

```typescript
interface QueryNode {
  type: "condition" | "logical";
  condition?: { field: string; operator: string; value: any }; // when type is "condition"
  logic?: { operator: "and" | "or" | "not"; children: QueryNode[] }; // when type is "logical"
}
```

| Logical operator | Children | Meaning |
| --- | --- | --- |
| `and` | 1 or more | All children must match |
| `or` | 1 or more | Any child may match |
| `not` | exactly 1 | Inverts its child |

### Fields

The operators below are the ones the [fields endpoint](#list-queryable-fields) offers for each
field, and what the Search page's query builder shows.

| Field | Type | Operators |
| --- | --- | --- |
| `message` | string | `equals`, `not_equals`, `contains`, `not_contains` |
| `level` | string, case-insensitive | `equals`, `not_equals`, `in`, `not_in` |
| `client_ip` | string | `equals`, `not_equals`, `contains`, `not_contains` |
| `timestamp` | timestamp | `equals`, `not_equals`, `greater_than`, `greater_or_equal`, `less_than`, `less_or_equal` |
| `trace_id`, `span_id` | string | `equals`, `not_equals`, `exists`, `not_exists` |
| `pattern_hash` | string, computed from the message | `equals`, `not_equals`, `in`, `not_in` |
| `service_name`, `service_version`, `k8s_namespace_name`, `k8s_pod_name`, `k8s_container_name`, `k8s_node_name`, `k8s_cluster_name`, `cloud_provider`, `cloud_region` | string (own columns) | `equals`, `not_equals`, `in`, `not_in`, `exists`, `not_exists` |
| Any other name | custom field, string | `equals`, `not_equals`, `contains`, `not_contains`, `exists`, `not_exists` |
| A [promoted](/docs/how-to/promoted-fields/) number field | number | adds `greater_than`, `greater_or_equal`, `less_than`, `less_or_equal` |

Notes on fields:

- **Names are normalized.** Attribute names are stored with dots and a `resource.` prefix turned
  into underscores (`resource.k8s.pod.name` is stored as `k8s_pod_name`). Queries may use either
  form. See [Attribute names](/docs/how-to/grafana-promql/#attribute-names).
- **Custom field names** can contain almost anything: dashes, mixed case, leading digits, dots,
  parentheses, `@` and spaces. Names can't be empty, and surrounding spaces are trimmed.
- **Levels** are stored lowercase and matched case-insensitively, so `ERROR` and `error` both
  work.
- **Comparisons** (`greater_than` and so on) on a custom field only match when the field is a
  promoted number field. On any other custom field they match nothing.
- **Patterns.** `pattern_hash` matches logs by message pattern. Get hashes from the patterns
  endpoint, or from a log's `patternHash`.
- Use `timeRange` for time filtering where you can, rather than `timestamp` conditions.

### Operators

| Operator | Value | Example |
| --- | --- | --- |
| `equals`, `not_equals` | a value | `{"field": "level", "operator": "equals", "value": "error"}` |
| `contains`, `not_contains` | text | `{"field": "message", "operator": "contains", "value": "payment"}` |
| `in`, `not_in` | an array, up to 100 items | `{"field": "level", "operator": "in", "value": ["error", "fatal"]}` |
| `greater_than`, `greater_or_equal`, `less_than`, `less_or_equal` | a number or time | `{"field": "duration_ms", "operator": "greater_than", "value": 500}` |
| `exists`, `not_exists` | `null` | `{"field": "user_id", "operator": "exists", "value": null}` |

### Examples

Errors from one IP prefix:

```json
{
  "type": "logical",
  "logic": {
    "operator": "and",
    "children": [
      { "type": "condition", "condition": { "field": "level", "operator": "equals", "value": "error" } },
      { "type": "condition", "condition": { "field": "client_ip", "operator": "contains", "value": "192.168." } }
    ]
  }
}
```

Everything except info logs:

```json
{
  "type": "logical",
  "logic": {
    "operator": "not",
    "children": [
      { "type": "condition", "condition": { "field": "level", "operator": "equals", "value": "info" } }
    ]
  }
}
```

Failed payments: messages containing "payment" at error or fatal level, either over an amount or
for one known user, excluding test traffic:

```json
{
  "type": "logical",
  "logic": {
    "operator": "and",
    "children": [
      { "type": "condition", "condition": { "field": "message", "operator": "contains", "value": "payment" } },
      { "type": "condition", "condition": { "field": "level", "operator": "in", "value": ["error", "fatal"] } },
      {
        "type": "logical",
        "logic": {
          "operator": "or",
          "children": [
            { "type": "condition", "condition": { "field": "amount", "operator": "greater_than", "value": 1000 } },
            { "type": "condition", "condition": { "field": "user_id", "operator": "equals", "value": "user123" } }
          ]
        }
      },
      {
        "type": "logical",
        "logic": {
          "operator": "not",
          "children": [
            { "type": "condition", "condition": { "field": "environment", "operator": "equals", "value": "test" } }
          ]
        }
      }
    ]
  }
}
```

The `amount` comparison only matches if `amount` is a promoted number field.

### Limits

| Limit | Value |
| --- | --- |
| Nesting depth | 10 levels |
| Nodes in one query | 50 |
| Children per logical node | 20 |
| Value length | 1,000 characters |
| Items in an `in` / `not_in` array | 100 |
| Logs per page | 1,000 |
| Concurrent queries per user | 3 |
| Data one query may read | `QUERY_MAX_SCAN_GB` (default 100 GiB) |

## Search-bar syntax

The Search page and the MCP `search_logs` tool accept a compact text syntax that compiles to the
same query tree:

| Syntax | Meaning |
| --- | --- |
| `timeout` | Message contains `timeout` |
| `"connection refused"` | Message contains the quoted phrase |
| `field:value` | Field contains value |
| `field:*` | Field exists |
| `field=value` | Field equals value |
| `field!=value` | Field doesn't equal value |
| `field>value`, `>=`, `<`, `<=` | Ranges, for promoted number fields and `timestamp` |
| `-term` or `NOT term` | Excludes matches |
| `a b` or `a AND b` | Both |
| `a OR b` | Either |
| `( ... )` | Grouping |

`NOT` binds tighter than `AND`, which binds tighter than `OR`. Matching is case-sensitive except
for `level`. Use a range for time, for example `timestamp>=2026-10-01T06:40:00Z`; `timestamp:`
isn't allowed.

```text
level:error service_name:payments-api "timeout"
level:error OR NOT (http_status_code>=500 AND -healthcheck)
```

## SQL mode

```text
POST /logs/query/execute-sql/{projectId}
```

Runs one `SELECT` statement against a `logs` table scoped to the project and time range. The
table's columns are `timestamp`, `level`, `message`, `client_ip`, `trace_id`, `span_id` and
`fields`.

```json
{
  "sql": "SELECT level, count(*) AS n FROM logs GROUP BY level ORDER BY n DESC",
  "timeRange": { "from": "2026-10-01T00:00:00Z", "to": "2026-10-02T00:00:00Z" }
}
```

`timeRange.to` is required here too. The response describes its own shape:

```json
{
  "columns": ["level", "n"],
  "rows": [["info", 18234], ["warn", 912], ["error", 57]],
  "rowCount": 3,
  "truncated": false,
  "executedInMs": "120ms"
}
```

Only a single `SELECT` is accepted, and statements that could reach outside the `logs` table
are refused. Results are capped at 10,000 rows (`truncated` is then `true`) and each statement at
15 seconds. SQL mode is for exploration, not bulk export.

## List queryable fields

```text
GET /logs/query/fields/{projectId}?query=user
```

```json
{
  "fields": [
    { "name": "message", "type": "string", "operations": ["equals", "not_equals", "contains", "not_contains"], "isCustom": false },
    { "name": "user_id", "type": "string", "operations": ["equals", "not_equals", "contains", "not_contains", "exists", "not_exists"], "isCustom": true }
  ]
}
```

`query` filters field names. Use each field's `operations` to decide which operators to offer.

## Show logs around a log

```text
POST /logs/query/context/{projectId}
```

```json
{
  "anchor": { "id": "550e8400-e29b-41d4-a716-446655440000", "timestamp": "2026-10-01T11:58:12.345Z" },
  "before": 20,
  "after": 20
}
```

Returns `anchor`, `before` and `after` (both oldest first), and the `scope` it used. By default
the context comes from the anchor's own workload: its cluster, namespace,
deployment/statefulset/daemonset/job, container and service, plus any fields in
`LOG_CONTEXT_DEFAULT_FIELDS`. Pass `scope` to choose the shared fields instead, for example
`["k8s_pod_name"]` or `["trace_id"]`, or `[]` for every log in the project. To load more of one
side, send `direction` (`before` or `after`) with the response's `beforeCursor` or `afterCursor`
as `cursor`.

## Errors

Errors return a JSON body with `error`, and for some, a machine-readable `code`:

```json
{ "error": "timeRange.to is required for pagination consistency to prevent issues when new logs are inserted", "code": "MISSING_TIME_RANGE_TO" }
```

| HTTP status | When |
| --- | --- |
| `400` | Invalid query structure, too complex, or missing `timeRange.to` (`MISSING_TIME_RANGE_TO`) |
| `401` | Missing or invalid session token |
| `403` | No access to the project |
| `408` | The query timed out |
| `422` | `QUERY_TOO_LARGE`: the query would read more than the scan budget |
| `429` | `TOO_MANY_CONCURRENT_QUERIES`: you already have 3 queries running |

## Related

- [Send your first logs](/docs/getting-started/send-first-logs/) covers ingestion.
- [Promoting fields](/docs/how-to/promoted-fields/) enables number ranges and faster filters.
- [Configuration](/docs/reference/configuration/#queries-and-executors) lists the query settings.
