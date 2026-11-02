import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { db, t } from '../db/index.ts';

export const PROPOSAL_SORTS = ['supported', 'newest', 'discussed'] as const;
export type ProposalSort = (typeof PROPOSAL_SORTS)[number];

const ORDER: Record<ProposalSort, SQL[]> = {
	supported: [desc(t.proposal.supportCount), desc(t.proposal.createdAt)],
	newest: [desc(t.proposal.createdAt)],
	discussed: [desc(t.proposal.commentCount), desc(t.proposal.createdAt)]
};

function supported(anonHash: string | null) {
	return anonHash
		? sql<boolean>`exists (select 1 from ${t.proposalSupport} s where s.proposal_id = ${t.proposal.id} and s.token_hash = ${anonHash})`
		: sql<boolean>`false`;
}

const columns = (anonHash: string | null) => ({
	id: t.proposal.id,
	concernId: t.proposal.concernId,
	title: t.proposal.title,
	description: t.proposal.description,
	feasibilityNotes: t.proposal.feasibilityNotes,
	supportCount: t.proposal.supportCount,
	commentCount: t.proposal.commentCount,
	createdAt: t.proposal.createdAt,
	supported: supported(anonHash)
});

export async function proposalsFor(
	concernId: number,
	anonHash: string | null,
	sort: ProposalSort = 'supported'
) {
	return db()
		.select(columns(anonHash))
		.from(t.proposal)
		.where(and(eq(t.proposal.concernId, concernId), eq(t.proposal.visibility, 'published')))
		.orderBy(...ORDER[sort]);
}

export async function listProposals(
	f: { category?: string | null; sort?: ProposalSort; page?: number; perPage?: number },
	anonHash: string | null
) {
	const perPage = f.perPage ?? 8;
	const page = Math.max(1, f.page ?? 1);
	const w = and(
		eq(t.proposal.visibility, 'published'),
		eq(t.concern.visibility, 'published'),
		f.category ? eq(t.category.slug, f.category) : undefined
	);
	const [items, [{ total }]] = await Promise.all([
		db()
			.select({ ...columns(anonHash), concernTitle: t.concern.title })
			.from(t.proposal)
			.innerJoin(t.concern, eq(t.concern.id, t.proposal.concernId))
			.leftJoin(t.category, eq(t.category.id, t.concern.categoryId))
			.where(w)
			.orderBy(...ORDER[f.sort ?? 'supported'])
			.limit(perPage)
			.offset((page - 1) * perPage),
		db()
			.select({ total: sql<number>`count(*)::int` })
			.from(t.proposal)
			.innerJoin(t.concern, eq(t.concern.id, t.proposal.concernId))
			.leftJoin(t.category, eq(t.category.id, t.concern.categoryId))
			.where(w)
	]);
	return { items, total, page, perPage };
}

export async function proposalCountsByCategory() {
	const rows = await db()
		.select({ slug: t.category.slug, n: sql<number>`count(*)::int` })
		.from(t.proposal)
		.innerJoin(t.concern, eq(t.concern.id, t.proposal.concernId))
		.leftJoin(t.category, eq(t.category.id, t.concern.categoryId))
		.where(and(eq(t.proposal.visibility, 'published'), eq(t.concern.visibility, 'published')))
		.groupBy(t.category.slug);
	return {
		all: rows.reduce((a, r) => a + r.n, 0),
		bySlug: Object.fromEntries(rows.filter((r) => r.slug).map((r) => [r.slug!, r.n])) as Record<
			string,
			number
		>
	};
}

export async function createProposal(input: {
	concernId: number;
	title: string;
	description: string;
	feasibilityNotes: string | null;
	tokenHash: string;
	visibility: 'published' | 'pending';
}): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
	return db().transaction(async (tx) => {
		const [c] = await tx
			.select({ id: t.concern.id, status: t.concern.currentStatus })
			.from(t.concern)
			.where(and(eq(t.concern.id, input.concernId), eq(t.concern.visibility, 'published')))
			.limit(1);
		if (!c) return { ok: false as const, message: 'This concern is no longer available.' };
		if (c.status === 'closed') {
			return {
				ok: false as const,
				message: 'This concern is closed and no longer takes proposals.'
			};
		}
		const [row] = await tx
			.insert(t.proposal)
			.values({
				concernId: input.concernId,
				title: input.title,
				description: input.description,
				feasibilityNotes: input.feasibilityNotes,
				authorTokenHash: input.tokenHash,
				visibility: input.visibility
			})
			.returning({ id: t.proposal.id });
		if (input.visibility === 'published') {
			await tx
				.update(t.concern)
				.set({
					proposalCount: sql`${t.concern.proposalCount} + 1`,
					updatedAt: sql`${t.concern.updatedAt}`
				})
				.where(eq(t.concern.id, input.concernId));
		}
		return { ok: true as const, id: row.id };
	});
}

/** One support per anonymous browser per proposal (unique constraint), toggled. */
export async function toggleProposalSupport(proposalId: number, tokenHash: string) {
	return db().transaction(async (tx) => {
		const [p] = await tx
			.select({ id: t.proposal.id })
			.from(t.proposal)
			.where(and(eq(t.proposal.id, proposalId), eq(t.proposal.visibility, 'published')))
			.limit(1);
		if (!p) return null;
		const inserted = await tx
			.insert(t.proposalSupport)
			.values({ proposalId, tokenHash })
			.onConflictDoNothing()
			.returning({ id: t.proposalSupport.proposalId });
		if (!inserted.length) {
			await tx
				.delete(t.proposalSupport)
				.where(
					and(
						eq(t.proposalSupport.proposalId, proposalId),
						eq(t.proposalSupport.tokenHash, tokenHash)
					)
				);
		}
		const [row] = await tx
			.update(t.proposal)
			.set({
				supportCount: sql`greatest(${t.proposal.supportCount} + ${inserted.length ? 1 : -1}, 0)`
			})
			.where(eq(t.proposal.id, proposalId))
			.returning({ supportCount: t.proposal.supportCount, concernId: t.proposal.concernId });
		return {
			supported: inserted.length > 0,
			supportCount: row.supportCount,
			concernId: row.concernId
		};
	});
}
