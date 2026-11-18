// What search engines and link previews read about the site: share-image URLs and
// structured data (schema.org JSON-LD). Used by the marketing layout and the docs route middleware.

export const SITE = 'https://obzly.com';
export const GITHUB_ORG = 'https://github.com/obzly';
export const GITHUB = 'https://github.com/obzly/obzly';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** The page's path without slashes, `index` for the home page: `/compare/datadog/` -> `compare/datadog`. */
export function pageSlug(pathname: string): string {
	return pathname.replace(/^\/+|\/+$/g, '') || 'index';
}

/** The share image generated for a page (see src/pages/og/[...slug].png.ts). */
export function ogImageUrl(pathname: string): string {
	return new URL(`/og/${pageSlug(pathname)}.png`, SITE).href;
}

const ORG_ID = `${SITE}/#organization`;

/** Who publishes the site. Google reads it from the home page for the name and logo in results. */
export const organization = {
	'@type': 'Organization',
	'@id': ORG_ID,
	name: 'Obzly',
	url: `${SITE}/`,
	logo: `${SITE}/logo.png`,
	sameAs: [GITHUB_ORG, GITHUB],
};

export const website = {
	'@type': 'WebSite',
	'@id': `${SITE}/#website`,
	name: 'Obzly',
	url: `${SITE}/`,
	publisher: { '@id': ORG_ID },
};

export function softwareApplication(description: string) {
	return {
		'@type': 'SoftwareApplication',
		name: 'Obzly',
		description,
		url: `${SITE}/`,
		applicationCategory: 'DeveloperApplication',
		operatingSystem: 'Linux, Docker, Kubernetes',
		downloadUrl: `${GITHUB}/releases/latest`,
		license: 'https://www.apache.org/licenses/LICENSE-2.0',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		image: ogImageUrl('/'),
		publisher: { '@id': ORG_ID },
	};
}

/** Breadcrumbs as Google shows them under the result title. The last crumb is the page itself. */
export function breadcrumbs(crumbs: { name: string; path?: string }[]) {
	return {
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((c, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: c.name,
			...(c.path ? { item: new URL(c.path, SITE).href } : {}),
		})),
	};
}

/** One `<script type="application/ld+json">` body for one or more schema.org nodes. */
export function jsonLd(nodes: object[]): string {
	// `<` is escaped so text in the data can never close the script element.
	return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
