// Starlight route middleware: adds each docs page's share image and breadcrumb structured data
// to the <head> Starlight already builds (title, description, canonical, og:title, ...).
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { docsPages } from './seo/cards';
import { OG_HEIGHT, OG_WIDTH, breadcrumbs, jsonLd, ogImageUrl } from './seo/site';

export const onRequest = defineRouteMiddleware(async (context) => {
	const route = context.locals.starlightRoute;
	const { id, data } = route.entry;
	// Only pages that have a generated image (not the 404 page).
	if (!(await docsPages()).some((e) => e.id === id)) return;

	const image = ogImageUrl(context.url.pathname);
	const alt = `${data.title} · Obzly docs`;
	route.head.push(
		{ tag: 'meta', attrs: { property: 'og:image', content: image } },
		{ tag: 'meta', attrs: { property: 'og:image:width', content: String(OG_WIDTH) } },
		{ tag: 'meta', attrs: { property: 'og:image:height', content: String(OG_HEIGHT) } },
		{ tag: 'meta', attrs: { property: 'og:image:alt', content: alt } },
		{ tag: 'meta', attrs: { name: 'twitter:image', content: image } },
	);

	const crumbs =
		id === 'docs'
			? [{ name: 'Obzly', path: '/' }, { name: 'Docs' }]
			: [{ name: 'Obzly', path: '/' }, { name: 'Docs', path: '/docs/' }, { name: data.title }];
	route.head.push({ tag: 'script', attrs: { type: 'application/ld+json' }, content: jsonLd([breadcrumbs(crumbs)]) });
});
