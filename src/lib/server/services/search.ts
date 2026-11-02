import { and, eq, sql } from 'drizzle-orm';
import { db, t } from '../db/index.ts';
import { orQuery } from './concerns.ts';
import type { ConcernStatus } from '#lib/status.ts';

export type SearchHit =
	| {
			type: 'concern';
			id: number;
			title: string;
			snippet: string;
			status: ConcernStatus;
			meta: string;
			href: string;
			rank: number;
	  }
	| {
			type: 'post';
			id: number;
			title: string;
			snippet: string;
			meta: string;
			href: string;
			rank: number;
	  }
	| {
			type: 'proposal';
			id: number;
			title: string;
			snippet: string;
			meta: string;
			href: string;
			rank: number;
	  };

export const SEARCH_TYPES = ['all', 'concern', 'post', 'proposal'] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

const LIMIT = 30;

/** Full-text search across published concerns, posts and proposals, ranked by ts_rank. */
export async function searchAll(text: string, type: SearchType) {
	const q = orQuery(text);
	const empty = { hits: [] as SearchHit[], counts: { concern: 0, post: 0, proposal: 0 } };
	if (!q) return empty;
	const tsq = sql`to_tsquery('english', ${q})`;

	const [concerns, posts, proposals] = await Promise.all([
		db()
			.select({
				id: t.concern.id,
				title: t.concern.title,
				body: t.concern.description,
				status: t.concern.currentStatus,
				kind: t.concern.kind,
				category: t.category.name,
				rank: sql<number>`ts_rank(${t.concern.search}, ${tsq})`
			})
			.from(t.concern)
			.leftJoin(t.category, eq(t.category.id, t.concern.categoryId))
			.where(and(eq(t.concern.visibility, 'published'), sql`${t.concern.search} @@ ${tsq}`))
			.orderBy(sql`ts_rank(${t.concern.search}, ${tsq}) desc`)
			.limit(LIMIT),
		db()
			.select({
				id: t.post.id,
				slug: t.post.slug,
				title: t.post.title,
				body: t.post.excerpt,
				category: t.category.name,
				rank: sql<number>`ts_rank(${t.post.search}, ${tsq})`
			})
			.from(t.post)
			.leftJoin(t.category, eq(t.category.id, t.post.categoryId))
			.where(and(eq(t.post.status, 'published'), sql`${t.post.search} @@ ${tsq}`))
			.orderBy(sql`ts_rank(${t.post.search}, ${tsq}) desc`)
			.limit(LIMIT),
		db()
			.select({
				id: t.proposal.id,
				concernId: t.proposal.concernId,
				title: t.proposal.title,
				body: t.proposal.description,
				concernTitle: t.concern.title,
				supports: t.proposal.supportCount,
				rank: sql<number>`ts_rank(${t.proposal.search}, ${tsq})`
			})
			.from(t.proposal)
			.innerJoin(t.concern, eq(t.concern.id, t.proposal.concernId))
			.where(
				and(
					eq(t.proposal.visibility, 'published'),
					eq(t.concern.visibility, 'published'),
					sql`${t.proposal.search} @@ ${tsq}`
				)
			)
			.orderBy(sql`ts_rank(${t.proposal.search}, ${tsq}) desc`)
			.limit(LIMIT)
	]);

	const hits: SearchHit[] = [];
	if (type === 'all' || type === 'concern') {
		for (const c of concerns)
			hits.push({
				type: 'concern',
				id: c.id,
				title: c.title,
				snippet: c.body,
				status: c.status,
				meta: [c.kind === 'recommendation' ? 'Recommendation' : 'Concern', c.category]
					.filter(Boolean)
					.join(', '),
				href: `/concerns/${c.id}`,
				rank: c.rank
			});
	}
	if (type === 'all' || type === 'post') {
		for (const p of posts)
			hits.push({
				type: 'post',
				id: p.id,
				title: p.title,
				snippet: p.body,
				meta: ['Blog post', p.category].filter(Boolean).join(', '),
				href: `/blog/${p.slug}`,
				rank: p.rank
			});
	}
	if (type === 'all' || type === 'proposal') {
		for (const p of proposals)
			hits.push({
				type: 'proposal',
				id: p.id,
				title: p.title,
				snippet: p.body,
				meta: `Proposal on ${p.concernTitle}`,
				href: `/concerns/${p.concernId}#prop-h`,
				rank: p.rank
			});
	}
	hits.sort((a, b) => b.rank - a.rank);
	return {
		hits,
		counts: { concern: concerns.length, post: posts.length, proposal: proposals.length }
	};
}
