// Obzly vs Grafana LGTM. Facts from Grafana Labs' own pages, checked 27 October 2026.
import type { ToolPage } from './types';

const page: ToolPage = {
	slug: 'grafana',
	name: 'Grafana LGTM',
	tagline: 'Four systems you assemble, or Grafana Cloud.',
	summary:
		"Grafana's stack is the most common way to self-host observability: Grafana for dashboards, Loki for logs, Mimir for metrics and Tempo for traces. Obzly covers the same three signals in one system, and it can also sit behind the Grafana you already have.",
	cardObzly: 'one system instead of four, with SSO, SCIM and audit included',
	cardThem: 'you need billion-series metrics, browser checks or RUM',
	chooseObzly: [
		"you'd rather run one system than four, each with its own components and tuning;",
		'you want SSO, SCIM, fine-grained roles and an audit log without an enterprise license;',
		'you want synthetic checks and an infrastructure inventory that you host yourself;',
		"you need one login across regions, with each region's data staying put;",
		'Apache 2.0 suits your legal team better than AGPLv3.',
	],
	chooseThem: [
		'you run metrics at very large scale: Mimir is built for over a billion active series;',
		'you need browser synthetic checks, real-user monitoring or continuous profiling;',
		"you visualise many data sources that Obzly doesn't store, such as CloudWatch or SQL databases;",
		'you want a managed service with a free tier (Grafana Cloud);',
		"you need SAML, which Obzly doesn't support.",
	],
	run: {
		title: 'Grafana LGTM, self-hosted',
		top: { name: 'Grafana', detail: 'UI · MySQL or PostgreSQL for HA' },
		groups: [
			{ name: 'Loki', parts: ['distributor', 'ingester', 'querier', 'compactor', 'ruler · …'] },
			{ name: 'Mimir', parts: ['distributor', 'ingester', 'store-gateway', 'compactor', 'query-frontend'] },
			{ name: 'Tempo', parts: ['distributor', 'ingester', 'querier', 'compactor'] },
		],
		storage: 'Object storage · configured per backend',
		caption:
			'Loki and Mimir can also run as a single binary for small setups; at scale each splits into the components shown. Obzly scales the same way, one role at a time, from the same image.',
	},
	columns: ['Grafana OSS stack', 'Grafana Enterprise / Cloud'],
	rows: [
		{ cap: 'License', obzly: 'Apache 2.0, every feature', a: 'AGPLv3 (Grafana, Loki, Tempo, Mimir)', b: 'Proprietary', sources: [{ label: 'Licensing', url: 'https://grafana.com/licensing/' }] },
		{ cap: 'What you run', obzly: 'One image in up to five roles, Postgres, Valkey', a: 'Grafana plus Loki, Mimir and Tempo, each a set of components (or single-binary modes)', b: 'Same, or nothing with Grafana Cloud', sources: [{ label: 'Loki components', url: 'https://grafana.com/docs/loki/latest/get-started/components/' }, { label: 'Mimir components', url: 'https://grafana.com/docs/mimir/latest/references/architecture/components/' }] },
		{ cap: 'Storage', obzly: 'ZSTD Parquet on S3, GCS, Azure Blob or MinIO', a: 'Object storage for logs, metrics and traces', b: 'Same; Cloud stores it for you', sources: [{ label: 'Loki storage', url: 'https://grafana.com/docs/loki/latest/configure/storage/' }, { label: 'Tempo storage', url: 'https://grafana.com/docs/tempo/latest/configuration/' }] },
		{ cap: 'OTLP in', obzly: 'Logs, metrics and traces, gRPC and HTTP', a: 'All three; Loki and Mimir over HTTP', b: 'All three', sources: [{ label: 'Loki OTLP', url: 'https://grafana.com/docs/loki/latest/send-data/otel/' }, { label: 'Mimir OTLP', url: 'https://grafana.com/docs/mimir/latest/configure/configure-otel-collector/' }] },
		{ cap: 'Query languages', obzly: 'Search bar and SQL for logs, PromQL, Jaeger API for traces', a: 'LogQL, PromQL, TraceQL', b: 'Same', sources: [{ label: 'TraceQL', url: 'https://grafana.com/docs/tempo/latest/traceql/' }] },
		{ cap: 'Prometheus', obzly: 'Remote-write ingest and a PromQL API', a: 'Remote write and PromQL, natively', b: 'Same', sources: [{ label: 'Mimir', url: 'https://grafana.com/oss/mimir/' }] },
		{ cap: 'Dashboards', obzly: 'Own dashboards; imports Grafana layout without queries', a: 'Native, with many data sources', b: 'Same', sources: [{ label: 'Import dashboards', url: 'https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/import-dashboards/' }] },
		{ cap: 'Alerting', obzly: 'Webhook, Slack, PagerDuty, email', a: '20+ contact points', b: 'Same', sources: [{ label: 'Contact points', url: 'https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/' }] },
		{ cap: 'Synthetic checks', obzly: 'HTTP, TLS, TCP, DNS, ICMP from your probes; no browser', a: 'Not available', b: 'Grafana Cloud, incl. browser and private probes', sources: [{ label: 'Synthetic Monitoring', url: 'https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/' }] },
		{ cap: 'Infrastructure inventory', obzly: 'Clusters to containers, plus AWS and Azure resources', a: 'No inventory view', b: 'Entity catalog of services, pods and nodes (Cloud)', sources: [{ label: 'Entity catalog', url: 'https://grafana.com/docs/grafana-cloud/knowledge-graph/troubleshoot-infra-apps/explore-entity-catalog/' }, { label: 'Monitor infrastructure', url: 'https://grafana.com/docs/grafana-cloud/monitor-infrastructure/' }] },
		{ cap: 'RUM and profiling', obzly: 'Neither', a: 'Pyroscope for profiling', b: 'Frontend Observability (Cloud), Pyroscope', sources: [{ label: 'Frontend Observability', url: 'https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/' }, { label: 'Pyroscope', url: 'https://grafana.com/docs/pyroscope/latest/' }] },
		{ cap: 'SSO', obzly: 'OIDC with any provider; no SAML', a: 'OAuth and LDAP; no SAML', b: 'SAML in Enterprise and Cloud Pro and up', sources: [{ label: 'SAML', url: 'https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/saml/' }, { label: 'Deployment options', url: 'https://grafana.com/grafana/deployment-options/' }] },
		{ cap: 'SCIM', obzly: 'Included', a: 'Not available', b: 'Enterprise and Cloud', sources: [{ label: 'SCIM', url: 'https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-scim-provisioning/' }] },
		{ cap: 'RBAC and audit log', obzly: 'Per-project roles, teams, audit log with CSV export', a: 'Basic roles only', b: 'Fine-grained RBAC and audit log', sources: [{ label: 'RBAC', url: 'https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/access-control/' }, { label: 'Audit log', url: 'https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/audit-grafana/' }] },
		{ cap: 'MCP server', obzly: 'Built in at /mcp, read-only', a: 'Open-source server you run', b: 'Plus a hosted server for Cloud', sources: [{ label: 'Grafana MCP', url: 'https://grafana.com/docs/grafana/latest/developer-resources/mcp/' }] },
		{ cap: 'Many regions', obzly: 'Control plane in front of many Sites', a: 'One Grafana over many data sources', b: 'Cross-cluster query federation in GEM, experimental', sources: [{ label: 'GEM federation', url: 'https://grafana.com/docs/enterprise-metrics/latest/manage/cluster-query-federation/' }] },
		{ cap: 'Price', obzly: 'Free; you run the infrastructure', a: 'Free; you run the infrastructure', b: 'Cloud Pro from $19/month plus usage; Enterprise from $25k/year', sources: [{ label: 'Pricing', url: 'https://grafana.com/pricing/' }] },
	],
	both: {
		intro:
			"You don't have to give up Grafana. Obzly speaks the APIs Grafana already uses, so it can replace Loki, Mimir and Tempo underneath while your team keeps its dashboards.",
		items: [
			{ title: 'Prometheus data source', text: "Point it at Obzly's PromQL API. PromQL panels and alert queries keep working where metric and label names match; OTLP attributes are stored without dots, for example k8s_pod_name." },
			{ title: 'Jaeger data source', text: "Point it at Obzly's Jaeger-compatible API to browse traces in Grafana." },
			{ title: 'Logs', text: "LogQL panels need rewriting. Use Obzly's log search or SQL for those instead." },
		],
	},
	move: [
		{ lead: 'Send to both.', text: 'Add an OTLP exporter for Obzly to your Collector or Alloy pipeline next to the existing one.', link: { label: 'Collector guide', href: '/docs/how-to/kubernetes-otel-collector/' } },
		{ lead: 'Keep Prometheus flowing.', text: 'Add Obzly as a remote-write target.', link: { label: 'PromQL and Grafana', href: '/docs/how-to/grafana-promql/' } },
		{ lead: 'Repoint Grafana.', text: 'Add Obzly as a Prometheus and a Jaeger data source and switch panels over.' },
		{ lead: 'Bring dashboards into Obzly, if you want them there.', text: "Importing a Grafana dashboard copies its panels and layout; you add each panel's query in Obzly." },
		{ lead: 'Move alert rules.', text: "PromQL rules carry over once metric and label names are checked; log rules need Obzly's search syntax.", link: { label: 'Alerts', href: '/docs/how-to/alerts/' } },
		{ lead: 'Switch off the old backends', text: 'once Obzly has your full retention.' },
	],
	sources: [
		{ url: 'https://grafana.com/pricing/', label: 'grafana.com/pricing', what: 'Grafana Cloud plans and prices' },
		{ url: 'https://grafana.com/grafana/deployment-options/', label: 'grafana.com/grafana/deployment-options', what: 'features by edition' },
		{ url: 'https://grafana.com/licensing/', label: 'grafana.com/licensing', what: 'AGPLv3' },
		{ url: 'https://grafana.com/oss/mimir/', label: 'grafana.com/oss/mimir', what: 'Prometheus compatibility and scale' },
		{ url: 'https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/', label: 'Synthetic Monitoring docs', what: 'part of Grafana Cloud' },
		{ url: 'https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/saml/', label: 'SAML docs', what: 'Enterprise and Cloud' },
		{ url: 'https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-scim-provisioning/', label: 'SCIM docs', what: 'Enterprise and Cloud' },
		{ url: 'https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/audit-grafana/', label: 'Audit log docs', what: 'Enterprise and Cloud' },
	],
};

export default page;
