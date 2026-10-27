// Obzly vs Elastic. Facts from Elastic's own pages, checked 27 October 2026.
import type { ToolPage } from './types';

const page: ToolPage = {
	slug: 'elastic',
	name: 'Elastic',
	tagline: 'Search engine first, observability on top.',
	summary:
		'Elastic Observability runs on Elasticsearch, a search engine, with Kibana as its UI. You can run it yourself on the free Basic tier, where SSO, audit logging and most alert connectors need a paid subscription, or use Elastic Cloud. Obzly stores logs, metrics and traces as Parquet in object storage and has no paid tiers.',
	cardObzly: 'object storage by default and no license tiers',
	cardThem: "you depend on full-text search or Elastic's built-in machine learning",
	chooseObzly: [
		'you want every signal in your own object storage without an Enterprise license for searchable snapshots;',
		'you want SSO, SCIM, an audit log and alerts to Slack or PagerDuty without a paid subscription;',
		"you'd rather run one image than an Elasticsearch cluster with data tiers, Kibana, Fleet Server and agents;",
		'you want a built-in MCP server without an Enterprise subscription;',
		'Apache 2.0 suits your legal team better than SSPL, AGPLv3 or ELv2.',
	],
	chooseThem: [
		'you depend on full-text search across logs: Elasticsearch is a mature search engine, and ES|QL handles ad-hoc analysis;',
		'you want built-in machine learning: anomaly detection, log categorisation and forecasting (paid tiers);',
		"you need RUM, browser synthetic checks or eBPF continuous profiling (Enterprise), which Obzly doesn't have;",
		'you want a managed service: Elastic Cloud Serverless runs in 34 regions across AWS, Azure and GCP;',
		"you need SAML or Kerberos, which Obzly doesn't support, or Elastic's large catalogue of integrations and alert connectors.",
	],
	run: {
		title: 'Elastic, self-managed',
		top: { name: 'Kibana', detail: 'UI for every Elastic solution' },
		groups: [
			{ name: 'Elasticsearch', parts: ['hot tier', 'warm tier', 'cold tier', 'frozen tier'] },
			{ name: 'Agents', parts: ['Fleet Server', 'Elastic Agent', 'EDOT Collector'] },
			{ name: 'Optional', parts: ['APM Server', 'Logstash'] },
		],
		storage: 'Node disks · snapshots to S3, GCS or Azure Blob',
		caption:
			'Elasticsearch nodes hold data on local disks, split into data tiers. Fleet Server manages Elastic Agents, and self-managed OTLP goes through an EDOT Collector or Elastic Agent gateway. APM Server and Logstash are optional. Obzly runs from one image and writes Parquet to object storage.',
	},
	columns: ['Self-managed (free Basic)', 'Paid tiers / Elastic Cloud'],
	rows: [
		{ cap: 'License', obzly: 'Apache 2.0, every feature', a: 'SSPL, AGPLv3 or ELv2; default builds under ELv2', b: 'Paid features need a subscription', sources: [{ label: 'Licensing FAQ', url: 'https://www.elastic.co/pricing/faq/licensing' }] },
		{ cap: 'What you run', obzly: 'One image in up to five roles, Postgres, Valkey', a: 'Elasticsearch nodes, Kibana, Fleet Server, Elastic Agent or EDOT', b: 'Same, with ECK or ECE; nothing to run on Elastic Cloud', sources: [{ label: 'Deploy', url: 'https://www.elastic.co/docs/deploy-manage/deploy' }, { label: 'Fleet Server', url: 'https://www.elastic.co/docs/reference/fleet/fleet-server' }] },
		{ cap: 'Storage', obzly: 'ZSTD Parquet on S3, GCS, Azure Blob or MinIO', a: 'Indices on node disks; snapshots to S3, GCS or Azure', b: 'Searchable snapshots on object storage: Enterprise', sources: [{ label: 'Searchable snapshots', url: 'https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/searchable-snapshots' }, { label: 'Serverless differences', url: 'https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/differences-from-other-elasticsearch-offerings' }] },
		{ cap: 'OTLP in', obzly: 'Logs, metrics and traces, gRPC and HTTP', a: 'All three, through an EDOT Collector or Agent you run', b: 'Managed OTLP endpoint on Elastic Cloud', sources: [{ label: 'Managed OTLP', url: 'https://www.elastic.co/docs/reference/opentelemetry/motlp' }, { label: 'OTLP limitations', url: 'https://www.elastic.co/docs/solutions/observability/apm/opentelemetry/limitations' }] },
		{ cap: 'Query languages', obzly: 'Search bar and SQL for logs, PromQL, Jaeger API for traces', a: 'ES|QL, KQL, Lucene, Query DSL, EQL, SQL, PromQL', b: 'Same', sources: [{ label: 'Query languages', url: 'https://www.elastic.co/docs/explore-analyze/query-filter/languages' }, { label: 'PROMQL command', url: 'https://www.elastic.co/docs/reference/query-languages/esql/commands/promql' }] },
		{ cap: 'Prometheus', obzly: 'Remote-write ingest and a PromQL API', a: 'Remote write 1.0 and PromQL, both GA since 9.5', b: 'Same', sources: [{ label: 'Remote write', url: 'https://www.elastic.co/docs/manage-data/data-store/data-streams/tsds-ingest-prometheus-remote-write' }, { label: 'PROMQL command', url: 'https://www.elastic.co/docs/reference/query-languages/esql/commands/promql' }] },
		{ cap: 'Dashboards', obzly: 'Own dashboards; imports Grafana layouts, not Kibana', a: 'Kibana; Grafana through a migration CLI, still evolving', b: 'Same', sources: [{ label: 'Migration platform', url: 'https://www.elastic.co/observability-labs/blog/migrate-datadog-grafana-dashboards-alerts-to-kibana' }] },
		{ cap: 'Alerting', obzly: 'Webhook, Slack, PagerDuty, email', a: 'Rules included; only Server Log and Index connectors', b: 'Email, webhook, Slack, PagerDuty, Teams and more', sources: [{ label: 'Subscriptions', url: 'https://www.elastic.co/subscriptions' }, { label: 'Connectors', url: 'https://www.elastic.co/docs/reference/kibana/connectors-kibana' }] },
		{ cap: 'Synthetic checks', obzly: 'HTTP, TLS, TCP, DNS, ICMP from your probes; no browser', a: 'HTTP, TCP, ICMP and browser from private locations', b: "Adds Elastic's managed locations (Cloud only)", sources: [{ label: 'Private locations', url: 'https://www.elastic.co/docs/solutions/observability/synthetics/monitor-resources-on-private-networks' }, { label: 'Subscriptions', url: 'https://www.elastic.co/subscriptions' }] },
		{ cap: 'Infrastructure inventory', obzly: 'Clusters to containers, plus AWS and Azure resources', a: 'Hosts, pods, containers and AWS resources', b: 'Same', sources: [{ label: 'Infrastructure inventory', url: 'https://www.elastic.co/docs/solutions/observability/infra-and-hosts/view-infrastructure-metrics-by-resource-type' }] },
		{ cap: 'RUM and profiling', obzly: 'Neither', a: 'RUM (User Experience); no profiling', b: 'Universal Profiling: Enterprise, not on Serverless', sources: [{ label: 'User Experience', url: 'https://www.elastic.co/docs/solutions/observability/applications/user-experience' }, { label: 'Universal Profiling', url: 'https://www.elastic.co/docs/solutions/observability/infra-and-hosts/universal-profiling' }] },
		{ cap: 'SSO', obzly: 'OIDC with any provider; no SAML', a: 'Not available in Basic', b: 'SAML, OIDC, Kerberos, JWT: Platinum or Enterprise', sources: [{ label: 'Subscriptions', url: 'https://www.elastic.co/subscriptions' }, { label: 'Cloud SAML', url: 'https://www.elastic.co/docs/deploy-manage/users-roles/cloud-organization/configure-saml-authentication' }] },
		{ cap: 'SCIM', obzly: 'Included', a: 'Not supported', b: 'Not supported', sources: [{ label: 'Cloud SAML', url: 'https://www.elastic.co/docs/deploy-manage/users-roles/cloud-organization/configure-saml-authentication' }] },
		{ cap: 'RBAC and audit log', obzly: 'Per-project roles, teams, audit log with CSV export', a: 'Role-based access; no audit log', b: 'Audit log Gold and up; none on Serverless yet', sources: [{ label: 'Subscriptions', url: 'https://www.elastic.co/subscriptions' }, { label: 'Serverless differences', url: 'https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/differences-from-other-elasticsearch-offerings' }] },
		{ cap: 'MCP server', obzly: 'Built in at /mcp, read-only', a: 'Not in Basic; the standalone server is deprecated', b: 'Agent Builder MCP server: Enterprise or Serverless', sources: [{ label: 'Agent Builder MCP', url: 'https://www.elastic.co/docs/solutions/search/agent-builder/mcp-server' }, { label: 'Subscriptions', url: 'https://www.elastic.co/subscriptions' }, { label: 'Old MCP server', url: 'https://github.com/elastic/mcp-server-elasticsearch' }] },
		{ cap: 'Many regions', obzly: 'Control plane in front of many Sites', a: 'Cross-cluster search over remote clusters', b: 'Adds replication and cross-cluster ES|QL; none on Serverless', sources: [{ label: 'Cross-cluster search', url: 'https://www.elastic.co/docs/solutions/search/cross-cluster-search' }, { label: 'Subscriptions', url: 'https://www.elastic.co/subscriptions' }, { label: 'Pricing', url: 'https://www.elastic.co/pricing' }] },
		{ cap: 'Price', obzly: 'Free; you run the infrastructure', a: 'Free; you run the infrastructure', b: 'Hosted from $99/month; Serverless per GB; self-managed via sales', sources: [{ label: 'Pricing', url: 'https://www.elastic.co/pricing' }, { label: 'Cloud Hosted', url: 'https://www.elastic.co/pricing/cloud-hosted' }, { label: 'Serverless', url: 'https://www.elastic.co/pricing/serverless-observability' }] },
	],
	move: [
		{ lead: 'Send to both.', text: 'Add an OTLP exporter for Obzly to your EDOT or OpenTelemetry Collector next to the Elastic one.', link: { label: 'Collector guide', href: '/docs/how-to/kubernetes-otel-collector/' } },
		{ lead: 'Keep Prometheus flowing.', text: 'Add Obzly as a second remote-write target.', link: { label: 'PromQL and Grafana', href: '/docs/how-to/grafana-promql/' } },
		{ lead: 'Rebuild the dashboards you use.', text: "Obzly doesn't import Kibana dashboards. Recreate the panels with PromQL for metrics and search or SQL for logs." },
		{ lead: 'Rewrite alert rules.', text: 'KQL and ES|QL rules become Obzly log searches or PromQL rules. Connect Slack, PagerDuty, email or a webhook.', link: { label: 'Alerts', href: '/docs/how-to/alerts/' } },
		{ lead: 'Move uptime monitors.', text: 'HTTP, TCP and ICMP monitors map to Obzly checks from your own probes, which need a control plane. Browser monitors have no equivalent.', link: { label: 'Synthetics', href: '/docs/how-to/synthetics/' } },
		{ lead: 'Switch off the Elastic cluster', text: 'once Obzly has your full retention.' },
	],
	sources: [
		{ url: 'https://www.elastic.co/subscriptions', label: 'elastic.co/subscriptions', what: 'features by subscription tier' },
		{ url: 'https://www.elastic.co/pricing/faq/licensing', label: 'elastic.co/pricing/faq/licensing', what: 'SSPL, AGPLv3 and ELv2' },
		{ url: 'https://www.elastic.co/pricing/cloud-hosted', label: 'elastic.co/pricing/cloud-hosted', what: 'Elastic Cloud Hosted prices' },
		{ url: 'https://www.elastic.co/pricing/serverless-observability', label: 'elastic.co/pricing/serverless-observability', what: 'Serverless prices per GB' },
		{ url: 'https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/searchable-snapshots', label: 'Searchable snapshots docs', what: 'needs an Enterprise license' },
		{ url: 'https://www.elastic.co/docs/reference/opentelemetry/motlp', label: 'Managed OTLP docs', what: 'Elastic Cloud only; self-managed uses a gateway' },
		{ url: 'https://www.elastic.co/docs/manage-data/data-store/data-streams/tsds-ingest-prometheus-remote-write', label: 'Remote write docs', what: 'remote write 1.0 only' },
		{ url: 'https://www.elastic.co/docs/solutions/observability/synthetics/monitor-resources-on-private-networks', label: 'Private locations docs', what: 'synthetics from your own network' },
		{ url: 'https://www.elastic.co/docs/solutions/observability/infra-and-hosts/universal-profiling', label: 'Universal Profiling docs', what: 'not on Serverless' },
		{ url: 'https://www.elastic.co/observability-labs/blog/migrate-datadog-grafana-dashboards-alerts-to-kibana', label: 'Migration platform post', what: 'Grafana dashboards to Kibana' },
	],
};

export default page;
