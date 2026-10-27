// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';

const GITHUB = 'https://github.com/obzly/obzly';

// https://astro.build/config
export default defineConfig({
	site: 'https://obzly.com',
	integrations: [
		starlight({
			title: 'Obzly',
			description: 'Self-hosted observability, from one container to an enterprise cluster.',
			logo: { src: './src/assets/logo.svg' },
			favicon: '/favicon.svg',
			social: [{ icon: 'github', label: 'GitHub', href: GITHUB }],
			components: { SocialIcons: './src/components/HeaderLinks.astro' },
			customCss: ['@fontsource-variable/jost', './src/styles/custom.css'],
			// The marketing pages are plain Astro pages in src/pages/, outside the docs collection.
			plugins: [starlightLinksValidator({ exclude: ['/', '/features/', '/architecture/'] })],
			sidebar: [
				{
					label: 'Getting started',
					items: [
						{ label: 'Overview', slug: 'docs' },
						'docs/getting-started/requirements',
						'docs/getting-started/quick-install',
						'docs/getting-started/docker-compose',
						'docs/getting-started/first-project',
						'docs/getting-started/send-first-logs',
					],
				},
				{
					label: 'Deploy',
					items: [
						'docs/deploy/docker',
						'docs/deploy/helm',
						'docs/deploy/kubernetes-eks',
						'docs/deploy/multi-site',
						'docs/deploy/probe',
					],
				},
				{
					label: 'How-tos',
					items: [
						'docs/how-to/kubernetes-otel-collector',
						'docs/how-to/synthetics',
						'docs/how-to/infrastructure',
						'docs/how-to/cloud-connections',
						'docs/how-to/grafana-promql',
						'docs/how-to/mcp',
						'docs/how-to/alerts',
						'docs/how-to/sso-scim',
						'docs/how-to/promoted-fields',
					],
				},
				{
					label: 'Operations',
					items: [
						'docs/operations/upgrade',
						'docs/operations/backup-restore',
						'docs/operations/disaster-recovery',
						'docs/operations/monitoring',
					],
				},
				{
					label: 'Reference',
					items: [
						'docs/reference/configuration',
						'docs/reference/log-query-api',
						'docs/reference/data-sources',
					],
				},
			],
		}),
	],
});
