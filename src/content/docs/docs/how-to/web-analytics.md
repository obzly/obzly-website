---
title: Web analytics
description: A GoAccess-style report of visitors, URLs, 404s, referrers, browsers and countries, built from the access logs your web servers already send.
---

<!-- Source: obzly/docs/releases/v1.2.0.md, obzly/docs/configuration.md, obzly/backend/internal/features/webanalytics/schema.go, obzly/backend/internal/features/webanalytics/service.go, obzly/backend/internal/features/webanalytics/builder.go, obzly/backend/internal/features/webanalytics/rollup.go, obzly/backend/internal/features/webanalytics/classify.go, obzly/backend/internal/features/webanalytics/geoip.go, obzly/backend/internal/features/webanalytics/live.go, obzly/backend/internal/features/webanalytics/models.go, obzly/backend/internal/features/webanalytics/repository.go, obzly/backend/internal/features/webanalytics/controller.go, obzly/frontend/src/features/webAnalytics/ui/WebAnalyticsComponent.tsx, obzly/frontend/src/features/webAnalytics/ui/WebAnalyticsSettingsDrawer.tsx, obzly/frontend/src/features/webAnalytics/ui/SourcePicker.tsx, obzly/frontend/src/features/webAnalytics/ui/charts.tsx, obzly/frontend/src/features/webAnalytics/lib/format.ts -->

**Web analytics** turns the access logs a project already receives into a traffic report:
requests, unique visitors, status codes, the most requested URLs, 404s, referring sites,
browsers, operating systems, devices and countries. Nothing extra runs on your web servers, and
no tracking script is added to your pages.

Open a project's **Logs** page and select the **Web analytics** tab.

## What logs it reads

Any log line with a **status code** and a **method or path** counts as an access log. Obzly finds
these lines on its own, in three forms:

- **Fields** on the log, under the names each web server or collector config writes them, or the
  OpenTelemetry names (`http_response_status_code`, `url_path`, ...).
- **A JSON message body** with the same names.
- **A plain-text line** in the Apache/Nginx common or combined format, including the request
  length and time that ingress-nginx appends. Kubernetes ingress logs in the combined format are
  recognised as they are.

The configs Obzly generates for web servers under **Settings › Data sources** (see
[Web servers](/docs/reference/data-sources/#web-servers)) send logs it can read. The report labels
each source with the format it detected:

| Format | Typical sender |
| --- | --- |
| `combined`, `common` | Nginx or Apache logs parsed into fields |
| `combined (text)`, `common (text)` | Raw Nginx/Apache lines, for example Kubernetes ingress-nginx |
| `JSON (Envoy)` | Envoy JSON access logs |
| `JSON (Traefik)` | Traefik JSON access logs |
| `W3C (IIS)` | IIS W3C logs |
| `OTel names` | Logs that use the OpenTelemetry names, for example from your own code over OTLP |
| `JSON in message` | A JSON body that holds the fields |

### Fields

Only the status and the method or path are required. The other fields fill in more of the report;
when a source doesn't log one, the panels that need it say so.

| Field | Used for | Names read, first found wins |
| --- | --- | --- |
| Client IP | Unique visitors, Visitors by IP, Countries | `client_address`, `remote_addr`, `downstream_remote_address`, `ClientHost`, `ClientAddr`, `c_ip`, `remote_ip`, `http_client_ip` |
| Method | Methods | `http_request_method`, `method`, `RequestMethod`, `cs_method`, `request_method`, `http_method` |
| Path | Requested URLs, Not found, Static files | `url_path`, `path`, `RequestPath`, `cs_uri_stem`, `request_path`, `request_uri`, `http_target` |
| Protocol | Protocols | `network_protocol_version`, `protocol`, `RequestProtocol`, `cs_version`, `http_version`, `http_flavor` |
| Status | Every panel | `http_response_status_code`, `status`, `response_code`, `DownstreamStatus`, `sc_status`, `status_code`, `http_status_code`, `http_status` |
| Bytes | Bandwidth | `http_response_body_size`, `body_bytes_sent`, `bytes_sent`, `DownstreamContentSize`, `sc_bytes`, `response_size`, `bytes` |
| Referrer | Referring sites, broken-link tags | `http_request_header_referer`, `referer`, `referrer`, `request_Referer`, `cs_Referer_`, `http_referer` |
| User agent | Browsers, Operating systems, Devices, crawler detection | `user_agent_original`, `user_agent`, `request_User_Agent`, `cs_user_agent`, `cs_User_Agent_`, `http_user_agent` |
| Host | Virtual hosts | `server_address`, `http_request_header_host`, `url_domain`, `host`, `authority`, `RequestHost`, `cs_host`, `cs_Host_`, `vhost`, `server_name` |
| TLS | TLS | `tls_protocol_version`, `tls_version`, `ssl_protocol`, `TLSVersion`, `downstream_tls_version` |
| Duration | Response time p95 | `http_server_request_duration` (seconds), `duration_ms`, `duration` (ms), `Duration` (ns), `time_taken` (ms), `request_time` (seconds), `request_duration_ms` |

The client IP is the first address of an `X-Forwarded-For` style list, without its port.

Common gaps and their fixes, as the report suggests them:

- Apache's **common** format has no referrer or user agent: switch it to **combined**.
- Response time: add `$request_time` (Nginx) or `%D` (Apache) to the log format.
- TLS: add `$ssl_protocol` (Nginx) or `%{SSL_PROTOCOL}x` (Apache).
- Bytes: add `$body_bytes_sent` (Nginx) or `%B` (Apache).

## Pick the sources

A project can hold several web servers. Each one is a **source**, grouped by the first of these
that its logs carry:

1. An `obzly_source` attribute, if the collector sets it.
2. The Kubernetes namespace and workload (Deployment, StatefulSet, DaemonSet, CronJob or Job),
   plus the cluster.
3. The service name (and namespace) plus the host.
4. The cluster.
5. The host.

Use **Data sources** in the report header to choose which sources the report is built from. Each
source shows its kind (Nginx, Apache HTTP Server, Envoy, Traefik, IIS, ...), format, hosts, its
share of requests, what identifies it, and which fields it lacks. Select **Build report** to apply.
The **Host** menu narrows the report to one virtual host. Sources not seen for 30 days leave the
list.

## Read the report

Pick a range with **15m**, **1h**, **24h** (the default), **7d** or **30d**.

- **Totals:** **Requests**, **Unique visitors**, **Failed requests** (4xx and 5xx),
  **Not found (404)**, **Bandwidth** and **Response time p95**, each with its change against the
  previous period of the same length.
- **Requests over time** and **Status codes**.
- **Time distribution:** requests by weekday and hour over the last 7 days, in your time zone.
- **Requested URLs:** pages and API calls, with static files left out. IDs in paths (numbers,
  UUIDs, long hex strings) are grouped as `:id`, so `/catalog/42` and `/catalog/43` count together.
- **Not found (404):** paths that vulnerability scanners probe (`wp-login`, `/.env`, `.php`, ...)
  are tagged **scanner**; 404s that arrived with a referrer are tagged **broken link**.
- **Referring sites:** where visitors came from, with your own hosts left out and search engines
  tagged. Direct visits show as `(direct or none)`.
- **Visitors by IP**, **Browsers**, **Operating systems**, **Devices** and **Countries**.
- **Static files:** requests whose path ends in one of the static file extensions (see
  [Settings](#settings)).
- **Virtual hosts**, **Methods and protocols** and **TLS**.

**Unique visitors** counts distinct client address plus user agent. Known crawlers are left out of
visitors and the top lists by default, but still count in **Requests**.

Select a total, a status code or a row in most lists to open the matching requests on the
**Search** tab. Use the export button for **CSV (every panel)** or **Print or save as PDF**.

## How the report is built

Reading days of raw access logs for every view would be slow, so Web analytics keeps small
**hourly rollups**:

- A worker summarises each closed hour a few minutes after it ends: counts by status, path,
  referrer, browser, country and so on, per source and host. Each list keeps the hour's busiest
  rows (100 for most lists).
- The **current hour**, and any recent hour not summarised yet, is read from the raw logs when you
  open the report. With **Live** on, the current hour refreshes every 30 seconds. Viewers share
  the same live read for 30 seconds.
- A range merges the stored hours with the live part, so 7 or 30 days load about as fast as one
  hour. Past a few days, whole days are read instead of hours.
- Ranges under 2 hours are read entirely from the raw logs.
- Unique visitors can't be added up across hours, so each hour keeps a small mergeable sketch
  (HyperLogLog). Any range counts a visitor once, to within about 2%.

Select **How is this built?** in the report to see which hours came from rollups and which were
read live.

Rollups start the first time someone opens Web analytics for a project. The worker then backfills
the last 7 days, newest hour first, a few hours at a time. Until it catches up, the report says how
many hours in the range aren't summarised yet and leaves them out. Hours older than 7 days before
the first visit are not backfilled.

## Privacy and client IPs

By default, client IPs are **truncated** before an hour is summarised: the last octet of an IPv4
address and the last 80 bits of an IPv6 address are dropped (`/24` and `/48`). Truncation can't be
undone, and countries still work. **Visitors by IP** then lists address ranges, for example
`198.51.100.0/24`.

A project owner or admin can change **Visitor IPs** in the settings:

| Mode | What is kept |
| --- | --- |
| **Truncate** (default) | `/24` (IPv4) or `/48` (IPv6) ranges |
| **Hash** | A salted hash per project. Unique visitors still work, and the same visitor keeps the same hash, but you can't see the address |
| **Store full** | The full address. Full IPs are personal data under GDPR; keep them only with a reason and a short retention |

Truncation is the default because a hash with a stored salt can be reversed by trying every IPv4
address.

The raw access logs themselves are not changed: the setting applies to the rollups only.

## Countries

Countries are looked up from each visitor's address range when the hour is summarised. Obzly
bundles the **DB-IP Lite** country database, licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); as the licence requires, the report
shows "IP geolocation by DB-IP". Addresses the database doesn't place (private ranges, for example)
show as unknown.

To use another database, such as your own MaxMind GeoLite2-Country file, point
`WEB_ANALYTICS_GEOIP_DB` at any GeoIP2-Country compatible `.mmdb` file (see
[Configuration](/docs/reference/configuration/#web-analytics)). A missing or unreadable file only
leaves the **Countries** panel empty; the settings show whether a database is loaded.

## Settings

Open the gear button (**Web analytics settings**) in the report header. Anyone who can read the
project can view the settings; only project owners and admins can change them. Every change is written to the
project's audit log.

- **Sources and field mapping:** each source's format and which fields were found. Rename a source
  (up to 120 characters), or merge it into another to count them as one. **Field names read for
  each field** lists every name above.
- **Visitor IPs:** **Store full**, **Truncate** or **Hash** (see [Privacy and client IPs](#privacy-and-client-ips)).
- **Keep rollups:** **Like the logs** (the default, the project's log retention), **400 days** or
  **90 days**. When the logs are kept forever, rollups are kept for 400 days.
- **Bots and crawlers:** **Leave crawlers out** of visitors and top lists (on by default).
  Crawlers are recognised by their user agent (bots, crawlers, monitors, scanners and scripts such
  as `curl` or `python-requests`), and an empty user agent counts as one.
- **Static files:** the extensions counted as **Static files** rather than pages. The default is
  `css js mjs map png jpg jpeg gif svg webp avif ico woff woff2 ttf eot otf mp4 webm mp3 pdf txt xml json`.
- **Country lookup:** **DB-IP Lite** or **Off**.
- **Rollups:** when the last hour was built, how long it took, and how much the project's rollups
  take.

Changes to **Visitor IPs**, **Bots and crawlers** and **Static files** apply to hours summarised
afterwards; older hours keep how they were built.

## Limits

- A report covers at most 400 days. The range buttons go up to 30 days.
- Each top list in the report shows up to 50 rows. Each hour keeps up to 100 rows per list (60
  status codes, 50 browsers and operating systems, 250 countries), and each day up to 200.
- Up to 10 virtual hosts are kept apart per source; the rest count as `(other hosts)`, since
  scanners send any Host header.
- Change against the previous period is shown only when at least 90% of that period's hours are
  summarised.

## API

The report uses these routes, under `/api/v1` with a user session token (see
[Authentication](/docs/reference/log-query-api/#authentication)):

| Method and path | Purpose | Who |
| --- | --- | --- |
| `GET /projects/{id}/web-analytics/report` | The report for `from` and `to` (RFC 3339, default the last 24 hours), optionally `sources` (comma-separated keys) and `host` | Any member |
| `GET /projects/{id}/web-analytics/settings` | Settings, sources and rollup status | Any member |
| `PUT /projects/{id}/web-analytics/settings` | Change settings, rename or merge sources | Owners and admins |

```bash
curl "https://obzly.harborline.example/api/v1/projects/YOUR_PROJECT_ID/web-analytics/report?from=2026-11-10T00:00:00Z&to=2026-11-17T00:00:00Z" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

Set the IP mode to hashing:

```bash
curl -X PUT "https://obzly.harborline.example/api/v1/projects/YOUR_PROJECT_ID/web-analytics/settings" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ipMode": "hash"}'
```

`ipMode` is `truncate`, `hash` or `full`; `retentionDays` is 0 (like the logs) to 3650. The
[MCP server](/docs/how-to/mcp/) also offers the report as the `web_analytics_report` tool.
