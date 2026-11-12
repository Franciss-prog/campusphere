// Action Campaigns: pure helpers shared by the server service, pages and unit tests.
import { CAMPAIGNS, type Campaign } from './content/site.ts';
import { plural } from './format.ts';
import type { ConcernStatus } from './status.ts';

/** Compact public feed rows (no counters that invite interaction, no identifiers). */
export type ConcernRow = {
	id: number;
	title: string;
	status: ConcernStatus;
	categoryName: string | null;
	createdAt: Date;
};
export type ArticleRow = {
	slug: string;
	title: string;
	excerpt: string | null;
	categoryName: string | null;
	/** Already anonymized ("Campusphere team" or a per-post anonymous label). */
	byline: string;
	createdAt: Date;
};

export type CampaignSlug = (typeof CAMPAIGNS)[number]['slug'];

export type CampaignProgress = {
	/** False when the campaign's tag is missing from the database (counts are then all zero). */
	tagExists: boolean;
	articles: number;
	concerns: number;
	recommendations: number;
	/** Resolved concerns and recommendations. */
	resolved: number;
	/** Concerns plus recommendations. */
	total: number;
};

/** The campaign for a slug from a query string or route param; null for anything unknown. */
export function findCampaign(slug: string | null | undefined): Campaign | null {
	if (!slug) return null;
	const s = slug.trim().toLowerCase();
	return CAMPAIGNS.find((c) => c.slug === s) ?? null;
}

export const CAMPAIGN_SLUGS: string[] = CAMPAIGNS.map((c) => c.slug);

export function emptyProgress(tagExists = false): CampaignProgress {
	return { tagExists, articles: 0, concerns: 0, recommendations: 0, resolved: 0, total: 0 };
}

export type ConcernCountRow = {
	slug: string;
	kind: 'concern' | 'recommendation';
	n: number;
	resolved: number;
};
export type PostCountRow = { slug: string; n: number };

/** Turns grouped count rows into one progress entry per requested slug (zeros when absent). */
export function shapeProgress(
	slugs: readonly string[],
	tagSlugs: readonly string[],
	concernRows: readonly ConcernCountRow[],
	postRows: readonly PostCountRow[]
): Record<string, CampaignProgress> {
	const tags = new Set(tagSlugs);
	const out: Record<string, CampaignProgress> = {};
	for (const s of slugs) out[s] = emptyProgress(tags.has(s));
	for (const r of concernRows) {
		const p = out[r.slug];
		if (!p) continue;
		const n = Number(r.n);
		if (r.kind === 'concern') p.concerns += n;
		else p.recommendations += n;
		p.resolved += Number(r.resolved);
		p.total += n;
	}
	for (const r of postRows) {
		const p = out[r.slug];
		if (p) p.articles += Number(r.n);
	}
	return out;
}

/** "2 articles · 5 concerns · 3 resolved". Empty string when there is nothing to show. */
export function progressLine(p: CampaignProgress): string {
	const parts: string[] = [];
	if (p.articles) parts.push(plural(p.articles, 'article'));
	if (p.concerns) parts.push(plural(p.concerns, 'concern'));
	if (p.recommendations) parts.push(plural(p.recommendations, 'recommendation'));
	if (p.resolved) parts.push(`${p.resolved.toLocaleString('en-US')} resolved`);
	return parts.join(' · ');
}

/** Plain-language caption for a resolved-vs-total bar. */
export function resolvedCaption(p: CampaignProgress): string {
	if (!p.total) return 'No concerns or recommendations yet';
	return `${p.resolved.toLocaleString('en-US')} of ${p.total.toLocaleString('en-US')} resolved`;
}

/** The value chip for a campaign: only when the value exists in the parsed core values. */
export function valueChip(
	coreValue: string,
	values: readonly { name: string; focus: boolean }[]
): ValueChip | null {
	const v = values.find((x) => x.name.toLowerCase() === coreValue.toLowerCase());
	return v ? { name: v.name, focus: v.focus } : null;
}

export type ValueChip = { name: string; focus: boolean };
export type CampaignCardData = Campaign & { progress: CampaignProgress; chip: ValueChip | null };
