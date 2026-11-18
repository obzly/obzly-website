// Draws a share image (1200x630 PNG) in the app's dark Emerald theme. Satori turns the layout
// into an SVG with the text as outlines (so no system fonts are needed), then sharp makes the PNG.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import sharp from 'sharp';
import logoSvg from '../assets/logo.svg?raw';
import type { Card } from './cards';
import { OG_HEIGHT, OG_WIDTH } from './site';

const require = createRequire(import.meta.url);

// Same tokens as src/styles/marketing.css (dark).
const BG = '#0a1210';
const BORDER = '#21312b';
const TEXT = '#e8f0ec';
const MUTED = '#9aaba4';
const ACCENT = '#10b981';

let assets: Promise<{ fonts: { name: string; data: Buffer; weight: 500 | 600 }[]; logo: string }> | undefined;

function loadAssets() {
	assets ??= (async () => {
		const font = (weight: number) => readFile(require.resolve(`@fontsource/jost/files/jost-latin-${weight}-normal.woff`));
		// The logo is drawn as a PNG: an SVG inside satori's SVG would depend on sharp's SVG support.
		const logoPng = await sharp(Buffer.from(logoSvg), { density: 300 })
			.resize(144, 144)
			.png()
			.toBuffer();
		return {
			fonts: [
				{ name: 'Jost', data: await font(500), weight: 500 },
				{ name: 'Jost', data: await font(600), weight: 600 },
			],
			logo: `data:image/png;base64,${logoPng.toString('base64')}`,
		};
	})();
	return assets;
}

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): Node => ({
	type,
	props: { style, children, ...extra },
});

/** Shortens text to about `max` characters at a word boundary. */
function clip(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

export async function renderCard(card: Card): Promise<Buffer> {
	const { fonts, logo } = await loadAssets();
	const title = clip(card.title, 90);
	const titleSize = title.length > 60 ? 58 : title.length > 34 ? 66 : 76;

	// Fixed sizes rather than padding: satori adds padding to a 100% box, which pushes content off the canvas.
	const MX = 72;
	const MY = 56;
	const BAR = 10;
	const tree = h(
		'div',
		{
			width: OG_WIDTH,
			height: OG_HEIGHT,
			display: 'flex',
			flexDirection: 'column',
			background: `radial-gradient(circle at 88% 8%, rgba(16,185,129,0.22), rgba(16,185,129,0) 46%), ${BG}`,
			color: TEXT,
			fontFamily: 'Jost',
		},
		[
			h(
				'div',
				{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					width: OG_WIDTH - 2 * MX,
					height: OG_HEIGHT - 2 * MY - BAR,
					margin: `${MY}px ${MX}px`,
				},
				[
					h('div', { display: 'flex', alignItems: 'center', gap: '22px' }, [
						h('img', { width: 72, height: 72 }, undefined, { src: logo, width: 72, height: 72 }),
						h('div', { fontSize: 44, fontWeight: 600, letterSpacing: '-0.5px' }, 'Obzly'),
					]),
					h(
						'div',
						{ display: 'flex', flexDirection: 'column', gap: '20px' },
						[
							h('div', { fontSize: 26, fontWeight: 600, color: ACCENT, textTransform: 'uppercase', letterSpacing: '2px' }, card.label),
							h('div', { fontSize: titleSize, fontWeight: 600, lineHeight: 1.08, letterSpacing: '-1px' }, title),
							card.subtitle
								? h('div', { fontSize: 30, fontWeight: 500, lineHeight: 1.35, color: MUTED }, clip(card.subtitle, 120))
								: null,
						].filter(Boolean),
					),
					h(
						'div',
						{
							display: 'flex',
							justifyContent: 'space-between',
							fontSize: 24,
							fontWeight: 500,
							color: MUTED,
							borderTop: `1px solid ${BORDER}`,
							paddingTop: '20px',
						},
						[h('div', {}, 'obzly.com'), h('div', {}, 'Open source · Self-hosted · OpenTelemetry')],
					),
				],
			),
			h('div', { width: OG_WIDTH, height: BAR, background: ACCENT }),
		],
	);

	const svg = await satori(tree as unknown as Parameters<typeof satori>[0], { width: OG_WIDTH, height: OG_HEIGHT, fonts });
	return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
