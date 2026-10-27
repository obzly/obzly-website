// Obzly vs OpenObserve. Facts from OpenObserve's own pages, checked 27 October 2026.
import type { ToolPage } from './types';

const page: ToolPage = {
	slug: 'openobserve',
	name: 'OpenObserve',
	tagline: 'Closest in shape: Parquet on object storage.',
	summary:
		"OpenObserve is the tool closest in shape to Obzly: one binary that stores logs, metrics and traces as Parquet in object storage. Its open-source edition is AGPL-3.0, and SSO, custom roles, the audit trail and multi-region federation are in its Enterprise edition, which is free up to 50 GB a day. Obzly includes all of those under Apache 2.0.",
	cardObzly: 'SSO, RBAC, audit and multi-region without a paid edition',
	cardThem: 'you need RUM, session replay or browser checks today',
	chooseObzly: [
		'you want SSO, SCIM, roles and an audit log at any volume without an Enterprise license;',
		"you need one login across regions, with each region's data staying put, without an Enterprise license;",
		'you want synthetic checks from probes inside your network, with alerts, without a paid edition;',
		'you want AWS and Azure resources in the same inventory as your clusters and hosts;',
		'Apache 2.0 suits your legal team better than AGPL-3.0.',
	],
	chooseThem: [
		"you need RUM with session replay, continuous profiling or browser checks, which Obzly doesn't have;",
		'you want to start with one binary and SQLite, then grow to HA with only Postgres, NATS and object storage;',
		"you need SAML or LDAP, which Obzly doesn't support: self-hosted Enterprise includes them and is free up to 50 GB a day;",
		"you're moving from Grafana, Datadog, Kibana or CloudWatch and want queries and alerts converted too;",
		'you want a managed service with SOC 2 Type II and ISO 27001, in the US, EU or India.',
	],
	run: {
		title: 'OpenObserve, self-hosted',
		top: { name: 'Single node', detail: 'One binary with SQLite. For HA, run the parts below.' },
		groups: [
			{ name: 'HA nodes', parts: ['router', 'ingester', 'querier', 'compactor', 'scheduler'] },
			{ name: 'Postgres', parts: ['metadata'] },
			{ name: 'NATS', parts: ['coordination'] },
		],
		storage: 'Parquet on object storage · local disk on a single node',
		caption:
			"A single node runs everything from one binary. HA mode runs on Kubernetes with Helm, splits into the node roles shown, and needs Postgres, NATS and object storage. OpenObserve's Enterprise SSO and roles need HA mode. Obzly scales the same way, one role at a time, from the same image.",
	},
	columns: ['Open source (AGPL)', 'Enterprise / Cloud'],
	rows: [
		{ cap: 'License', obzly: 'Apache 2.0, every feature', a: 'AGPL-3.0', b: 'Commercial EULA; self-hosted free up to 50 GB/day', sources: [{ label: 'README', url: 'https://github.com/openobserve/openobserve/blob/main/README.md' }, { label: 'Downloads', url: 'https://openobserve.ai/downloads/' }] },
		{ cap: 'What you run', obzly: 'One image in up to five roles, Postgres, Valkey', a: 'One binary; HA adds node roles, Postgres and NATS', b: 'Same, or nothing on OpenObserve Cloud', sources: [{ label: 'Architecture', url: 'https://openobserve.ai/docs/architecture/' }, { label: 'Downloads', url: 'https://openobserve.ai/downloads/' }] },
		{ cap: 'Storage', obzly: 'ZSTD Parquet on S3, GCS, Azure Blob or MinIO', a: 'Parquet on local disk, S3, GCS, Azure Blob or MinIO', b: 'Same; Cloud Enterprise can use your own bucket', sources: [{ label: 'Architecture', url: 'https://openobserve.ai/docs/architecture/' }, { label: 'Pricing', url: 'https://openobserve.ai/pricing/' }] },
		{ cap: 'OTLP in', obzly: 'Logs, metrics and traces, gRPC and HTTP', a: 'Logs, metrics, traces and profiles, gRPC and HTTP', b: 'Same', sources: [{ label: 'OTLP', url: 'https://openobserve.ai/docs/ingestion/logs/otlp/' }] },
		{ cap: 'Query languages', obzly: 'Search bar and SQL for logs, PromQL, Jaeger API for traces', a: 'SQL for logs and traces; SQL or PromQL for metrics', b: 'Same', sources: [{ label: 'README', url: 'https://github.com/openobserve/openobserve/blob/main/README.md' }] },
		{ cap: 'Prometheus', obzly: 'Remote-write ingest and a PromQL API', a: 'Remote write and PromQL', b: 'Same', sources: [{ label: 'Prometheus', url: 'https://openobserve.ai/docs/ingestion/metrics/prometheus/' }] },
		{ cap: 'Dashboards', obzly: 'Imports OpenObserve and Grafana layouts; you add queries', a: 'Own dashboards; Grafana through a migrator tool', b: 'Same', sources: [{ label: 'Grafana migration', url: 'https://openobserve.ai/docs/migration/migrate-from-grafana-to-openobserve/dashboards-and-alerts/' }, { label: 'Dashboards', url: 'https://openobserve.ai/docs/user-guide/analytics/dashboards/dashboards-in-openobserve/' }] },
		{ cap: 'Alerting', obzly: 'Webhook, Slack, PagerDuty, email', a: 'Webhook and email; Slack, Teams, PagerDuty via webhook', b: 'Same', sources: [{ label: 'Destinations', url: 'https://openobserve.ai/docs/user-guide/account-administration/management/alert-destinations/' }, { label: 'Downloads', url: 'https://openobserve.ai/downloads/' }] },
		{ cap: 'Synthetic checks', obzly: 'HTTP, TLS, TCP, DNS, ICMP from your probes; no browser', a: 'Beta: browser, HTTP, TCP, TLS, SSH; public locations only', b: 'Adds private locations and notifications (Enterprise)', sources: [{ label: 'Synthetics', url: 'https://openobserve.ai/docs/user-guide/data-exploration/synthetics/' }, { label: 'Self-hosted setup', url: 'https://openobserve.ai/docs/user-guide/data-exploration/synthetics/self-hosted-setup/' }] },
		{ cap: 'Infrastructure inventory', obzly: 'Clusters to containers, plus AWS and Azure resources', a: 'Kubernetes and host pages since v1.1.0', b: 'Same', sources: [{ label: 'v1.1.0 release', url: 'https://github.com/openobserve/openobserve/releases/tag/v1.1.0' }, { label: 'Infrastructure pages PR', url: 'https://github.com/openobserve/openobserve/pull/14403' }] },
		{ cap: 'RUM and profiling', obzly: 'Neither', a: 'RUM with session replay; profiles over OTLP', b: 'Same', sources: [{ label: 'Frontend', url: 'https://openobserve.ai/docs/features/frontend/' }, { label: 'Profiles', url: 'https://openobserve.ai/docs/ingestion/profiles/' }] },
		{ cap: 'SSO', obzly: 'OIDC with any provider; no SAML', a: 'Not available', b: 'OIDC, SAML 2.0, LDAP; self-hosted needs HA mode', sources: [{ label: 'Downloads', url: 'https://openobserve.ai/downloads/' }, { label: 'Pricing', url: 'https://openobserve.ai/pricing/' }] },
		{ cap: 'SCIM', obzly: 'Included', a: 'Not documented', b: 'Not documented', sources: [] },
		{ cap: 'RBAC and audit log', obzly: 'Per-project roles, teams, audit log with CSV export', a: 'Every user has full access; basic logging only', b: 'Custom roles, 365-day audit trail; self-hosted needs HA', sources: [{ label: 'RBAC', url: 'https://openobserve.ai/docs/user-guide/identity-and-access-management/role-based-access-control/' }, { label: 'Audit trail', url: 'https://openobserve.ai/docs/user-guide/account-administration/management/audit-trail/' }, { label: 'Downloads', url: 'https://openobserve.ai/downloads/' }] },
		{ cap: 'MCP server', obzly: 'Built in at /mcp, read-only', a: "Built in; runs with the account's full privileges", b: 'Built in; OAuth sign-in on Enterprise', sources: [{ label: 'MCP', url: 'https://openobserve.ai/docs/integration/ai/mcp/' }] },
		{ cap: 'Many regions', obzly: 'Control plane in front of many Sites', a: 'Not available', b: 'Super Cluster federation, self-hosted Enterprise only', sources: [{ label: 'Federated search', url: 'https://openobserve.ai/docs/user-guide/data-exploration/federated-search/' }] },
		{ cap: 'Price', obzly: 'Free; you run the infrastructure', a: 'Free; you run the infrastructure', b: 'Enterprise free to 50 GB/day; Cloud from $0.50/GB ingested', sources: [{ label: 'Pricing', url: 'https://openobserve.ai/pricing/' }, { label: 'Enterprise license', url: 'https://openobserve.ai/docs/enterprise-setup/license-and-pricing/' }] },
	],
	both: {
		intro:
			'Obzly and OpenObserve take the same inputs, so you can run them side by side while you compare them.',
		items: [
			{ title: 'One Collector, two exporters', text: 'Both accept OTLP for logs, metrics and traces, and both accept Prometheus remote write.' },
			{ title: 'Dashboards', text: "Obzly imports OpenObserve dashboard JSON. Panels and layout come across; you add each panel's query in Obzly." },
		],
	},
	move: [
		{ lead: 'Send to both.', text: 'Add an OTLP exporter for Obzly to your Collector next to the OpenObserve one.', link: { label: 'Collector guide', href: '/docs/how-to/kubernetes-otel-collector/' } },
		{ lead: 'Keep Prometheus flowing.', text: 'Add Obzly as a second remote-write target.', link: { label: 'PromQL and Grafana', href: '/docs/how-to/grafana-promql/' } },
		{ lead: 'Import dashboards.', text: "Export OpenObserve dashboard JSON and import it in Obzly, then add each panel's query." },
		{ lead: 'Move alert rules.', text: 'PromQL rules carry over once metric and label names are checked; SQL rules on logs become Obzly log searches.', link: { label: 'Alerts', href: '/docs/how-to/alerts/' } },
		{ lead: 'Recreate synthetic checks.', text: 'HTTP, TCP and TLS checks map to Obzly checks from your probe groups, which need a control plane. Browser and SSH checks have no equivalent.', link: { label: 'Synthetics', href: '/docs/how-to/synthetics/' } },
		{ lead: 'Switch off OpenObserve', text: 'once Obzly has your full retention.' },
	],
	sources: [
		{ url: 'https://openobserve.ai/downloads/', label: 'openobserve.ai/downloads', what: 'features by edition' },
		{ url: 'https://openobserve.ai/pricing/', label: 'openobserve.ai/pricing', what: 'Cloud and Enterprise pricing' },
		{ url: 'https://github.com/openobserve/openobserve/blob/main/README.md', label: 'GitHub README', what: 'AGPL-3.0 and the Enterprise license' },
		{ url: 'https://openobserve.ai/docs/architecture/', label: 'Architecture docs', what: 'single node and HA mode' },
		{ url: 'https://openobserve.ai/docs/user-guide/data-exploration/synthetics/self-hosted-setup/', label: 'Synthetics setup docs', what: 'what stays Enterprise' },
		{ url: 'https://openobserve.ai/docs/user-guide/identity-and-access-management/role-based-access-control/', label: 'RBAC docs', what: 'Enterprise and Cloud only' },
		{ url: 'https://openobserve.ai/docs/user-guide/data-exploration/federated-search/', label: 'Federated search docs', what: 'Super Cluster, Enterprise only' },
		{ url: 'https://openobserve.ai/docs/migration/migrate-from-grafana-to-openobserve/dashboards-and-alerts/', label: 'Grafana migration docs', what: 'the Dashboard Migrator' },
		{ url: 'https://openobserve.ai/docs/features/frontend/', label: 'Frontend docs', what: 'RUM and session replay' },
	],
};

export default page;
