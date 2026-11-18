// Share images for link previews (Open Graph / X cards), one per page, built at `astro build`.
import type { APIRoute, GetStaticPaths } from 'astro';
import { allCards, type Card } from '../../seo/cards';
import { renderCard } from '../../seo/render';

export const getStaticPaths = (async () =>
	(await allCards()).map((card) => ({ params: { slug: card.slug }, props: { card } }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ card: Card }> = async ({ props }) =>
	new Response(new Uint8Array(await renderCard(props.card)), { headers: { 'Content-Type': 'image/png' } });
