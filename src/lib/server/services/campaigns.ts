// Action Campaigns. Campaign copy is static (`CAMPAIGNS` in site.ts); content is linked through
// the shared `tag` table (tag slug = campaign slug), so no schema change is needed. Everything
// here degrades to zeros and empty lists when a campaign's tag does not exist.
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, t } from '../db/index.ts';
import { latestConcerns } from './concerns.ts';
import { listPosts, pinnedPost } from './posts.ts';
import { parseUniversityStatement, type CoreValue } from '#lib/university.ts';
import {
	CAMPAIGN_SLUGS,
	shapeProgress,
	valueChip,
	type ArticleRow,
	type CampaignCardData,
	type CampaignProgress,
	type ConcernCountRow,
	type ConcernRow
} from '#lib/campaigns.ts';
import { CAMPAIGNS } from '#lib/content/site.ts';

/** Tag ids by slug for the given campaign slugs (missing tags are simply absent). */
export async function campaignTagIds(slugs: readonly string[] = CAMPAIGN_SLUGS) {
	if (!slugs.length) return {} as Record<string, number>;
	const rows = await db()
		.select({ id: t.tag.id, slug: t.tag.slug })
		.from(t.tag)
		.where(inArray(t.tag.slug, [...slugs]));
	return Object.fromEntries(rows.map((r) => [r.slug, r.id])) as Record<string, number>;
}

/**
 * Published articles, concerns and recommendations per campaign, plus resolved items.
 * Only aggregate numbers leave this function.
 */
export async function campaignProgress(
	slugs: readonly string[] = CAMPAIGN_SLUGS
): Promise<Record<string, CampaignProgress>> {
	if (!slugs.length) return {};
	const list = [...slugs];
	const [tags, concernRows, postRows] = await Promise.all([
		db().select({ slug: t.tag.slug }).from(t.tag).where(inArray(t.tag.slug, list)),
		db()
			.select({
				slug: t.tag.slug,
				kind: t.concern.kind,
				n: sql<number>`count(*)::int`,
				resolved: sql<number>`count(*) filter (where ${t.concern.currentStatus} = 'resolved')::int`
			})
			.from(t.concernTag)
			.innerJoin(t.tag, eq(t.tag.id, t.concernTag.tagId))
			.innerJoin(t.concern, eq(t.concern.id, t.concernTag.concernId))
			.where(and(inArray(t.tag.slug, list), eq(t.concern.visibility, 'published')))
			.groupBy(t.tag.slug, t.concern.kind),
		db()
			.select({ slug: t.tag.slug, n: sql<number>`count(*)::int` })
			.from(t.postTag)
			.innerJoin(t.tag, eq(t.tag.id, t.postTag.tagId))
			.innerJoin(t.post, eq(t.post.id, t.postTag.postId))
			.where(and(inArray(t.tag.slug, list), eq(t.post.status, 'published')))
			.groupBy(t.tag.slug)
	]);
	return shapeProgress(
		list,
		tags.map((r) => r.slug),
		concernRows as ConcernCountRow[],
		postRows
	);
}

export async function latestArticles(
	limit = 3,
	opts: { tag?: string | null; sort?: 'newest' | 'liked' } = {}
): Promise<ArticleRow[]> {
	const { items } = await listPosts({
		tag: opts.tag,
		sort: opts.sort ?? 'newest',
		perPage: limit,
		excludePinned: true
	});
	return items.map((p) => ({
		slug: p.slug,
		title: p.title,
		excerpt: p.excerpt,
		categoryName: p.categoryName,
		byline: p.byline,
		createdAt: p.createdAt
	}));
}

/** Latest items tagged with a campaign, for its detail page. */
export async function campaignContent(slug: string, limit = 3) {
	const [articles, concerns, recommendations] = await Promise.all([
		latestArticles(limit, { tag: slug }),
		latestConcerns(limit, { kind: 'concern', tag: slug }),
		latestConcerns(limit, { kind: 'recommendation', tag: slug })
	]);
	return { articles, concerns, recommendations } satisfies Record<
		string,
		ArticleRow[] | ConcernRow[]
	>;
}

/** Core values parsed from the pinned official post (empty when there is none). */
export async function coreValues(): Promise<CoreValue[]> {
	const pinned = await pinnedPost();
	return pinned ? parseUniversityStatement(pinned.bodyMd).values : [];
}

/** Every campaign with its progress and core value chip. Pass `values` when already loaded. */
export async function campaignCards(values?: CoreValue[]): Promise<CampaignCardData[]> {
	const [progress, vals] = await Promise.all([
		campaignProgress(),
		values ? Promise.resolve(values) : coreValues()
	]);
	return CAMPAIGNS.map((c) => ({
		...c,
		progress: progress[c.slug],
		chip: valueChip(c.coreValue, vals)
	}));
}
