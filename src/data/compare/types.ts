// Shape of a comparison page (/compare/<slug>/). Every fact about another tool must come from
// that vendor's own pages; list them in `sources` and link the ones each table row relies on.

/** Label shown in a table cell. */
export type State = 'yes' | 'part' | 'paid' | 'saas' | 'no' | 'unsup';

export const STATE_LABEL: Record<State, string> = {
	yes: 'Included',
	part: 'Partial',
	paid: 'Paid feature',
	saas: 'SaaS only',
	no: 'Not available',
	unsup: 'Not supported',
};

export interface Link {
	label: string;
	url: string;
}

export interface RunGroup {
	/** Service name, e.g. "Loki". */
	name: string;
	/** Its components, at most 5, each at most 14 characters so it fits the drawing. */
	parts: string[];
}

export interface ToolPage {
	slug: string;
	/** Name as used in headings, e.g. "Grafana LGTM". */
	name: string;
	/** One-line description for the hub card. */
	tagline: string;
	/** Page lede: what the tool is and how Obzly relates to it. */
	summary: string;
	/** Hub card: "Choose Obzly if ..." and "Choose <name> if ...", one short clause each. */
	cardObzly: string;
	cardThem: string;
	chooseObzly: string[];
	chooseThem: string[];
	run: {
		/** Label above the left half of the drawing. */
		title: string;
		/** Optional full-width box on top, e.g. the UI. */
		top?: { name: string; detail: string };
		/** Up to 4 boxes side by side. */
		groups: RunGroup[];
		/** Bottom bar, e.g. where data is stored. */
		storage: string;
		caption: string;
	};
	/** Headers of the two columns for the other tool, e.g. its free and paid editions. */
	columns: [string, string];
	rows: { cap: string; obzly: string; a: string; b: string; sources: Link[] }[];
	/** Optional "Use both" section. */
	both?: { intro: string; items: { title: string; text: string }[] };
	move: { lead: string; text: string; link?: { label: string; href: string } }[];
	sources: { url: string; label: string; what: string }[];
}
