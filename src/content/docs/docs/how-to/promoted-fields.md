---
title: Promoting fields
description: Copy up to 12 log fields per project into typed columns for faster filters, group-bys and number ranges.
---
<!-- Source: obzly-dev/README.md, obzly-dev/backend/internal/features/projects/services/promoted_field_service.go, obzly-dev/backend/internal/features/projects/models/promoted_field.go, obzly-dev/backend/internal/features/projects/controllers/project_controller.go, obzly-dev/backend/internal/features/logs/querying/validator.go, obzly-dev/frontend/src/features/projects/ui/PromotedFieldsComponent.tsx -->

Custom log fields are stored together in one JSON column, so filtering on one means parsing every
log's fields. **Promoting** a field copies it into its own typed column at ingest. Searches,
filters and group-bys on that field then skip the JSON parsing, and number fields gain range
filters (`>`, `>=`, `<`, `<=`).

Each project can promote up to **12 fields**: **8 text** and **4 number** fields.

## When to promote a field

Promote fields you filter or group by often, such as `http_status_code`, `duration_ms`,
`customer_id` or `tenant`. You don't need to promote these, because they already have their own
columns:

`id`, `project_id`, `timestamp`, `level`, `message`, `client_ip`, `trace_id`, `span_id`,
`service_name`, `service_version`, `k8s_namespace_name`, `k8s_pod_name`, `k8s_container_name`,
`k8s_node_name`, `k8s_cluster_name`, `cloud_provider`, `cloud_region`, `fields`

## Promote a field in the UI

You need to be a project owner or admin. Any member can see the list.

1. Open the project's **Project settings** and find **Promoted log fields**.
2. Enter the field name, for example `http.status_code`.
3. Choose **Text** or **Number**.
4. Select **Promote**.

Field names are normalized the same way as at ingest, so `http.status_code` is promoted as
`http_status_code` (see [Attribute names](/docs/how-to/grafana-promql/#attribute-names)).

The promotion applies to logs received from then on, within about 30 seconds. Logs stored before
it keep being read from the fields JSON, so queries over older data still work, just without the
speed-up.

:::caution[Slots are not reused]
Removing a promotion frees the field but not its column: each of the 12 columns is used once per
project, so a column always means one field in every file. Promoting the same field again later
takes a new column. Choose promotions deliberately.
:::

To stop promoting a field, use the delete button next to it. The field is read from the fields
JSON again.

## Query promoted fields

Promoted fields are queried by name, exactly like any other field. Nothing changes in your
searches except speed, and range filters on number fields.

In the search bar:

```text
duration_ms>=250 service_name:checkout
http_status_code>=500 http_status_code<600
```

In the [Log query API](/docs/reference/log-query-api/), use the comparison operators on a promoted
number field:

```json
{
  "type": "condition",
  "condition": { "field": "duration_ms", "operator": "greater_or_equal", "value": 250 }
}
```

| Field | Operators |
| --- | --- |
| Promoted text field, and any other custom field | `equals`, `not_equals`, `contains`, `not_contains`, `exists`, `not_exists` |
| Promoted number field | The above plus `greater_than`, `greater_or_equal`, `less_than`, `less_or_equal` |

:::note
Comparison operators on a custom field that is **not** a promoted number field are accepted but
match nothing. Promote the field as a number to filter it by range.
:::

## API

The settings page uses these routes, under `/api/v1` with a user session token (see
[Authentication](/docs/reference/log-query-api/#authentication)):

| Method and path | Purpose | Who |
| --- | --- | --- |
| `GET /projects/{id}/promoted-fields` | List active promotions | Any member |
| `POST /projects/{id}/promoted-fields` | Promote a field | Owners and admins |
| `DELETE /projects/{id}/promoted-fields/{field}` | Stop promoting a field | Owners and admins |

Promote a field:

```bash
curl -X POST "https://obzly.harborline.example/api/v1/projects/YOUR_PROJECT_ID/promoted-fields" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"field": "duration_ms", "type": "number"}'
```

`type` is `string` or `number`. The response is the promotion:

```json
{
  "projectId": "YOUR_PROJECT_ID",
  "slot": "n1",
  "field": "duration_ms",
  "createdAt": "2026-10-01T12:00:00Z"
}
```

Text promotions use slots `s1` to `s8` and number promotions `n1` to `n4`. A request fails with
`400` when the field is reserved, already promoted, or no column of that type is left, and with
`403` when you can't manage the project. Promotions and removals are written to the project's
audit log.
