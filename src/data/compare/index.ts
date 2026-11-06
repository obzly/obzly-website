// Every comparison page: each src/data/compare/<slug>.ts that default-exports a ToolPage.
import { TOOLS } from './hub';
import type { ToolPage } from './types';

const modules = import.meta.glob<{ default: ToolPage }>(['./*.ts', '!./index.ts', '!./hub.ts', '!./types.ts'], {
	eager: true,
});

const bySlug = new Map(Object.values(modules).map((m) => [m.default.slug, m.default]));

/** Pages in the hub's column order. */
export const PAGES: ToolPage[] = TOOLS.flatMap((t) => (t.slug && bySlug.has(t.slug) ? [bySlug.get(t.slug)!] : []));
