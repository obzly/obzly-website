// /llms.txt (https://llmstxt.org): a plain-text map of the site for AI assistants and answer
// engines, generated from the docs and compare pages so it never goes stale.
import type { APIRoute } from 'astro';
import { PAGES } from '../data/compare/index';
import { DOCS_SECTIONS, docsPages, docsSection } from '../seo/cards';
import { GITHUB, SITE } from '../seo/site';

const link = (title: string, path: string, about?: string) => `- [${title}](${new URL(path, SITE).href})${about ? `: ${about}` : ''}`;

export const GET: APIRoute = async () => {
	const docs = await docsPages();
	const sections = Object.values(DOCS_SECTIONS).map((label) => {
		const pages = docs.filter((e) => docsSection(e.id) === label);
		return [`## Docs: ${label}`, '', ...pages.map((e) => link(e.data.title, `/${e.id}/`, e.data.description))].join('\n');
	});

	const body = [
		'# Obzly',
		'',
		'> Obzly is open-source (Apache 2.0), self-hosted observability: logs, traces and metrics over OpenTelemetry (OTLP),',
		'> stored as Parquet on S3-compatible object storage, plus synthetic monitoring, an infrastructure inventory, cloud cost',
		'> and posture, dashboards, alerts and an MCP server. It runs as one container or as a multi-site enterprise cluster.',
		'',
		`Source code and releases: ${GITHUB}. Live demo with sample data: https://demo.obzly.com.`,
		'',
		'## Overview',
		'',
		link('Home', '/', 'what Obzly is and how it works'),
		link('Features', '/features/', 'everything in the open-source image'),
		link('Architecture', '/architecture/', 'roles, ingest, storage, multi-site and probes'),
		link('Docs overview', '/docs/', 'requirements and where each part of the docs is'),
		'',
		...sections.flatMap((s) => [s, '']),
		'## Compare',
		'',
		link('How Obzly compares', '/compare/', 'feature matrix against other observability tools'),
		...PAGES.map((p) => link(`Obzly vs ${p.name}`, `/compare/${p.slug}/`, p.tagline)),
		'',
		'## Optional',
		'',
		link('Community and support', '/community/'),
		link('Disclaimer', '/disclaimer/'),
		'',
	].join('\n');
	return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
