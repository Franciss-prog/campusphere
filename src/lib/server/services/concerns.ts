import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { attachMedia } from '../images.ts';
import { db, t } from '../db/index.ts';
import { audit } from '../audit.ts';
import { checkTransition, STATUSES, type ConcernStatus } from '#lib/status.ts';
import type { ConcernRow } from '#lib/campaigns.ts';

export type Kind = 'concern' | 'recommendation';
export const CONCERN_SORTS = ['supported', 'newest', 'discussed', 'updated'] as const;
export type ConcernSort = (typeof CONCERN_SORTS)[number];

export type ConcernListItem = {
	id: number;
	kind: Kind;
	title: string;
	description: string;
	location: string | null;
	status: ConcernStatus;
	categoryName: string | null;
	categorySlug: string | null;
	supportCount: number;
	commentCount: number;
	proposalCount: number;
	image: string | null;
	createdAt: Date;
	statusChangedAt: Date;
	supported: boolean;
};

const ORDER: Record<ConcernSort, SQL[]> = {
	supported: [desc(t.concern.supportCount), desc(t.concern.createdAt)],
	newest: [desc(t.concern.createdAt)],
	discussed: [desc(t.concern.commentCount), desc(t.concern.createdAt)],
	updated: [desc(t.concern.statusChangedAt)]
};

/** Builds an OR full-text query from free text: safe (only word characters reach to_tsquery). */
export function orQuery(text: string): string | null {
	const words = (text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []).slice(0, 8);
	return words.length ? words.map((w) => `${w}:*`).join(' | ') : null;
}

function supportedExpr(anonHash: string | null) {
	return anonHash
		? sql<boolean>`exists (select 1 from ${t.concernSupport} s where s.concern_id = ${t.concern.id} and s.token_hash = ${anonHash})`
		: sql<boolean>`false`;
}

const listColumns = (anonHash: string | null) => ({
	id: t.concern.id,
	kind: t.concern.kind,
	title: t.concern.title,
	description: t.concern.description,
	location: t.concern.location,
	status: t.concern.currentStatus,
	categoryName: t.category.name,
	categorySlug: t.category.slug,
	supportCount: t.concern.supportCount,
	commentCount: t.concern.commentCount,
	proposalCount: t.concern.proposalCount,
	image: sql<string | null>`${t.concern.images}->>0`,
	createdAt: t.concern.createdAt,
	statusChangedAt: t.concern.statusChangedAt,
	supported: supportedExpr(anonHash)
});

export type ListFilter = {
	kind?: Kind;
	status?: ConcernStatus | null;
	statuses?: ConcernStatus[];
	category?: string | null;
	tag?: string | null;
	q?: string | null;
	sort?: ConcernSort;
	page?: number;
	perPage?: number;
};

function where(f: ListFilter): SQL | undefined {
	const parts: (SQL | undefined)[] = [eq(t.concern.visibility, 'published')];
	if (f.kind) parts.push(eq(t.concern.kind, f.kind));
	if (f.status) parts.push(eq(t.concern.currentStatus, f.status));
	if (f.statuses?.length) parts.push(inArray(t.concern.currentStatus, f.statuses));
	if (f.category) parts.push(eq(t.category.slug, f.category));
	if (f.tag) {
		parts.push(
			sql`exists (select 1 from ${t.concernTag} ct join ${t.tag} tg on tg.id = ct.tag_id where ct.concern_id = ${t.concern.id} and tg.slug = ${f.tag})`
		);
	}
	const q = f.q ? orQuery(f.q) : null;
	if (f.q && !q) parts.push(sql`false`);
	if (q) parts.push(sql`${t.concern.search} @@ to_tsquery('english', ${q})`);
	return and(...parts);
}

export async function listConcerns(f: ListFilter, anonHash: string | null) {
	const perPage = f.perPage ?? 9;
	const page = Math.max(1, f.page ?? 1);
	const w = where(f);
	const q = f.q ? orQuery(f.q) : null;
	const order =
		q && (!f.sort || f.sort === 'supported')
			? [sql`ts_rank(${t.concern.search}, to_tsquery('english', ${q})) desc`, ...ORDER.supported]
			: ORDER[f.sort ?? 'supported'];

	const [items, [{ total }]] = await Promise.all([
		db()
			.select(listColumns(anonHash))
			.from(t.concern)
			.leftJoin(t.category, eq(t.category.id, t.concern.categoryId))
			.where(w)
			.orderBy(...order)
			.limit(perPage)
			.offset((page - 1) * perPage),
		db()
			.select({ total: sql<number>`count(*)::int` })
			.from(t.concern)
			.leftJoin(t.category, eq(t.category.id, t.concern.categoryId))
			.where(w)
	]);
	return { items: items as ConcernListItem[], total, page, perPage };
}

export async function statusCounts(f: Pick<ListFilter, 'kind' | 'category'> = {}) {
	const rows = await db()
		.select({ status: t.concern.currentStatus, n: sql<number>`count(*)::int` })
		.from(t.concern)
		.leftJoin(t.category, eq(t.category.id, t.concern.categoryId))
		.where(where({ kind: f.kind, category: f.category }))
		.groupBy(t.concern.currentStatus);
	const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<ConcernStatus, number>;
	for (const r of rows) counts[r.status] = r.n;
	const all = rows.reduce((a, r) => a + r.n, 0);
	return { counts, all };
}

export async function getConcern(id: number, viewer: { anonHash: string | null; staff: boolean }) {
	const [row] = await db()
		.select({
			...listColumns(viewer.anonHash),
			images: t.concern.images,
			visibility: t.concern.visibility,
			isSensitive: t.concern.isSensitive,
			authorTokenHash: t.concern.authorTokenHash,
			categoryId: t.concern.categoryId
		})
		.from(t.concern)
		.leftJoin(t.category, eq(t.category.id, t.concern.categoryId))
		.where(eq(t.concern.id, id))
		.limit(1);
	if (!row) return null;
	const isAuthor = !!viewer.anonHash && row.authorTokenHash === viewer.anonHash;
	if (row.visibility !== 'published' && !viewer.staff && !isAuthor) return null;
	const { authorTokenHash: _omit, ...rest } = row;
	void _omit;
	return { ...rest, isAuthor };
}

export async function getHistory(concernId: number) {
	return db()
		.select({
			id: t.statusHistory.id,
			status: t.statusHistory.status,
			publicNote: t.statusHistory.publicNote,
			createdAt: t.statusHistory.createdAt,
			byStaff: sql<boolean>`${t.statusHistory.changedById} is not null`
		})
		.from(t.statusHistory)
		.where(eq(t.statusHistory.concernId, concernId))
		.orderBy(desc(t.statusHistory.createdAt), desc(t.statusHistory.id));
}

export async function getConcernTags(concernId: number) {
	return db()
		.select({ name: t.tag.name, slug: t.tag.slug })
		.from(t.concernTag)
		.innerJoin(t.tag, eq(t.tag.id, t.concernTag.tagId))
		.where(eq(t.concernTag.concernId, concernId))
		.orderBy(asc(t.tag.name));
}

/** Live duplicate hint while typing a title. */
export async function similarConcerns(title: string, limit = 3) {
	const q = orQuery(title);
	if (!q) return [];
	return db()
		.select({
			id: t.concern.id,
			title: t.concern.title,
			status: t.concern.currentStatus,
			supportCount: t.concern.supportCount
		})
		.from(t.concern)
		.where(
			and(
				eq(t.concern.visibility, 'published'),
				sql`${t.concern.search} @@ to_tsquery('english', ${q})`
			)
		)
		.orderBy(sql`ts_rank(${t.concern.search}, to_tsquery('english', ${q})) desc`)
		.limit(limit);
}

export async function concernCategories() {
	return db()
		.select({ id: t.category.id, name: t.category.name, slug: t.category.slug })
		.from(t.category)
		.where(eq(t.category.type, 'concern'))
		.orderBy(asc(t.category.sort), asc(t.category.name));
}

/** True if the same browser posted the same title in the last 24 hours. */
export async function isDuplicateConcern(tokenHash: string, title: string): Promise<boolean> {
	const [row] = await db()
		.select({ id: t.concern.id })
		.from(t.concern)
		.where(
			and(
				eq(t.concern.authorTokenHash, tokenHash),
				sql`lower(${t.concern.title}) = lower(${title})`,
				sql`${t.concern.createdAt} > now() - interval '24 hours'`
			)
		)
		.limit(1);
	return !!row;
}

export async function createConcern(input: {
	kind: Kind;
	title: string;
	description: string;
	categoryId: number | null;
	location: string | null;
	images: string[];
	isSensitive: boolean;
	visibility: 'published' | 'pending';
	tokenHash: string;
	tagIds?: number[];
}) {
	return db().transaction(async (tx) => {
		const [row] = await tx
			.insert(t.concern)
			.values({
				kind: input.kind,
				title: input.title,
				description: input.description,
				categoryId: input.categoryId,
				location: input.location,
				images: input.images,
				isSensitive: input.isSensitive,
				visibility: input.visibility,
				authorTokenHash: input.tokenHash
			})
			.returning({ id: t.concern.id });
		await tx.insert(t.statusHistory).values({ concernId: row.id, status: 'submitted' });
		await attachMedia(tx, input.images, { concernId: row.id });
		if (input.tagIds?.length) {
			await tx
				.insert(t.concernTag)
				.values(input.tagIds.map((tagId) => ({ concernId: row.id, tagId })))
				.onConflictDoNothing();
		}
		return row.id;
	});
}

/** One support per anonymous browser: toggles and keeps the counter consistent. */
export async function toggleConcernSupport(concernId: number, tokenHash: string) {
	return db().transaction(async (tx) => {
		const [target] = await tx
			.select({ id: t.concern.id })
			.from(t.concern)
			.where(and(eq(t.concern.id, concernId), eq(t.concern.visibility, 'published')))
			.limit(1);
		if (!target) return null;
		const inserted = await tx
			.insert(t.concernSupport)
			.values({ concernId, tokenHash })
			.onConflictDoNothing()
			.returning({ c: t.concernSupport.concernId });
		if (!inserted.length) {
			await tx
				.delete(t.concernSupport)
				.where(
					and(eq(t.concernSupport.concernId, concernId), eq(t.concernSupport.tokenHash, tokenHash))
				);
		}
		const [row] = await tx
			.update(t.concern)
			.set({
				supportCount: sql`greatest(${t.concern.supportCount} + ${inserted.length ? 1 : -1}, 0)`,
				updatedAt: sql`${t.concern.updatedAt}`
			})
			.where(eq(t.concern.id, concernId))
			.returning({ supportCount: t.concern.supportCount });
		return { supported: inserted.length > 0, supportCount: row.supportCount };
	});
}

/** Admin-only status change: validates, writes history + audit, all in one transaction. */
export async function changeStatus(input: {
	concernId: number;
	to: ConcernStatus;
	note: string | null;
	staffId: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
	return db().transaction(async (tx) => {
		const [row] = await tx
			.select({ status: t.concern.currentStatus })
			.from(t.concern)
			.where(eq(t.concern.id, input.concernId))
			.for('update')
			.limit(1);
		if (!row) return { ok: false, message: 'This concern no longer exists.' };
		const check = checkTransition(row.status, input.to, input.note);
		if (!check.ok) return { ok: false, message: check.reason };
		const now = new Date();
		await tx
			.update(t.concern)
			.set({ currentStatus: input.to, statusChangedAt: now })
			.where(eq(t.concern.id, input.concernId));
		await tx.insert(t.statusHistory).values({
			concernId: input.concernId,
			status: input.to,
			publicNote: input.note?.trim() || null,
			changedById: input.staffId,
			createdAt: now
		});
		await audit(
			{
				staffId: input.staffId,
				action: 'status.change',
				targetType: 'concern',
				targetId: input.concernId,
				meta: { from: row.status, to: input.to }
			},
			tx
		);
		return { ok: true };
	});
}

/** Impact Tracker board: top cards per column plus totals. */
export async function trackerBoard(category: string | null, perColumn = 6) {
	const rows = await db().execute<{
		id: number;
		title: string;
		status: ConcernStatus;
		category_name: string | null;
		support_count: number;
		comment_count: number;
	}>(sql`
		select * from (
			select c.id, c.title, c.current_status as status, cat.name as category_name,
				c.support_count, c.comment_count,
				row_number() over (partition by c.current_status order by (case when c.current_status = 'resolved' then c.status_changed_at end) desc nulls last, c.support_count desc, c.status_changed_at desc) as rn
			from ${t.concern} c left join ${t.category} cat on cat.id = c.category_id
			where c.visibility = 'published' ${category ? sql`and cat.slug = ${category}` : sql``}
		) ranked where rn <= ${perColumn}`);
	return rows.rows.map((r) => ({
		id: r.id,
		title: r.title,
		status: r.status,
		categoryName: r.category_name,
		supportCount: Number(r.support_count),
		commentCount: Number(r.comment_count)
	}));
}

/** Published totals for public counters. `reported` and `resolved` cover both kinds. */
export async function publicStats() {
	const [row] = await db()
		.select({
			reported: sql<number>`count(*)::int`,
			resolved: sql<number>`count(*) filter (where ${t.concern.currentStatus} = 'resolved')::int`,
			concerns: sql<number>`count(*) filter (where ${t.concern.kind} = 'concern')::int`,
			recommendations: sql<number>`count(*) filter (where ${t.concern.kind} = 'recommendation')::int`
		})
		.from(t.concern)
		.where(eq(t.concern.visibility, 'published'));
	const [p] = await db()
		.select({ proposals: sql<number>`count(*)::int` })
		.from(t.proposal)
		.where(eq(t.proposal.visibility, 'published'));
	return {
		reported: row.reported,
		resolved: row.resolved,
		concerns: row.concerns,
		recommendations: row.recommendations,
		proposals: p.proposals
	};
}

export function compactConcern(c: ConcernListItem): ConcernRow {
	return {
		id: c.id,
		title: c.title,
		status: c.status,
		categoryName: c.categoryName,
		createdAt: c.createdAt
	};
}

/** Newest published items of one kind (default: concerns), optionally under a tag. */
export async function latestConcerns(
	limit = 3,
	opts: { kind?: Kind; tag?: string | null } = {}
): Promise<ConcernRow[]> {
	const { items } = await listConcerns(
		{ kind: opts.kind ?? 'concern', tag: opts.tag, sort: 'newest', perPage: limit },
		null
	);
	return items.map(compactConcern);
}
