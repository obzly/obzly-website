---
title: Exploring logs
description: Layouts and view settings on the Logs page, charts of any search or SQL result, heatmaps, comparisons, spike explanations, pattern trends, volume and sampling, the health map and themes.
---

<!-- Source: obzly/docs/releases/v1.2.0.md, obzly/frontend/src/features/query/lib/logsViews.ts, obzly/frontend/src/features/query/lib/logsViewSettings.ts, obzly/frontend/src/features/query/lib/logsChart.ts, obzly/frontend/src/features/query/lib/logInsights.ts, obzly/frontend/src/features/query/ui/QueryComponent.tsx, obzly/frontend/src/features/query/ui/QueryResultsComponent.tsx, obzly/frontend/src/features/query/ui/LogHistogramComponent.tsx, obzly/frontend/src/features/query/ui/LogExplainPanelComponent.tsx, obzly/frontend/src/features/query/ui/LogPatternsTabComponent.tsx, obzly/frontend/src/features/query/ui/LogVolumeTabComponent.tsx, obzly/frontend/src/features/query/ui/SamplingRuleModalComponent.tsx, obzly/frontend/src/features/query/ui/LogHealthMapTabComponent.tsx, obzly/frontend/src/features/query/ui/LogContextPanelComponent.tsx, obzly/frontend/src/features/query/ui/LogDetailPanelComponent.tsx, obzly/frontend/src/features/query/ui/charts/LogsChartViewComponent.tsx, obzly/frontend/src/features/query/ui/charts/LogsHeatmapComponent.tsx, obzly/frontend/src/features/query/ui/charts/LogsCompareComponent.tsx, obzly/frontend/src/features/query/ui/charts/SQLResultsChartComponent.tsx, obzly/frontend/src/features/query/ui/charts/SaveToDashboardComponent.tsx, obzly/backend/internal/features/projects/models/retention_policy.go, obzly/frontend/src/widgets/main/ui/ThemeMenuComponent.tsx, obzly/frontend/src/features/settings/ui/AppearanceSettingsComponent.tsx, obzly/frontend/src/shared/theme/themes.ts, obzly/frontend/src/shared/theme/themePolicy.ts, obzly/frontend/src/shared/theme/themeStorage.ts -->

The **Logs** page has five tabs:

- **Search:** matching lines, a chart of them, and the tools below.
- **Patterns:** message patterns and how they change ([Pattern trends](#pattern-trends)).
- **Volume & noise:** what fills your storage and how to sample it
  ([Volume & noise](#volume--noise)).
- **Health map:** error share across workloads, hosts or services ([Health map](#health-map)).
- **Web analytics:** a traffic report from access logs (see
  [Web analytics](/docs/how-to/web-analytics/)).

For the search and SQL syntax, see the [Log query API](/docs/reference/log-query-api/).

## Layouts and view settings

The **Lines** card header has a **Layout** switch:

| Layout | What you get |
| --- | --- |
| **Split** (default) | Fields and chart beside the lines; details open beside them when you click a line |
| **Wide** | Lines get the width; details open beside them only when you click a line |
| **Focus** | Only the lines, in compact rows; details open inside the clicked row |

Next to it are **Wrap** (or press <kbd>W</kbd>), the columns picker, export (CSV or JSON of the
loaded rows) and the gear button, **View settings**:

- **Display:** **Timezone**, and **Message length**, the characters shown per message while
  **Wrap** is off (1 to 1000).
- **Layout:** **Panels** (**Fields**, **Chart**), **Details** (**Side**, **Below**, **In row**),
  **Details width** (**S**, **M**, **L**), **Rows** (**Comfortable**, **Compact**) and **Text size**
  (12, 13, 14).

When the settings match none of the three layouts, the card header shows **Custom layout**.
Settings are saved in this browser. **Reset** returns to the Split layout and the default message length.

## Chart a search or SQL result

Every search can be drawn as a chart. In the **Lines** card header, switch **Show as** from
**Lines** to **Chart**. The chart covers the search and range you ran; it isn't available during
live tail.

- **Chart:** **Time series**, **Top values**, **Table**, **Donut**, **Heatmap** or **Compare**.
- **Measure:** **Count lines**, **Distinct** values of a field, or the **Avg** or **p95** of a
  number field.
- **Split by:** `service_name`, `level`, `k8s_namespace_name`, `k8s_pod_name`, or any other field.
  Top values, Table and Donut need a field to split by.
- **Top:** the 5 or 10 largest groups.

**Table** adds each value's share, its error lines (level error or fatal) and when it first logged
in the range.

### Save to a dashboard

Select **Save to dashboard**, give the panel a title, and pick a dashboard or **New dashboard…**.
The panel keeps the search, split and measure, and follows the dashboard's time range. Time series,
Top values, Table and Donut can be saved; heatmaps and comparisons can't.

### Create an alert

**Create alert** opens **Alerts › New rule** with the search filled in, grouped by the split field,
over a 5-minute window. Log alerts count lines, so when the chart shows a distinct count, average
or p95, the rule counts the matching lines instead. Set the threshold and channels there (see
[Create a rule](/docs/how-to/alerts/#3-create-a-rule)).

**Copy as SQL** copies the query behind the chart, to run or edit in SQL mode.

### SQL results

SQL results have the same **Lines** / **Chart** switch. The chart follows the shape of the result:

- A time column and numbers draw a **Time series**.
- A label and a number draw **Top values**, or a **Donut** when no number is negative.

Top values and donuts show up to 20 rows. For example, this query draws a time series of errors
per service:

```sql
SELECT date_trunc('minute', timestamp) AS minute, service_name, count(*) AS errors
FROM logs
WHERE level = 'error'
GROUP BY minute, service_name
ORDER BY minute
```

## Time heatmaps

Choose **Heatmap** in the chart. It has two kinds:

- **When (weekday × hour):** matching lines by weekday and hour, in your display time zone, with a
  note on the busiest hour. A range under 7 days leaves cells empty; select **Show the last 7 days**
  to widen it. Click a cell to narrow the search to the latest such hour in the range.
- **Distribution over time:** how a number field (a duration, for example) spreads over time, in
  log-scale bands; darker is more lines. It points out a new band appearing next to the usual one,
  which an average would show only as a mild rise. Click a cell to narrow the search to that time
  slot, and to that band too when the field is a
  [promoted number field](/docs/how-to/promoted-fields/).

## Compare two ranges

Choose **Compare** in the chart to overlay the search against an earlier window of the same
length. **Compare with**:

| Option | Earlier window |
| --- | --- |
| **Previous period** | The same length just before |
| **Yesterday** | The same time yesterday |
| **Last week** | The same time last week |
| **Around a rollout** | Before and after a Kubernetes rollout in the range (when a Deployment's new ReplicaSet first logged); pick another rollout from the list |
| **Custom…** | A window of the same length starting when you pick |

Below the chart:

- **What changed:** the groups with the largest change, split by `service_name`, `level`,
  `k8s_pod_name` or another field. Changes under 20 lines are greyed out.
- **Patterns that changed:** message patterns that are new, spiking or dropping against the
  earlier window. Click one to search it.

## Explain this spike

On the **Search** tab, drag across the chart above the lines to pick a range (a click on a bar
still zooms). Then select **Explain this spike**, or **Zoom to range** / **Clear selection**. The
chart must be shown and live tail off.

The explanation compares the range with a baseline of the same length:

- **Baseline:** **Just before**, **Yesterday** or **Last week**.
- **Which lines:** **Errors and warnings** (the default) or **All lines**.

It lists the values whose share grew most, among each service, namespace, container, pod,
ReplicaSet and level, using the per-minute counts. Values seen fewer than 20 times in the range are
left out. Use **+** or **−** next to a value to show only, or hide, lines with it. It also lists
patterns that are new, spiking or dropping, and the Kubernetes rollouts and alerts in the range.

## Pattern trends

The **Patterns** tab groups messages by their shape (pattern) over **1h**, **3h** (the default),
**24h** or **7d**. When the search bar holds a search, the tab covers only matching lines.

- **Patterns seen**, **New** (not seen in the previous 7 days), **Spiking** (×2 or more against the
  same time yesterday) and **Dropped** (−50% or more, possibly a broken flow). Click a tile to list
  only those.
- **What makes up the volume:** the top 6 patterns per bucket, stacked; the rest is "Other".
- **Patterns:** each pattern with its trend, count, share and first seen. Use **Find a pattern**
  and **Show** to filter.

Select a pattern to see a sample line, the services, pods and versions it comes from, and when it
was first seen. Then:

- **Show these logs** or **Hide this pattern** on the **Search** tab.
- **Alert when it appears:** creates an alert rule that fires when the pattern logs in a 5-minute
  window. Pick its channels in **Alerts › Rules**.
- **Sampling…:** add a sampling rule for the pattern (see below). Error lines are never sampled.

## Volume & noise

The **Volume & noise** tab shows where your log volume comes from:

- **Lines today** (against yesterday at the same time), **Stored today**, **Stored in total** and
  **Could save**.
- **Lines per day by service** (or **Bytes**) over the last 14 days, in UTC.
- **By level:** share of lines over the last 7 days.
- **Noisiest patterns:** the biggest patterns by lines over the last 7 days, each with a
  suggestion. Nothing changes until you add a rule.

Suggestions go by level: **debug** and **trace** lines are dropped, **info** and other levels are
sampled to 10%, warnings to 25%. Error lines (**error**, **critical**, **fatal**) are never
suggested. Saves are estimated from the project's average stored line size.

### Add a pattern sampling rule

1. Select **Apply rule…** next to a pattern, or **Sampling…** on the **Patterns** tab.
2. Choose how much to **Keep**: **Drop**, **10%**, **25%** or **50%**. The dialog shows the lines
   kept per day and the storage saved per month.
3. Select **Add rule**.

The rule matches that pattern for its service and level. It is added first in **Project settings
› Retention & sampling › Log sampling rules**, so it wins over broader rules (the first matching
rule applies). A project holds up to 50 rules; adding them needs a project owner or admin.

Sampling happens at ingest and applies to new lines only. Sampled-out lines are not stored, so
searches and charts count only the kept lines.

## Health map

The **Health map** tab shows log volume and error share as tiles, over **1h**, **6h**, **24h** (the
default) or **7d**, from the per-minute counts. When the search bar holds a search, it covers only
matching lines.

- **Group by:** **Namespace → workload**, **Host → service** or **Service**. Grouping by host reads
  the raw logs, so a long range can be refused as too large.
- **Colour by:** **Error share**, **Warn + error** or **Change vs yesterday**.

Tile size is log volume. Up to 10 groups with 10 tiles each are shown. Click a tile for its error
share, change against yesterday and top error patterns, then **Open logs**,
**Open in Infrastructure** or **Explain errors** (the same explanation as
[Explain this spike](#explain-this-spike)).

## Logs around a line

To see what led up to a log line, hover over it and select the **Show logs around this one** icon,
or open the line and select **Show logs around**. The **Logs around** panel lists the logs just
before and after it:

- By default it shows the same workload. **+ Field** narrows it by one of the line's fields (such
  as `k8s_pod_name` or `trace_id`), or switches to **All project logs**.
- Choose the window (**±15 min**, **±1 hour**, **±6 hours**, **±24 hours**) and the rows on each
  side (25 to 1000).
- **Load earlier** and **Load later** page further. Pauses of a minute or more are marked, for
  example `+3m 12s`.
- **Find** highlights text in these logs; press <kbd>Enter</kbd> or <kbd>Shift</kbd>+<kbd>Enter</kbd>
  to move between matches.
- **Open as search** continues on the **Search** tab with the same scope and window.

The panel can open in a large window instead of the side panel.

## Themes

The theme button in the top bar opens a menu:

- **Light**, **Dark** or **System**, which follows your computer's setting with one light and one
  dark theme.
- Six themes:

  | Theme | Look |
  | --- | --- |
  | **Emerald light** (default light) | The standard light look |
  | **Soft light** | Pale blue-grey, indigo accent |
  | **Semi-dark** | Dark rail and top bar, light pages |
  | **Emerald dark** (default dark) | The standard dark look |
  | **Midnight** | Deep navy, blue accent |
  | **Black** | True black for wall screens and OLED |

- **Colour-blind safe chart colours** switches chart series to a colour-blind safe palette. Status
  colours (healthy, warning, critical) are the same in every theme.

The choice applies instantly and is saved to your profile, so it follows you to any browser.
**Reset to default** returns to your admin's defaults.

### Admin defaults

Admins set the defaults in **Obzly settings › General › Appearance**: the **Default mode**,
**Default light theme** and **Default dark theme**. Turning off **Users can choose their own
theme** gives everyone the default themes; users still pick the mode and colour-blind charts.

### Wall screens

Add `?theme=` with a theme ID to a link to force that theme on one screen, for example
`https://obzly.harborline.example/?theme=black`. The IDs are `emerald-light`, `soft-light`,
`semi-dark`, `emerald-dark`, `midnight` and `black`. A theme from a link isn't saved to anyone's
profile; **Use my theme** in the theme menu goes back to your own. The **Wall screens and kiosks**
section in Appearance has a link to copy.
