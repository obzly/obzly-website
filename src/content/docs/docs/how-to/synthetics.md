---
title: Synthetic monitoring
description: Test APIs, certificates, ports, DNS and hosts from your own locations on a schedule, and alert when they fail.
---

<!-- Source: obzly-dev/docs/SYNTHETICS.md, obzly-dev/docs/examples/synthetics-checks.yaml, obzly-dev/README.md -->

Synthetic monitoring runs **monitors** (checks) against your APIs and endpoints from several
locations on a schedule. Each run records whether the target was reachable, how long each phase of
the request took, whether every assertion passed, and the state of its TLS certificate. Results are
shown per monitor, both across locations and run by run.

:::note[Synthetics needs a control plane]
Monitors are defined on the [control plane](/docs/deploy/multi-site/), and their results are
stored in an ordinary project on a **Site**. The control plane stores no results. To try it on one
machine, use the Compose file in
[Try it locally](/docs/deploy/multi-site/#try-it-locally)
([`docker-compose.multisite.yml.example`](https://github.com/obzly/obzly/blob/main/deploy/docker/docker-compose.multisite.yml.example)),
which runs a control plane and one Site side by side.
:::

## How it works

- **Control plane:** holds the monitor definitions, the probe groups and their tokens, and the
  destinations. It serves each probe its configuration and shows the views. It never schedules
  runs or stores results.
- **Probe** (`obzly-probe`): a small separate binary, container or Helm release. It pulls its
  configuration from the control plane, runs the monitors on its own schedule, and sends the
  results as OTLP **straight to the destination Site**.
- **Site:** stores the results as metrics and one log line per run in a project. Dashboards,
  PromQL, retention and [alert rules](/docs/how-to/alerts/) work on them like on any other data.

The load is small: about one configuration poll per probe every 180 seconds (almost always
answered "not modified"), plus small OTLP batches to the Site.

Central admins manage Synthetics (destinations, probe groups and monitors); other users of the
control plane can view it.

## 1. Add a destination

A **destination** is the Site project that stores the results. Open **Synthetics → Destinations →
Add destination** and set:

| Field | What to enter |
| --- | --- |
| Name | How monitors and YAML files refer to it, for example `synthetics` |
| Site | The Site that stores the results |
| Project | The project that receives them. A project of its own (for example *Synthetics*) keeps them apart |
| OTLP URL | The Site's address **as the probes reach it**, for example `https://site-north.harborline.example`. `/v1/metrics` and `/v1/logs` are added |
| Ingest key | **Create a key on the Site for the probes**, or **paste an existing key** |

The key is stored encrypted and sent only to probes, which use it to send to the Site directly.
Ingest never goes through the control plane.

## 2. Add a probe group

A **probe group** is one location (for example `edge-north` or `office-pier`) with one token. Run
as many instances with that token as you like: each monitor runs on one live instance, and moves to
another within about a minute if that instance stops.

Open **Synthetics → Probe groups → Add probe group**, give it a name and a location, and copy the
install snippet with the token, which is shown once. See [Synthetics probe](/docs/deploy/probe/)
for installing on a Linux VM, with Docker or with Helm.

## 3. Create a monitor

Open **Synthetics → Monitors → New monitor**.

### Check types

| Type | What it checks |
| --- | --- |
| **HTTP/API** | A request with method (`GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`), URL, headers, body and follow redirects on or off, then assertions on the response. HTTPS requests also report the certificate |
| **TLS certificate** | Any TLS endpoint as `host:port`: days to expiry (warning and failure thresholds), chain valid, host name matches, minimum protocol (`TLS1.0` to `TLS1.3`) |
| **TCP** | The port accepts a connection within the timeout (`host:port`) |
| **DNS** | The name resolves, optionally for a record type (`A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`), against a given resolver, and to one of an expected set of answers |
| **ICMP (ping)** | Packet loss and round-trip time, with an allowed loss and a warning threshold |

For internal services with a self-signed, expired or untrusted certificate, turn **TLS
verification** off on the monitor (`tls.verify: false` in YAML). The run still succeeds and still
reports the expiry and issuer, and is labelled `tls_verified=false` so dashboards show which
monitors skip verification.

:::note[ICMP on the probe]
ICMP needs `CAP_NET_RAW` or unprivileged ping sockets (`net.ipv4.ping_group_range`) on the probe.
Without either, the run reports that ICMP isn't available instead of failing silently. See
[Synthetics probe](/docs/deploy/probe/).
:::

### Assertions (HTTP)

| Assertion | Operators | Example |
| --- | --- | --- |
| Status code | equals, in | `status: 200`, `status: {in: [200, 201]}` |
| Response time (ms) | below | `response_time_ms: {below: 800}` |
| Header | equals, contains, exists | `header: {name: Content-Type, contains: application/json}` |
| JSON path | equals, contains, exists | `json: {path: $.status, equals: ok}` (paths like `$.a.b` or `$.items[0].id`) |
| Body | contains, matches (regular expression) | `body: {contains: Sign in}` |

Mark an assertion `severity: warn` to make its failure amber (Degraded) instead of red.

### Monitor settings

| Setting | Default | Notes |
| --- | --- | --- |
| Interval | 180 s | At least 30 s |
| Timeout | 10 s | 1 to 60 s, and no longer than the interval |
| Red when down from | 0 | How many failing locations make the monitor Down. `0` means half its locations (rounded up), at least 1 |
| Locations | empty | The probe locations it runs from. Empty means every location |
| Results go to | | A destination |
| Folder | empty | A path such as `Payments/EU` (nest with `/`, up to 5 levels). Empty means the top level |
| Depends on | none | Parent monitors; see [Dependencies](#dependencies-and-muted-alerts) |
| Alerts | none | Notification channels; see [Alerts per monitor](#alerts-per-monitor) |
| Secrets | | Values for `${env:NAME}` placeholders; see [Secrets](#secrets) |

### Test, Save, Test & save

- **Test** runs the definition once, saved or not, from one or more locations (by default every
  location with a probe online) and shows the result within seconds: pass or fail per assertion,
  status, headers and a response snippet, a timing waterfall (DNS, connect, TLS, time to first
  byte, transfer), certificate details and resolved IPs. Nothing is sent to the Site. For a target
  no probe can reach, tick **From the control plane**; it can't reach loopback or cloud metadata
  addresses.
- **Save** stores the monitor and returns to the list.
- **Test & save** saves only if the test passes, with **Save anyway** if it doesn't.

The editor shows **Unsaved changes** and asks before discarding them. If someone else saved the
monitor while you were editing, your save is refused with a message to reload.

From the monitors list, **Clone** creates a disabled copy named "… (copy)" with the same definition
and secrets, and **Disable** / **Enable** pauses or resumes a monitor.

## Health status

The same colours are used in the list, the location grid, the overview and the dependency map. A
monitor's status comes from the latest run at each location.

| Colour | Status | When |
| --- | --- | --- |
| Green | **Up** | Every location passed its latest run |
| Amber | **Degraded** | Some locations fail, but fewer than the Down threshold; or a run passed but breached a warning (an assertion marked `warn`, a certificate within its warning days, ICMP round trip above its warning) |
| Red | **Down** | Failing from at least the Down threshold of locations |
| Amber, half-filled | **Impacted** | Failing (down or degraded) while a parent it depends on is down. Its alerts are muted |
| Blue | **Disabled** | Paused; no runs scheduled |
| Grey | No data | No results yet |

## Dependencies and muted alerts

A monitor can name **parents**, other monitors it depends on: `quotes-api` depends on
`api-gateway`, for example. A monitor can have several parents; the editor refuses a loop.

While a parent is **Down**, a failing child shows **Impacted**, with the reason "api-gateway down:
alerts muted until it recovers". Children keep running, so their history stays complete. A chain
marks every level below the first monitor that is down.

Impacted children's alerts are muted, so one outage sends one alert, for its root cause. Each
child's alert rule ends with "unless a parent is down".

:::caution[Muting works within one project]
Muting needs the parent and the child to send results to the **same destination project**, which
is the usual case. A parent in another project still makes the child Impacted in the UI, but its
alerts can't be muted.
:::

The **Dependency map** tab draws monitors with dependencies as a graph, parents above children, in
their status colours. Drag to move, scroll to zoom, and click a monitor to open it. Monitors without
dependencies are left out and counted.

## Alerts per monitor

In the editor's **Alerts** row, pick:

- **Notification channels**, from the shared channels in **Obzly settings** (see
  [Add a notification channel](/docs/how-to/alerts/#2-add-a-notification-channel));
- when to notify: **When down** (the default) or **When down or degraded**;
- **Cert … days**: also alert when the certificate expires within that many days (0 turns it off);
- **Repeat**: never, every 15 minutes, every hour, every 4 hours or every day while it stays down.

The control plane sends each monitor's alert settings to the destination Site, which keeps a
**managed alert rule** for it in the destination project. These rules show on the Site's **Alerts →
Rules** tab with a **Synthetics** tag and are read-only there; change them in the monitor's editor.
They are removed with the monitor. See
[Rules managed by Synthetics](/docs/how-to/alerts/#rules-managed-by-synthetics).

The down rule fires when at least the Down threshold of locations fail. New or changed alert
settings reach the Site **within 5 minutes**. Monitor alerts need the destination Site on v0.56.0
or later.

## Overview and monitor detail

- **Overview** (top of the Synthetics tab): status counts, the share of monitors up over the range,
  an availability timeline of every monitor (worst first), a location health matrix, the slowest
  monitors (p95), active outages, and certificates expiring within 30 days.
- **Monitors:** one row per monitor with its status, type, name, a grid of its locations, uptime,
  p95 and certificate days left, grouped under collapsible folders with their own status counts.
  Sort by Status, Type or Name from the headers (problems first when sorting by status), filter by
  status (All, Down, Impacted, Degraded, Up, Disabled) or folder, or search by name.
- **Monitor detail** opens as a panel from the right when you click a monitor: uptime, p50/p95/p99,
  last run, certificate days left; availability by location; response time by location; where the
  time goes per phase; an availability heatmap by location and hour; failure reasons; certificate
  details; ICMP round trip and loss; a locations table; and recent runs, each opening its waterfall,
  assertions and response snippet. Actions: **Run now**, **Edit**, **Clone**, **Disable**. A
  **Dependencies** panel lists its parents and children.

## Results on the Site

The probe sends metrics labelled `check_id`, `check`, `type`, `location`, `probe` and `target`, and
one log line per run (`service.name=obzly-probe`, level `info`, `warn` or `error`) with every
assertion, the status and headers, the timing waterfall, the first 1 KB of the response, the
resolved IPs, the certificate details and any error.

| Metric | Meaning |
| --- | --- |
| `synthetics_up` | 1 if the run passed every assertion, else 0 |
| `synthetics_warn` | 1 if the run passed but breached a warning |
| `synthetics_duration_seconds{phase}` | Timing per phase (`dns`, `connect`, `tls`, `ttfb`, `transfer`, `total`) |
| `synthetics_http_status`, `synthetics_response_bytes`, `synthetics_redirects` | HTTP status, response size and redirects followed |
| `synthetics_cert_expiry_seconds` | Time until the certificate expires |
| `synthetics_tls_info{issuer,protocol,cipher}` | Always 1; TLS details as labels |
| `synthetics_dns_answers` | Records returned (DNS) |
| `synthetics_icmp_rtt_seconds`, `synthetics_icmp_jitter_seconds`, `synthetics_icmp_loss_ratio` | ICMP |

For example, locations whose latest run of `api-gateway` failed:

```text
count(last_over_time(synthetics_up{check="api-gateway"}[7m]) == 0)
```

## Import and export YAML

Manage monitors in bulk, or in git, with **Import YAML** and **Export YAML** in the monitors
toolbar.

- **Import** (upload or paste): the whole file is validated first. A preview lists what will be
  created, updated and left unchanged, and the errors with their line numbers. Nothing is
  half-applied: the whole file goes in, or none of it.
- Monitors are matched by `name`, so importing the same file again updates them instead of creating
  duplicates. `prune: true` at the top deletes monitors that aren't in the file.
- **Export** downloads the selected (or all) monitors in the same format. Exports contain
  placeholders, never secret values.

The Import dialog offers a sample file covering every check type
([`docs/examples/synthetics-checks.yaml`](https://github.com/obzly/obzly/blob/main/docs/examples/synthetics-checks.yaml)).
A shorter example:

```yaml
apiVersion: obzly.com/synthetics/v1
kind: MonitorList

# true deletes monitors that are not in this file. Default false.
prune: false

# Applied to every monitor unless it sets its own value.
defaults:
  interval: 180s          # minimum 30s
  timeout: 10s            # at most the interval
  locations: [all]        # probe locations, or [all]
  destination: synthetics # a destination created in the UI
  down_locations: 2       # red once this many locations fail; fewer is amber
  enabled: true

monitors:
  - name: api-gateway
    type: http
    folder: Payments/EU
    request:
      method: GET
      url: https://api.harborline.example/health
      headers:
        Accept: application/json
    assertions:
      - status: 200
      - response_time_ms: {below: 800}
      - response_time_ms: {below: 400, severity: warn}   # amber, not red
      - json: {path: $.status, equals: ok}
    tls:
      warn_days: 21
    locations: [edge-north, edge-south, office-pier]
    alerts: {channels: ["#payments-oncall"], notify: down, cert_days: 14, repeat: 1h}

  - name: quotes-api
    type: http
    folder: Payments/EU
    depends_on: [api-gateway]   # Impacted, with alerts muted, while api-gateway is down
    interval: 300s
    request:
      method: POST
      url: https://api.harborline.example/v1/quotes
      headers:
        Authorization: "Bearer ${env:QUOTES_API_TOKEN}"
        Content-Type: application/json
      body: '{"sku": "SYNTHETIC-1", "qty": 1}'
    assertions:
      - status: {in: [200, 201]}
      - body: {matches: '"quote_id":\s*"[a-z0-9-]+"'}

  - name: shop-admin
    type: http
    request:
      url: https://shop.harborline.example:8443/login
    tls:
      verify: false             # self-signed certificate
    assertions:
      - status: 200
    locations: [office-pier]
    down_locations: 1

  - name: mail-certificate
    type: tls
    target: mail.harborline.example:465
    interval: 3600s
    tls:
      warn_days: 30
      fail_days: 7
      min_protocol: TLS1.2
      verify_hostname: true

  - name: orders-db-port
    type: tcp
    target: db.internal.harborline.example:5432
    timeout: 3s
    locations: [office-pier]
    down_locations: 1

  - name: shop-dns
    type: dns
    target: shop.harborline.example
    dns:
      record_type: A
      expect_any_of: [192.0.2.10]

  - name: pier-gateway
    type: icmp
    target: 10.20.0.1
    icmp:
      count: 5
      max_loss_ratio: 0.2
      rtt_warn_ms: 80
    locations: [office-pier]
    down_locations: 1
```

Alert channels in YAML are named as they are in **Obzly settings**, and must exist before the
import.

## Secrets

Write secrets (auth headers, tokens) as `${env:NAME}` placeholders, in the editor or in YAML:

```yaml
Authorization: "Bearer ${env:QUOTES_API_TOKEN}"
```

- The editor's **Secrets** section, and the import preview, ask for each placeholder's value. Values
  are stored encrypted, sent only to probes, and never shown again or exported.
- Leave a value empty to keep the stored one, or to let the **probe's own environment** provide
  it: a placeholder with no stored value is read from the probe's environment variable of that
  name (see [Synthetics probe](/docs/deploy/probe/#environment-variables)).
