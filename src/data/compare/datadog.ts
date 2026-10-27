// Obzly vs Datadog. Facts from Datadog's own pages, checked 27 October 2026.
import type { ToolPage } from './types';

const page: ToolPage = {
	slug: 'datadog',
	name: 'Datadog',
	tagline: 'The SaaS reference, priced per host and GB.',
	summary:
		'Datadog is a hosted platform. You run its Agent or an OpenTelemetry Collector on your hosts, and Datadog stores and processes the data in the site you choose. Obzly covers logs, metrics and traces in one system that runs on your own infrastructure, so the data stays where you run it.',
	cardObzly: 'your data must stay on your infrastructure',
	cardThem: 'you want a fully managed service with RUM and profiling',
	chooseObzly: [
		'all your telemetry must stay on infrastructure you control; with Datadog, only logs can, through BYOC Logs;',
		'you want an Apache 2.0 product with no per-host or per-GB bill, and pay only for the infrastructure you run;',
		'you want SSO, SCIM and an audit log included, without a plan upgrade or a share of your spend;',
		'you query metrics with PromQL and send Prometheus remote write;',
		"you need one login across regions, with each region's data staying put.",
	],
	chooseThem: [
		"you don't want to run anything: Datadog operates sites in the US, Germany, the UK, Japan and Australia, plus a FedRAMP High government site;",
		'you need real-user monitoring, continuous profiling, error tracking, or browser tests from Datadog-managed locations, none of which Obzly has;',
		'you rely on a large integration catalogue: Datadog lists over 1,000 built-in integrations and is far more mature than Obzly here;',
		'you want a hosted MCP server with OAuth sign-in and ready-made connectors for Claude, ChatGPT, Cursor and Codex;',
		"you need SAML, which Obzly doesn't support.",
	],
	run: {
		title: 'Datadog, SaaS with agents',
		top: { name: 'Datadog (SaaS)', detail: 'hosted in a Datadog site you choose' },
		groups: [
			{ name: 'In your hosts', parts: ['Datadog Agent', 'OTel Collector'] },
			{ name: 'BYOC Logs (optional)', parts: ['indexers', 'searchers', 'metastore', 'PostgreSQL', 'object storage'] },
		],
		storage: 'Your Datadog site · logs can go to your bucket',
		caption:
			'Everything except the agents runs in Datadog. BYOC Logs moves log indexing and search into your Kubernetes cluster, and you still use the Datadog UI. Obzly runs all three signals on your infrastructure, from one image.',
	},
	columns: ['Datadog (SaaS)', 'Plans, add-ons and BYOC Logs'],
	rows: [
		{ cap: 'License', obzly: 'Apache 2.0, every feature', a: 'Proprietary', b: 'Agent is open source: Apache 2.0, BPF code GPL-2.0', sources: [{ label: 'Master agreement', url: 'https://www.datadoghq.com/legal/msa/' }, { label: 'Datadog Agent', url: 'https://github.com/DataDog/datadog-agent' }] },
		{ cap: 'What you run', obzly: 'One image in up to five roles, Postgres, Valkey', a: 'Agents or collectors only; Datadog runs the platform', b: 'BYOC Logs: cloudprem image on Kubernetes, PostgreSQL, object storage', sources: [{ label: 'Datadog sites', url: 'https://docs.datadoghq.com/getting_started/site/' }, { label: 'BYOC Logs architecture', url: 'https://docs.datadoghq.com/cloudprem/introduction/architecture/' }] },
		{ cap: 'Storage', obzly: 'ZSTD Parquet on S3, GCS, Azure Blob or MinIO', a: 'In your Datadog site; logs can be archived to S3, GCS or Azure', b: 'BYOC Logs keeps indexed logs in your bucket; logs only', sources: [{ label: 'Datadog sites', url: 'https://docs.datadoghq.com/getting_started/site/' }, { label: 'Log archives', url: 'https://docs.datadoghq.com/logs/log_configuration/archives/' }, { label: 'BYOC Logs', url: 'https://docs.datadoghq.com/cloudprem/introduction/' }] },
		{ cap: 'OTLP in', obzly: 'Logs, metrics and traces, gRPC and HTTP', a: 'All three, to agentless intake endpoints', b: 'Same; Agent or Collector advised for production', sources: [{ label: 'OTLP intake', url: 'https://docs.datadoghq.com/opentelemetry/setup/otlp_ingest/' }] },
		{ cap: 'Query languages', obzly: 'Search bar and SQL for logs, PromQL, Jaeger API for traces', a: 'Log and trace search syntax, metric query syntax, DDSQL', b: 'Same, plus natural-language queries', sources: [{ label: 'Search syntax', url: 'https://docs.datadoghq.com/logs/explorer/search_syntax/' }, { label: 'Metric queries', url: 'https://docs.datadoghq.com/dashboards/guide/query-to-the-graph/' }, { label: 'DDSQL', url: 'https://docs.datadoghq.com/ddsql_editor/' }] },
		{ cap: 'Prometheus', obzly: 'Remote-write ingest and a PromQL API', a: 'Agent scrapes endpoints (OpenMetrics check)', b: 'Remote write via Observability Pipelines (preview); no PromQL', sources: [{ label: 'Pipelines Prometheus source', url: 'https://docs.datadoghq.com/observability_pipelines/sources/prometheus/' }, { label: 'Pipelines metrics destination', url: 'https://docs.datadoghq.com/observability_pipelines/destinations/datadog_metrics/' }, { label: 'Prometheus collection', url: 'https://docs.datadoghq.com/integrations/guide/prometheus-host-collection/' }] },
		{ cap: 'Dashboards', obzly: 'Own dashboards; imports Grafana layout without queries', a: 'Grafana dashboard migration tool in preview', b: 'Same', sources: [{ label: 'Dashboard Migration preview', url: 'https://www.datadoghq.com/product-preview/dashboard-migration-preview/' }] },
		{ cap: 'Alerting', obzly: 'Webhook, Slack, PagerDuty, email', a: 'Monitors notify email, Slack, PagerDuty, Teams, webhooks and more', b: 'Same', sources: [{ label: 'Notifications', url: 'https://docs.datadoghq.com/monitors/notify/' }] },
		{ cap: 'Synthetic checks', obzly: 'HTTP, TLS, TCP, DNS, ICMP from your probes; no browser', a: 'API, browser and network path tests; private locations', b: 'Billed per test run', sources: [{ label: 'Synthetic Monitoring', url: 'https://docs.datadoghq.com/synthetics/' }, { label: 'Private locations', url: 'https://docs.datadoghq.com/synthetics/platform/private_locations/' }] },
		{ cap: 'Infrastructure inventory', obzly: 'Clusters to containers, plus AWS and Azure resources', a: 'Resource Catalog and Kubernetes Explorer', b: 'Same', sources: [{ label: 'Resource Catalog', url: 'https://docs.datadoghq.com/infrastructure/resource_catalog/' }, { label: 'Kubernetes Explorer', url: 'https://docs.datadoghq.com/infrastructure/containers/orchestrator_explorer/' }] },
		{ cap: 'RUM and profiling', obzly: 'Neither', a: 'RUM, Continuous Profiler and Error Tracking', b: 'Each billed separately', sources: [{ label: 'RUM', url: 'https://docs.datadoghq.com/real_user_monitoring/' }, { label: 'Profiler', url: 'https://docs.datadoghq.com/profiler/' }, { label: 'Error Tracking', url: 'https://docs.datadoghq.com/error_tracking/' }] },
		{ cap: 'SSO', obzly: 'OIDC with any provider; no SAML', a: 'SAML and Google OAuth; OIDC not supported', b: 'SAML on Pro and Enterprise, not Free', sources: [{ label: 'Infrastructure plans', url: 'https://www.datadoghq.com/pricing/?product=infrastructure' }, { label: 'SAML', url: 'https://docs.datadoghq.com/account_management/saml/' }] },
		{ cap: 'SCIM', obzly: 'Included', a: 'Microsoft Entra ID and Okta', b: 'Pro, Enterprise and Startup plans', sources: [{ label: 'SCIM', url: 'https://docs.datadoghq.com/account_management/scim/' }] },
		{ cap: 'RBAC and audit log', obzly: 'Per-project roles, teams, audit log with CSV export', a: 'Three default roles plus custom roles', b: 'Audit Trail: 2% of spend billed annually, 3% month-to-month', sources: [{ label: 'RBAC', url: 'https://docs.datadoghq.com/account_management/rbac/' }, { label: 'Price list', url: 'https://www.datadoghq.com/pricing/list/' }, { label: 'Audit Trail', url: 'https://docs.datadoghq.com/account_management/audit_trail/' }] },
		{ cap: 'MCP server', obzly: 'Built in at /mcp, read-only', a: 'Hosted remote server per site, OAuth or tokens', b: 'Some toolsets in Preview; not on US government sites', sources: [{ label: 'MCP Server', url: 'https://docs.datadoghq.com/bits_ai/mcp_server/' }, { label: 'MCP setup', url: 'https://docs.datadoghq.com/bits_ai/mcp_server/setup/' }] },
		{ cap: 'Many regions', obzly: 'Control plane in front of many Sites', a: 'Parent org manages child orgs; no sharing across sites', b: 'Cross-org queries in one site; non-Enterprise up to 5 orgs', sources: [{ label: 'Multiple organisations', url: 'https://docs.datadoghq.com/account_management/multi_organization/' }, { label: 'Cross-org visibility', url: 'https://docs.datadoghq.com/account_management/org_settings/cross_org_visibility/' }] },
		{ cap: 'Price', obzly: 'Free; you run the infrastructure', a: 'Infrastructure Pro $15, Enterprise $23 per host/month, billed annually', b: 'Logs $0.10/GB ingested plus indexing; APM $31/host; billed annually', sources: [{ label: 'Price list', url: 'https://www.datadoghq.com/pricing/list/' }, { label: 'Infrastructure plans', url: 'https://www.datadoghq.com/pricing/?product=infrastructure' }] },
	],
	move: [
		{ lead: 'Run Obzly where your data must live.', text: 'Install it in your own cluster or cloud account.', link: { label: 'Helm', href: '/docs/deploy/helm/' } },
		{ lead: 'Send to both.', text: 'Add an OTLP exporter for Obzly to an OpenTelemetry Collector next to your Datadog pipeline, so both receive the same data.', link: { label: 'Collector guide', href: '/docs/how-to/kubernetes-otel-collector/' } },
		{ lead: 'Keep Prometheus metrics flowing.', text: 'Scrape the same endpoints with the Collector, or send remote write to Obzly.', link: { label: 'PromQL and Grafana', href: '/docs/how-to/grafana-promql/' } },
		{ lead: 'Rebuild dashboards and monitors.', text: "Datadog queries don't carry over. Recreate dashboards with PromQL and log search, and turn monitors into Obzly alert rules.", link: { label: 'Alerts', href: '/docs/how-to/alerts/' } },
		{ lead: 'Move API tests.', text: 'Recreate them as HTTP, TLS, TCP, DNS or ICMP checks from your own probes. Obzly synthetics need a control plane, and browser tests have no equivalent.', link: { label: 'Synthetics', href: '/docs/how-to/synthetics/' } },
		{ lead: 'Switch off Datadog', text: 'once Obzly has your full retention.' },
	],
	sources: [
		{ url: 'https://www.datadoghq.com/pricing/list/', label: 'datadoghq.com/pricing/list', what: 'list prices, billed annually' },
		{ url: 'https://www.datadoghq.com/pricing/?product=infrastructure', label: 'datadoghq.com/pricing', what: 'Infrastructure plans and SAML' },
		{ url: 'https://docs.datadoghq.com/getting_started/site/', label: 'Datadog sites docs', what: 'where data is hosted' },
		{ url: 'https://docs.datadoghq.com/cloudprem/introduction/', label: 'BYOC Logs docs', what: 'logs in your own infrastructure' },
		{ url: 'https://docs.datadoghq.com/opentelemetry/setup/otlp_ingest/', label: 'OTLP intake docs', what: 'agentless OTLP endpoints' },
		{ url: 'https://docs.datadoghq.com/integrations/guide/prometheus-host-collection/', label: 'Prometheus collection docs', what: 'Agent OpenMetrics check' },
		{ url: 'https://docs.datadoghq.com/synthetics/', label: 'Synthetic Monitoring docs', what: 'API, browser and network path tests' },
		{ url: 'https://docs.datadoghq.com/account_management/scim/', label: 'SCIM docs', what: 'Pro, Enterprise and Startup plans' },
		{ url: 'https://docs.datadoghq.com/account_management/audit_trail/', label: 'Audit Trail docs', what: 'audit events and retention' },
		{ url: 'https://www.datadoghq.com/product/platform/integrations/', label: 'datadoghq.com integrations', what: '1,000+ built-in integrations' },
	],
};

export default page;
