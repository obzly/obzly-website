// Every page that gets its own share image, with the text drawn on it.
import { getCollection } from 'astro:content';
import { PAGES } from '../data/compare/index';
import { pageSlug } from './site';

export interface Card {
	/** Page path without slashes (see pageSlug); the image is served at /og/<slug>.png. */
	slug: string;
	/** Small label above the title, e.g. "Docs · How-tos". */
	label: string;
	title: string;
	subtitle: string;
}

/** Marketing pages (src/pages/*.astro), keyed by path. A page missing here uses the home page's image. */
const MARKETING: Record<string, Omit<Card, 'slug'>> = {
	'/': {
		label: 'Open source · Apache 2.0',
		title: 'Self-hosted observability, from one container to an enterprise cluster',
		subtitle: 'Logs, traces and metrics on OpenTelemetry. Data lands as Parquet in your own bucket.',
	},
	'/features/': {
		label: 'Features',
		title: 'Everything in one open-source image',
		subtitle: 'Logs, traces, metrics, synthetics, infrastructure, cloud cost and posture, alerts and MCP.',
	},
	'/architecture/': {
		label: 'Architecture',
		title: 'How Obzly runs',
		subtitle: 'One image with api, worker, broker, querier and control-plane roles. Parquet on object storage.',
	},
	'/compare/': {
		label: 'Compare',
		title: 'How Obzly compares',
		subtitle: 'Grafana LGTM, Elastic, OpenObserve, SigNoz, Datadog and Splunk, from each vendor’s own docs.',
	},
	'/community/': {
		label: 'Community',
		title: 'Help, bugs and how-tos',
		subtitle: 'Ask questions, report bugs and share what you built on GitHub Issues and Discussions.',
	},
	'/donate/': {
		label: 'Support Obzly',
		title: 'Free and open source',
		subtitle: 'If Obzly helps you, give to a registered charity or NGO of your choice.',
	},
	'/disclaimer/': {
		label: 'Disclaimer',
		title: 'Provided as is',
		subtitle: 'What free, open-source software without warranty means for you and your data.',
	},
};

/** Docs folder -> sidebar group label. */
export const DOCS_SECTIONS: Record<string, string> = {
	'getting-started': 'Getting started',
	deploy: 'Deploy',
	'how-to': 'How-tos',
	operations: 'Operations',
	reference: 'Reference',
};

export function hasMarketingCard(pathname: string): boolean {
	return pathname in MARKETING;
}

/** Docs pages, without Starlight's 404 entry. */
export async function docsPages() {
	return (await getCollection('docs')).filter((e) => e.id !== '404');
}

export function docsSection(id: string): string | undefined {
	return DOCS_SECTIONS[id.split('/')[1] ?? ''];
}

export async function allCards(): Promise<Card[]> {
	const marketing = Object.entries(MARKETING).map(([path, card]) => ({ slug: pageSlug(path), ...card }));
	const compare = PAGES.map((p) => ({
		slug: `compare/${p.slug}`,
		label: 'Compare',
		title: `Obzly vs ${p.name}`,
		subtitle: p.tagline,
	}));
	const docs = (await docsPages()).map((e) => {
		const section = docsSection(e.id);
		return {
			slug: e.id,
			label: section ? `Docs · ${section}` : 'Docs',
			title: e.data.title,
			subtitle: e.data.description ?? '',
		};
	});
	return [...marketing, ...compare, ...docs];
}
