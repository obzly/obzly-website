// A 512 px PNG of the logo for structured data (Organization.logo), from src/assets/logo.svg.
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import logoSvg from '../assets/logo.svg?raw';

export const GET: APIRoute = async () => {
	const png = await sharp(Buffer.from(logoSvg), { density: 300 }).resize(512, 512).png().toBuffer();
	return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
