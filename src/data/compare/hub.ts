// The summary table on /compare/. Each cell is [state, short note]; the facts behind the cells
// are sourced on each tool's own comparison page.
import type { State } from './types';

export const CHECKED = '27 October 2026';

/** Column order; `slug` links the column header to its comparison page. */
export const TOOLS: { name: string; slug?: string }[] = [
	{ name: 'Obzly' },
	{ name: 'Grafana LGTM', slug: 'grafana' },
	{ name: 'Elastic', slug: 'elastic' },
	{ name: 'OpenObserve', slug: 'openobserve' },
	{ name: 'SigNoz', slug: 'signoz' },
	{ name: 'Datadog', slug: 'datadog' },
	{ name: 'Splunk', slug: 'splunk' },
];

type Cell = [State, string];

export const ROWS: { cap: string; cells: Cell[] }[] = [
	{
		cap: 'Self-hosted',
		cells: [
			['yes', 'Every feature, one image'],
			['yes', 'OSS or Enterprise'],
			['yes', 'Self-managed cluster'],
			['yes', 'Open source or Enterprise'],
			['yes', 'Community or Enterprise'],
			['no', 'SaaS; BYOC Logs only'],
			['part', 'Splunk Enterprise for logs'],
		],
	},
	{
		cap: 'License',
		cells: [
			['yes', 'Apache 2.0, no paid edition'],
			['part', 'AGPLv3; Enterprise proprietary'],
			['part', 'SSPL, AGPLv3 or ELv2'],
			['part', 'AGPL-3.0; Enterprise EULA'],
			['part', 'MIT; ee/ proprietary'],
			['no', 'Proprietary'],
			['no', 'Proprietary'],
		],
	},
	{
		cap: 'What you run',
		cells: [
			['yes', 'One image, Postgres, Valkey'],
			['part', 'Grafana, Loki, Mimir, Tempo'],
			['part', 'Elasticsearch, Kibana, agents'],
			['yes', 'One binary; HA adds Postgres, NATS'],
			['part', 'ClickHouse, Keeper, Postgres, collector'],
			['no', 'Nothing (SaaS)'],
			['part', 'Forwarders, indexers, search heads'],
		],
	},
	{
		cap: 'Data in your object storage',
		cells: [
			['yes', 'Parquet on S3, GCS, Azure'],
			['yes', 'Primary store for all signals'],
			['paid', 'Searchable snapshots: Enterprise'],
			['yes', 'Parquet on S3, GCS, Azure'],
			['part', 'Optional S3/GCS cold tier'],
			['part', 'Log archives to your bucket'],
			['part', 'SmartStore (Enterprise)'],
		],
	},
	{
		cap: 'OTLP in',
		cells: [
			['yes', 'Logs, metrics, traces'],
			['yes', 'Logs, metrics, traces'],
			['yes', 'All three; self-managed via collector'],
			['yes', 'All three, plus profiles'],
			['yes', 'Logs, metrics, traces'],
			['yes', 'All three, agentless intake'],
			['part', 'Traces and metrics; logs via HEC'],
		],
	},
	{
		cap: 'PromQL and remote write',
		cells: [
			['yes', 'Both'],
			['yes', 'Both (Mimir)'],
			['yes', 'Both, since 9.5'],
			['yes', 'Both'],
			['part', 'PromQL in dashboards; no remote write'],
			['part', 'Remote write via Pipelines (preview); no PromQL'],
			['unsup', 'Collector only; PromQL unsupported'],
		],
	},
	{
		cap: 'Grafana dashboards',
		cells: [
			['part', 'Imports layout; you add queries'],
			['yes', 'Native format'],
			['part', 'Migration CLI, still evolving'],
			['part', 'Through a migrator tool'],
			['no', 'Rebuild by hand'],
			['part', 'Migration tool in preview'],
			['unsup', 'Dashboard import unsupported'],
		],
	},
	{
		cap: 'Synthetic checks',
		cells: [
			['part', 'HTTP, TLS, TCP, DNS, ICMP; no browser'],
			['saas', 'Grafana Cloud, incl. browser'],
			['yes', 'HTTP, TCP, ICMP, browser'],
			['part', 'Beta; private locations paid'],
			['no', 'Collector httpcheck only'],
			['yes', 'API, browser, private locations'],
			['yes', 'API, uptime, browser'],
		],
	},
	{
		cap: 'RUM and profiling',
		cells: [
			['no', 'Neither'],
			['part', 'RUM in Cloud; Pyroscope'],
			['part', 'RUM; profiling Enterprise'],
			['yes', 'RUM, replay, profiling'],
			['part', 'Frontend monitoring; no profiling'],
			['paid', 'Both, billed separately'],
			['yes', 'Both'],
		],
	},
	{
		cap: 'SSO',
		cells: [
			['yes', 'OIDC; no SAML'],
			['paid', 'OAuth free; SAML Enterprise'],
			['paid', 'Platinum or Enterprise'],
			['paid', 'Enterprise or Cloud'],
			['paid', 'SAML/OIDC paid; Google free'],
			['paid', 'SAML on Pro and up'],
			['yes', 'SAML'],
		],
	},
	{
		cap: 'SCIM and audit log',
		cells: [
			['yes', 'Both included'],
			['paid', 'Enterprise or Cloud'],
			['paid', 'Audit Gold+; SCIM unsupported'],
			['paid', 'Audit paid; SCIM not documented'],
			['no', 'No audit log yet'],
			['paid', 'SCIM Pro+; audit +2% of spend'],
			['part', 'SCIM platform only; audit on both'],
		],
	},
	{
		cap: 'Many regions, one place',
		cells: [
			['yes', 'Control plane + Sites'],
			['part', 'Federation experimental (GEM)'],
			['part', 'Cross-cluster search'],
			['paid', 'Super Cluster: Enterprise'],
			['unsup', 'Federation unsupported'],
			['part', 'Child orgs, same site'],
			['part', 'Federated Search (platform)'],
		],
	},
];

/** Ways to move over that work with every tool. */
export const MOVE = [
	{ title: 'Change one endpoint', text: "Point your OpenTelemetry Collector's OTLP exporter at Obzly. Nothing in your apps changes." },
	{ title: 'Keep your Grafana', text: 'Add Obzly as a Prometheus data source and a Jaeger data source, and keep using your Grafana dashboards.' },
	{ title: 'Keep Prometheus', text: 'Send Prometheus remote-write to Obzly, or keep scraping with the Collector.' },
	{ title: 'Run both for a while', text: 'Export to both backends until you trust the new one, then switch off the old one.' },
];
