// Obzly vs Splunk. Facts from Splunk's own pages, checked 27 October 2026.
import type { ToolPage } from './types';

const page: ToolPage = {
	slug: 'splunk',
	name: 'Splunk',
	tagline: 'Logs platform plus a separate observability cloud.',
	summary:
		'Splunk is two products. The Splunk platform handles logs and search with SPL: Splunk Enterprise runs on your infrastructure, and Splunk Cloud Platform is the same as a managed service. Splunk Observability Cloud is a separate SaaS service for metrics, traces, RUM and synthetics. Obzly covers logs, metrics and traces in one open-source system that you host.',
	cardObzly: 'one product for all three signals, open source',
	cardThem: 'you are standardised on SPL and Splunk apps',
	chooseObzly: [
		'you want logs, metrics and traces in one product that you host; with Splunk, metrics and traces live in Observability Cloud, which is SaaS only;',
		'you want an Apache 2.0 license and no ingest-based or per-host bill;',
		'you want to send all three signals over OTLP, logs included, straight to the backend;',
		'you query metrics with PromQL and send Prometheus remote write, so Grafana can sit on top;',
		"you need one login across regions, with each region's metrics and traces staying put as well as its logs.",
	],
	chooseThem: [
		'your teams work in SPL and depend on Splunk apps: Splunkbase lists over 1,000 apps and add-ons;',
		'you run logs at scale on your own hardware: indexer and search head clustering with SmartStore is proven, and far more mature than Obzly;',
		'you need GovCloud regions with FedRAMP High or Moderate and DoD IL5, or Federated Search across Splunk deployments and Amazon S3;',
		'you want real-time streaming analytics with SignalFlow, and detectors that notify ServiceNow, Opsgenie or xMatters;',
		'you need RUM, continuous profiling, browser synthetic tests or SAML, none of which Obzly has.',
	],
	run: {
		title: 'Splunk, self-managed and SaaS',
		top: { name: 'Splunk Observability Cloud', detail: 'SaaS only · metrics, traces, RUM, synthetics' },
		groups: [
			{ name: 'Forwarders', parts: ['on each host'] },
			{ name: 'Indexers', parts: ['clustered', 'SmartStore'] },
			{ name: 'Search heads', parts: ['clustered'] },
			{ name: 'Management', parts: ['deployment', 'cluster mgr', 'license mgr', 'monitoring', 'SH deployer'] },
		],
		storage: 'Indexer disks, or SmartStore object storage',
		caption:
			'The four boxes are Splunk Enterprise for logs, each indexer and search head usually on its own machine. Splunk Cloud Platform delivers it as a service that Splunk manages. Observability Cloud is a separate SaaS service. Obzly runs all three signals from one image, one role at a time.',
	},
	columns: ['Splunk Enterprise / Cloud Platform (logs)', 'Splunk Observability Cloud'],
	rows: [
		{ cap: 'License', obzly: 'Apache 2.0, every feature', a: 'Proprietary (Splunk General Terms)', b: 'Proprietary; Splunk OTel Collector is Apache 2.0', sources: [{ label: 'General Terms', url: 'https://www.splunk.com/en_us/legal/splunk-general-terms.html' }, { label: 'Splunk OTel Collector', url: 'https://github.com/signalfx/splunk-otel-collector' }] },
		{ cap: 'What you run', obzly: 'One image in up to five roles, Postgres, Valkey', a: 'Enterprise: forwarders, indexers, search heads; Cloud is managed', b: 'Collectors only; SaaS hosted in a Splunk realm', sources: [{ label: 'Enterprise components', url: 'https://help.splunk.com/en/splunk-enterprise/administer/distributed-deployment-manual/10.2/overview-of-splunk-enterprise-distributed-deployments/scale-your-deployment-with-splunk-enterprise-components' }, { label: 'Cloud Platform service', url: 'https://help.splunk.com/en/splunk-cloud-platform/get-started/service-terms-and-policies/10.6/information-about-the-service/splunk-cloud-platform-service-details' }, { label: 'Observability Cloud service', url: 'https://help.splunk.com/en/splunk-observability-cloud/get-started/service-description/splunk-observability-cloud-service-description' }] },
		{ cap: 'Storage', obzly: 'ZSTD Parquet on S3, GCS, Azure Blob or MinIO', a: 'SmartStore on S3, GCS or Azure (Enterprise); Cloud exports to S3/GCS', b: "In your org's Splunk realm; own storage not supported", sources: [{ label: 'SmartStore', url: 'https://help.splunk.com/en/splunk-enterprise/administer/manage-indexers-and-indexer-clusters/10.4/implement-smartstore-to-reduce-local-storage-requirements/about-smartstore' }, { label: 'Cloud Platform service', url: 'https://help.splunk.com/en/splunk-cloud-platform/get-started/service-terms-and-policies/10.6/information-about-the-service/splunk-cloud-platform-service-details' }, { label: 'Observability Cloud service', url: 'https://help.splunk.com/en/splunk-observability-cloud/get-started/service-description/splunk-observability-cloud-service-description' }] },
		{ cap: 'OTLP in', obzly: 'Logs, metrics and traces, gRPC and HTTP', a: 'Collector to HEC; OTLP add-on for Enterprise only, not Cloud', b: 'Traces over HTTP or gRPC, metrics over HTTP; no logs', sources: [{ label: 'Splunk Connect for OTLP', url: 'https://splunkbase.splunk.com/app/8704/' }, { label: 'OTLP/HTTP exporter', url: 'https://help.splunk.com/en/splunk-observability-cloud/manage-data/splunk-distribution-of-the-opentelemetry-collector/get-started-with-the-splunk-distribution-of-the-opentelemetry-collector/collector-components/exporters/otlphttp-exporter' }, { label: 'Metrics', url: 'https://help.splunk.com/en/splunk-observability-cloud/manage-data/metrics-metadata-and-events/metrics-events-and-metadata/get-started-with-metrics' }] },
		{ cap: 'Query languages', obzly: 'Search bar and SQL for logs, PromQL, Jaeger API for traces', a: 'SPL, also used from Observability Cloud via Log Observer Connect', b: 'SignalFlow for metrics; APM UI for traces', sources: [{ label: 'SignalFlow', url: 'https://help.splunk.com/en/splunk-observability-cloud/signalflow-analytics/signalflow-analytics' }, { label: 'Log Observer Connect', url: 'https://help.splunk.com/en/splunk-observability-cloud/manage-data/view-splunk-platform-logs/introduction-to-splunk-log-observer-connect' }] },
		{ cap: 'Prometheus', obzly: 'Remote-write ingest and a PromQL API', a: 'Not supported', b: 'Collector scrapes or receives remote write; PromQL not supported', sources: [{ label: 'Remote write receiver', url: 'https://help.splunk.com/en/splunk-observability-cloud/manage-data/splunk-distribution-of-the-opentelemetry-collector/get-started-with-the-splunk-distribution-of-the-opentelemetry-collector/collector-components/receivers/signalfx-gateway-prometheus-remote-write-receiver' }, { label: 'Supported integrations', url: 'https://help.splunk.com/en/splunk-observability-cloud/manage-data/available-data-sources/supported-integrations-in-splunk-observability-cloud' }] },
		{ cap: 'Dashboards', obzly: 'Own dashboards; imports Grafana layout without queries', a: 'Grafana dashboard import not supported', b: 'Same', sources: [] },
		{ cap: 'Alerting', obzly: 'Webhook, Slack, PagerDuty, email', a: 'Email and webhook built in; Slack, PagerDuty via Splunkbase apps', b: 'Email, Slack, PagerDuty, Teams, ServiceNow, Opsgenie, webhook and more', sources: [{ label: 'Alert actions', url: 'https://help.splunk.com/en/splunk-enterprise/alert-and-respond/alerting-manual/10.6/configure-alert-actions/set-up-alert-actions' }, { label: 'Slack app', url: 'https://splunkbase.splunk.com/app/2878/' }, { label: 'PagerDuty app', url: 'https://splunkbase.splunk.com/app/3013/' }, { label: 'Notification services', url: 'https://help.splunk.com/en/splunk-observability-cloud/manage-data/available-data-sources/supported-integrations-in-splunk-observability-cloud/notification-services' }] },
		{ cap: 'Synthetic checks', obzly: 'HTTP, TLS, TCP, DNS, ICMP from your probes; no browser', a: 'Part of Observability Cloud', b: 'Browser, uptime (HTTP, port) and API tests; private runners', sources: [{ label: 'Synthetic Monitoring', url: 'https://help.splunk.com/en/splunk-observability-cloud/monitor-end-user-experience/synthetic-monitoring/introduction-to-splunk-synthetic-monitoring' }, { label: 'Private locations', url: 'https://help.splunk.com/en/splunk-observability-cloud/monitor-end-user-experience/synthetic-monitoring/advanced-test-configurations/private-locations' }] },
		{ cap: 'Infrastructure inventory', obzly: 'Clusters to containers, plus AWS and Azure resources', a: 'Part of Observability Cloud', b: 'Hosts, Kubernetes, and AWS, Azure and GCP services', sources: [{ label: 'Navigators', url: 'https://help.splunk.com/en/splunk-observability-cloud/monitor-infrastructure/use-navigators' }] },
		{ cap: 'RUM and profiling', obzly: 'Neither', a: 'Part of Observability Cloud', b: 'RUM for browser and mobile; AlwaysOn Profiling in APM', sources: [{ label: 'Splunk RUM', url: 'https://help.splunk.com/en/splunk-observability-cloud/digital-experience-monitoring/real-user-monitoring/introduction-to-splunk-rum' }, { label: 'AlwaysOn Profiling', url: 'https://help.splunk.com/en/splunk-observability-cloud/monitor-application-performance/alwayson-profiling' }] },
		{ cap: 'SSO', obzly: 'OIDC with any provider; no SAML', a: 'SAML, and LDAP on Enterprise; OIDC not supported', b: 'SAML; OIDC not supported', sources: [{ label: 'Platform SAML', url: 'https://help.splunk.com/en/splunk-enterprise/administer/manage-users-and-security/9.2/use-saml-as-an-authentication-scheme-for-single-sign-on/configure-single-sign-on-with-saml' }, { label: 'Observability Cloud service', url: 'https://help.splunk.com/en/splunk-observability-cloud/get-started/service-description/splunk-observability-cloud-service-description' }] },
		{ cap: 'SCIM', obzly: 'Included', a: 'Set up with SAML; documented for Okta on Cloud Platform', b: 'Not supported', sources: [{ label: 'SSO with Okta', url: 'https://help.splunk.com/en/splunk-cloud-platform/administer/manage-users-and-security/10.3.2512/use-saml-as-an-authentication-scheme-for-single-sign-on/configure-sso-with-okta-as-your-identity-provider' }] },
		{ cap: 'RBAC and audit log', obzly: 'Per-project roles, teams, audit log with CSV export', a: 'Roles; audit events in index=_audit', b: 'Built-in and custom roles via Cloud Platform; Audit Events API', sources: [{ label: 'Audit Events API', url: 'https://dev.splunk.com/observability/reference/api/audit_events/latest/' }, { label: 'Custom roles', url: 'https://help.splunk.com/en/splunk-observability-cloud/administer/user-and-team-management/manage-roles/custom-roles' }, { label: 'Auditing', url: 'https://help.splunk.com/en/splunk-enterprise/administer/manage-users-and-security/10.2/audit-activity-in-splunk-enterprise/auditing-activities-in-a-splunk-platform-instance' }] },
		{ cap: 'MCP server', obzly: 'Built in at /mcp, read-only', a: 'Splunk MCP Server app from Splunkbase', b: 'Hosted MCP gateway; not in Google Cloud or GovCloud realms', sources: [{ label: 'Platform MCP Server', url: 'https://help.splunk.com/en/splunk-cloud-platform/mcp-server-for-splunk-platform/1.1/about-mcp-server-for-splunk-platform' }, { label: 'Observability MCP', url: 'https://help.splunk.com/en/splunk-observability-cloud/splunk-ai-assistant/interact-with-your-observability-data-using-the-splunk-mcp-server' }] },
		{ cap: 'Many regions', obzly: 'Control plane in front of many Sites', a: 'Federated Search across Splunk deployments', b: 'One realm per org; a view across realms not supported', sources: [{ label: 'Cloud Platform service', url: 'https://help.splunk.com/en/splunk-cloud-platform/get-started/service-terms-and-policies/10.6/information-about-the-service/splunk-cloud-platform-service-details' }, { label: 'Observability Cloud service', url: 'https://help.splunk.com/en/splunk-observability-cloud/get-started/service-description/splunk-observability-cloud-service-description' }] },
		{ cap: 'Price', obzly: 'Free; you run the infrastructure', a: 'Ingest or workload pricing by quote; Free license 500 MB/day', b: 'Infrastructure from $15 per host/month, billed annually; free edition', sources: [{ label: 'Pricing', url: 'https://www.splunk.com/en_us/products/pricing.html' }, { label: 'Observability pricing', url: 'https://www.splunk.com/en_us/products/pricing/observability.html' }, { label: 'License types', url: 'https://help.splunk.com/en/data-management/splunk-enterprise-admin-manual/10.2/configure-splunk-licenses/types-of-splunk-enterprise-licenses' }] },
	],
	move: [
		{ lead: 'Run Obzly where your data must live.', text: 'Install it in your own cluster or cloud account.', link: { label: 'Helm', href: '/docs/deploy/helm/' } },
		{ lead: 'Send to both.', text: 'Add an OTLP exporter for Obzly to your OpenTelemetry Collector next to the Splunk exporters, so both receive the same data.', link: { label: 'Collector guide', href: '/docs/how-to/kubernetes-otel-collector/' } },
		{ lead: 'Bring logs over OTLP.', text: 'Logs that reach Splunk through forwarders need a Collector or another OTLP sender to reach Obzly.', link: { label: 'Send logs', href: '/docs/getting-started/send-first-logs/' } },
		{ lead: 'Rebuild searches, charts and detectors.', text: "SPL searches and SignalFlow charts don't carry over. Recreate them with Obzly's log search, SQL and PromQL, and turn detectors and alerts into Obzly alert rules.", link: { label: 'Alerts', href: '/docs/how-to/alerts/' } },
		{ lead: 'Move uptime and API tests.', text: 'Recreate them as HTTP, TLS, TCP, DNS or ICMP checks from your own probes. Obzly synthetics need a control plane, and browser tests have no equivalent.', link: { label: 'Synthetics', href: '/docs/how-to/synthetics/' } },
		{ lead: 'Switch off Splunk', text: 'once Obzly has your full retention.' },
	],
	sources: [
		{ url: 'https://www.splunk.com/en_us/products/pricing.html', label: 'splunk.com/pricing', what: 'platform pricing models' },
		{ url: 'https://www.splunk.com/en_us/products/pricing/observability.html', label: 'splunk.com observability pricing', what: 'Observability Cloud prices, billed annually' },
		{ url: 'https://help.splunk.com/en/splunk-enterprise/administer/distributed-deployment-manual/10.2/overview-of-splunk-enterprise-distributed-deployments/scale-your-deployment-with-splunk-enterprise-components', label: 'Enterprise components docs', what: 'forwarders, indexers, search heads, management' },
		{ url: 'https://help.splunk.com/en/splunk-enterprise/administer/manage-indexers-and-indexer-clusters/10.4/implement-smartstore-to-reduce-local-storage-requirements/about-smartstore', label: 'SmartStore docs', what: 'indexed data on object storage' },
		{ url: 'https://help.splunk.com/en/splunk-observability-cloud/get-started/service-description/splunk-observability-cloud-service-description', label: 'Observability Cloud service description', what: 'realms, SAML' },
		{ url: 'https://help.splunk.com/en/splunk-cloud-platform/get-started/service-terms-and-policies/10.6/information-about-the-service/splunk-cloud-platform-service-details', label: 'Cloud Platform service details', what: 'regions, Federated Search, data export' },
		{ url: 'https://help.splunk.com/en/splunk-observability-cloud/manage-data/metrics-metadata-and-events/metrics-events-and-metadata/get-started-with-metrics', label: 'Metrics docs', what: 'OTLP over HTTP only; no logs' },
		{ url: 'https://help.splunk.com/en/splunk-observability-cloud/signalflow-analytics/signalflow-analytics', label: 'SignalFlow docs', what: 'metrics analytics language' },
		{ url: 'https://help.splunk.com/en/splunk-observability-cloud/monitor-end-user-experience/synthetic-monitoring/introduction-to-splunk-synthetic-monitoring', label: 'Synthetic Monitoring docs', what: 'browser, uptime and API tests' },
		{ url: 'https://splunkbase.splunk.com/', label: 'splunkbase.splunk.com', what: '1000+ apps and add-ons' },
	],
};

export default page;
