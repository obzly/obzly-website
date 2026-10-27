// Obzly vs SigNoz. Facts from SigNoz's own pages, checked 27 October 2026.
import type { ToolPage } from './types';

const page: ToolPage = {
	slug: 'signoz',
	name: 'SigNoz',
	tagline: 'OTel-native, built on ClickHouse.',
	summary:
		'SigNoz is an OpenTelemetry-native observability tool that stores every signal in ClickHouse. Its Community edition is MIT-licensed, and SAML, OIDC and fine-grained roles come with Enterprise or SigNoz Cloud. Obzly covers the same three signals with Parquet in object storage, so there is no ClickHouse to run.',
	cardObzly: 'no ClickHouse to run, remote write, synthetics',
	cardThem: 'you already run ClickHouse or want its exceptions view',
	chooseObzly: [
		"you'd rather not run ClickHouse and ZooKeeper: Obzly keeps data as Parquet in object storage;",
		'you send Prometheus remote write, or want a PromQL API that Grafana can query;',
		'you want synthetic checks for HTTP, TLS, TCP, DNS and ICMP from probes you host;',
		'you want OIDC with any provider, SCIM and an audit log without a paid license;',
		"you need one login across regions, with each region's data staying put.",
	],
	chooseThem: [
		'you already run ClickHouse, or want it as your store, with replicated or sharded clusters;',
		'you want ready-made APM and an exceptions view: latency, error rate, Apdex, trace funnels and stack traces;',
		"you need frontend or mobile monitoring (iOS, Android, Flutter), which Obzly doesn't have;",
		'you want native alert channels such as Opsgenie, incident.io and Rootly, plus alerts as code and a Terraform provider;',
		'you want a managed service with BYOC, SOC 2 Type II and HIPAA, and data centres in the US, EU and India.',
	],
	run: {
		title: 'SigNoz, self-hosted',
		top: { name: 'SigNoz', detail: 'UI, API server, ruler, Alertmanager and OpAMP in one binary' },
		groups: [
			{ name: 'ClickHouse', parts: ['logs', 'traces', 'metrics', 'replicas'] },
			{ name: 'ZooKeeper', parts: ['or Keeper', 'for clusters'] },
			{ name: 'Collector', parts: ['OTLP 4317', 'OTLP 4318', 'Jaeger', 'Zipkin'] },
			{ name: 'Postgres', parts: ['metadata', 'or SQLite'] },
		],
		storage: 'ClickHouse disks · optional S3/GCS cold tier',
		caption:
			'SigNoz stores every signal in ClickHouse on local disks, and the Helm chart can move older data to S3 or GCS. A distributed ClickHouse cluster needs ZooKeeper or ClickHouse Keeper. Obzly writes Parquet to object storage, so it needs neither.',
	},
	columns: ['Community (self-hosted)', 'Enterprise / SigNoz Cloud'],
	rows: [
		{ cap: 'License', obzly: 'Apache 2.0, every feature', a: 'MIT (Expat)', b: 'Proprietary ee/ code, licensed per user seat', sources: [{ label: 'License', url: 'https://github.com/SigNoz/signoz/blob/main/LICENSE' }, { label: 'ee/ license', url: 'https://github.com/SigNoz/signoz/blob/main/ee/LICENSE' }] },
		{ cap: 'What you run', obzly: 'One image in up to five roles, Postgres, Valkey', a: 'ClickHouse, ZooKeeper or Keeper, Postgres, SigNoz, collector', b: 'Same with support, or BYOC, or nothing on Cloud', sources: [{ label: 'Architecture', url: 'https://signoz.io/docs/architecture/' }, { label: 'Distributed ClickHouse', url: 'https://signoz.io/docs/operate/clickhouse/distributed-clickhouse/' }, { label: 'Docker install', url: 'https://signoz.io/docs/install/docker/' }] },
		{ cap: 'Storage', obzly: 'ZSTD Parquet on S3, GCS, Azure Blob or MinIO', a: 'ClickHouse on disks; optional S3/GCS cold tier', b: 'Same', sources: [{ label: 'Architecture', url: 'https://signoz.io/docs/architecture/' }, { label: 'Helm values', url: 'https://github.com/SigNoz/charts/blob/main/charts/signoz/values.yaml' }] },
		{ cap: 'OTLP in', obzly: 'Logs, metrics and traces, gRPC and HTTP', a: 'Logs, metrics and traces, gRPC and HTTP', b: 'Same; Cloud takes both on port 443', sources: [{ label: 'Docker install', url: 'https://signoz.io/docs/install/docker/' }, { label: 'Cloud ingestion', url: 'https://signoz.io/docs/ingestion/signoz-cloud/overview/' }] },
		{ cap: 'Query languages', obzly: 'Search bar and SQL for logs, PromQL, Jaeger API for traces', a: 'Query Builder; ClickHouse SQL and PromQL in dashboards only', b: 'Same', sources: [{ label: 'Query Builder', url: 'https://signoz.io/docs/userguide/query-builder-v5/' }, { label: 'ClickHouse queries', url: 'https://signoz.io/docs/userguide/logs_clickhouse_queries/' }, { label: 'PromQL', url: 'https://signoz.io/docs/userguide/write-a-prom-query-with-new-format/' }] },
		{ cap: 'Prometheus', obzly: 'Remote-write ingest and a PromQL API', a: 'PromQL in dashboards; no remote write, Collector scrapes', b: 'Same', sources: [{ label: 'Remote write', url: 'https://github.com/SigNoz/signoz/discussions/9489' }, { label: 'Prometheus metrics', url: 'https://signoz.io/docs/userguide/prometheus-metrics/' }] },
		{ cap: 'Dashboards', obzly: 'Own dashboards; imports Grafana layouts, not SigNoz', a: 'Own dashboards; Grafana ones are rebuilt by hand', b: 'Same', sources: [{ label: 'From Grafana', url: 'https://signoz.io/docs/migration/migrate-from-grafana/dashboards/' }, { label: 'Import', url: 'https://signoz.io/docs/dashboards/import-dashboard/' }] },
		{ cap: 'Alerting', obzly: 'Webhook, Slack, PagerDuty, email', a: 'Slack, PagerDuty, Opsgenie, Teams, email and more', b: 'Same, plus anomaly-detection alerts', sources: [{ label: 'Channels', url: 'https://signoz.io/docs/setup-alerts-notification/' }, { label: 'Pricing', url: 'https://signoz.io/pricing/' }] },
		{ cap: 'Synthetic checks', obzly: 'HTTP, TLS, TCP, DNS, ICMP from your probes; no browser', a: 'Not supported; Collector httpcheck for HTTP and TLS expiry', b: 'Not supported', sources: [{ label: 'FAQ', url: 'https://signoz.io/docs/alerts-management/troubleshooting/faqs/' }] },
		{ cap: 'Infrastructure inventory', obzly: 'Clusters to containers, plus AWS and Azure resources', a: 'Hosts and Kubernetes objects; AWS, Azure, GCP services', b: 'Adds one-click AWS integrations', sources: [{ label: 'Infrastructure', url: 'https://signoz.io/docs/infrastructure-monitoring/overview/' }, { label: 'Pricing', url: 'https://signoz.io/pricing/' }] },
		{ cap: 'RUM and profiling', obzly: 'Neither', a: 'Frontend and mobile monitoring, no replay; no profiling', b: 'Same', sources: [{ label: 'Frontend', url: 'https://signoz.io/docs/frontend-monitoring/' }, { label: 'Session replay', url: 'https://github.com/SigNoz/signoz/discussions/3846' }, { label: 'Profiling', url: 'https://github.com/SigNoz/signoz/issues/5641' }] },
		{ cap: 'SSO', obzly: 'OIDC with any provider; no SAML', a: 'Google Workspace only', b: 'SAML 2.0 and OIDC', sources: [{ label: 'SSO', url: 'https://signoz.io/docs/manage/administrator-guide/sso/overview/' }, { label: 'Pricing', url: 'https://signoz.io/pricing/' }] },
		{ cap: 'SCIM', obzly: 'Included', a: 'Not supported', b: 'Not supported', sources: [{ label: 'SSO', url: 'https://signoz.io/docs/manage/administrator-guide/sso/overview/' }] },
		{ cap: 'RBAC and audit log', obzly: 'Per-project roles, teams, audit log with CSV export', a: 'Admin, Editor and Viewer roles; no audit log', b: 'Fine-grained RBAC in beta; audit log coming soon', sources: [{ label: 'Roles', url: 'https://signoz.io/docs/manage/administrator-guide/iam/roles/' }, { label: 'Pricing', url: 'https://signoz.io/pricing/' }] },
		{ cap: 'MCP server', obzly: 'Built in at /mcp, read-only', a: 'Official server you run yourself', b: 'Hosted server on SigNoz Cloud', sources: [{ label: 'MCP server', url: 'https://signoz.io/docs/ai/signoz-mcp-server/' }] },
		{ cap: 'Many regions', obzly: 'Control plane in front of many Sites', a: 'Not supported', b: 'Not supported', sources: [{ label: 'Multi-cluster', url: 'https://signoz.io/docs/opentelemetry-collection-agents/k8s/k8s-infra/user-guides/k8s-infra-multi-cluster/' }] },
		{ cap: 'Price', obzly: 'Free; you run the infrastructure', a: 'Free; you run the infrastructure', b: 'Teams from $49/month incl. usage; Enterprise from $4,000/month', sources: [{ label: 'Pricing', url: 'https://signoz.io/pricing/' }] },
	],
	move: [
		{ lead: 'Send to both.', text: 'Add an OTLP exporter for Obzly to the Collector that feeds SigNoz.', link: { label: 'Collector guide', href: '/docs/how-to/kubernetes-otel-collector/' } },
		{ lead: 'Bring Prometheus metrics.', text: 'Keep scraping with the Collector, or send Prometheus remote write to Obzly directly.', link: { label: 'PromQL and Grafana', href: '/docs/how-to/grafana-promql/' } },
		{ lead: 'Rebuild the dashboards you use.', text: "Obzly doesn't import SigNoz dashboards. PromQL panels carry over once metric and label names are checked; Query Builder and ClickHouse SQL panels need rewriting." },
		{ lead: 'Move alert rules.', text: "Recreate them as PromQL, log search or trace latency rules, and connect Slack, PagerDuty, email or a webhook.", link: { label: 'Alerts', href: '/docs/how-to/alerts/' } },
		{ lead: 'Replace httpcheck.', text: 'Move HTTP and TLS checks from the Collector to Obzly synthetics, which run from your probe groups and need a control plane.', link: { label: 'Synthetics', href: '/docs/how-to/synthetics/' } },
		{ lead: 'Switch off ClickHouse', text: 'once Obzly has your full retention.' },
	],
	sources: [
		{ url: 'https://signoz.io/pricing/', label: 'signoz.io/pricing', what: 'plans, prices and features by edition' },
		{ url: 'https://github.com/SigNoz/signoz/blob/main/LICENSE', label: 'GitHub LICENSE', what: 'MIT core, proprietary ee/' },
		{ url: 'https://signoz.io/docs/architecture/', label: 'Architecture docs', what: 'ClickHouse and the collector' },
		{ url: 'https://signoz.io/docs/operate/clickhouse/distributed-clickhouse/', label: 'Distributed ClickHouse docs', what: 'ZooKeeper or Keeper required' },
		{ url: 'https://github.com/SigNoz/charts/blob/main/charts/signoz/values.yaml', label: 'Helm chart values', what: 'S3/GCS cold storage, off by default' },
		{ url: 'https://github.com/SigNoz/signoz/discussions/9489', label: 'GitHub discussion 9489', what: 'no remote-write endpoint' },
		{ url: 'https://signoz.io/docs/alerts-management/troubleshooting/faqs/', label: 'Alerts FAQ', what: 'synthetic monitoring not supported' },
		{ url: 'https://signoz.io/docs/manage/administrator-guide/sso/overview/', label: 'SSO docs', what: 'SSO by edition' },
		{ url: 'https://signoz.io/docs/manage/administrator-guide/iam/roles/', label: 'Roles docs', what: 'fine-grained RBAC in beta' },
	],
};

export default page;
