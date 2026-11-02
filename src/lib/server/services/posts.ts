import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { db, t } from '../db/index.ts';
import { excerptOf, renderMarkdown, slugify } from '../sanitize.ts';
import { orQuery } from './concerns.ts';
import { authorLabel } from '../anon.ts';

export const POST_SORTS = ['newest', 'liked', 'discussed'] as const;
export type PostSort = (typeof POST_SORTS)[number];

const ORDER: Record<PostSort, SQL[]> = {
	newest: [desc(t.post.createdAt)],
	liked: [desc(t.post.likeCount), desc(t.post.createdAt)],
	discussed: [desc(t.post.commentCount), desc(t.post.createdAt)]
};

function likedExpr(anonHash: string | null) {
	return anonHash
		? sql<boolean>`exists (select 1 from ${t.reaction} r where r.target_type = 'post' and r.target_id = ${t.post.id} and r.type = 'like' and r.token_hash = ${anonHash})`
		: sql<boolean>`false`;
}

const cardColumns = {
	id: t.post.id,
	slug: t.post.slug,
	title: t.post.title,
	excerpt: t.post.excerpt,
	coverImage: t.post.coverImage,
	isOfficial: t.post.isOfficial,
	likeCount: t.post.likeCount,
	commentCount: t.post.commentCount,
	createdAt: t.post.createdAt,
	categoryName: t.category.name,
	categorySlug: t.category.slug,
	byStaff: sql<boolean>`${t.post.staffAuthorId} is not null`,
	authorTokenHash: t.post.authorTokenHash
};

/** Replaces the author hash with a display byline before data leaves the server. */
export function withByline<
	T extends { id: number; byStaff: boolean; isOfficial: boolean; authorTokenHash: string | null }
>(row: T): Omit<T, 'authorTokenHash'> & { byline: string } {
	const { authorTokenHash, ...rest } = row;
	return {
		...rest,
		byline:
			row.byStaff || row.isOfficial ? 'Campusphere team' : authorLabel(authorTokenHash, row.id)
	};
}

export async function blogCategories() {
	return db()
		.select({ id: t.category.id, name: t.category.name, slug: t.category.slug })
		.from(t.category)
		.where(eq(t.category.type, 'blog'))
		.orderBy(asc(t.category.sort), asc(t.category.name));
}

export async function pinnedPost() {
	const [row] = await db()
		.select({ ...cardColumns, bodyMd: t.post.bodyMd })
		.from(t.post)
		.leftJoin(t.category, eq(t.category.id, t.post.categoryId))
		.where(and(eq(t.post.status, 'published'), eq(t.post.isPinned, true)))
		.orderBy(desc(t.post.createdAt))
		.limit(1);
	return row ? withByline(row) : null;
}

export async function listPosts(f: {
	category?: string | null;
	tag?: string | null;
	q?: string | null;
	sort?: PostSort;
	page?: number;
	perPage?: number;
	excludePinned?: boolean;
}) {
	const perPage = f.perPage ?? 6;
	const page = Math.max(1, f.page ?? 1);
	const q = f.q ? orQuery(f.q) : null;
	const w = and(
		eq(t.post.status, 'published'),
		f.excludePinned ? eq(t.post.isPinned, false) : undefined,
		f.category ? eq(t.category.slug, f.category) : undefined,
		f.tag
			? sql`exists (select 1 from ${t.postTag} pt join ${t.tag} tg on tg.id = pt.tag_id where pt.post_id = ${t.post.id} and tg.slug = ${f.tag})`
			: undefined,
		f.q && !q ? sql`false` : undefined,
		q ? sql`${t.post.search} @@ to_tsquery('english', ${q})` : undefined
	);
	const [items, [{ total }]] = await Promise.all([
		db()
			.select(cardColumns)
			.from(t.post)
			.leftJoin(t.category, eq(t.category.id, t.post.categoryId))
			.where(w)
			.orderBy(...ORDER[f.sort ?? 'newest'])
			.limit(perPage)
			.offset((page - 1) * perPage),
		db()
			.select({ total: sql<number>`count(*)::int` })
			.from(t.post)
			.leftJoin(t.category, eq(t.category.id, t.post.categoryId))
			.where(w)
	]);
	return { items: items.map(withByline), total, page, perPage };
}

export async function postCountsByCategory(excludePinned = true) {
	const rows = await db()
		.select({ slug: t.category.slug, n: sql<number>`count(*)::int` })
		.from(t.post)
		.leftJoin(t.category, eq(t.category.id, t.post.categoryId))
		.where(
			and(eq(t.post.status, 'published'), excludePinned ? eq(t.post.isPinned, false) : undefined)
		)
		.groupBy(t.category.slug);
	return {
		all: rows.reduce((a, r) => a + r.n, 0),
		bySlug: Object.fromEntries(rows.filter((r) => r.slug).map((r) => [r.slug!, r.n])) as Record<
			string,
			number
		>
	};
}

export async function getPost(slug: string, viewer: { anonHash: string | null; staff: boolean }) {
	const [row] = await db()
		.select({
			...cardColumns,
			bodyMd: t.post.bodyMd,
			bodyHtml: t.post.bodyHtml,
			isPinned: t.post.isPinned,
			status: t.post.status,
			authorTokenHash: t.post.authorTokenHash,
			categoryId: t.post.categoryId,
			liked: likedExpr(viewer.anonHash)
		})
		.from(t.post)
		.leftJoin(t.category, eq(t.category.id, t.post.categoryId))
		.where(eq(t.post.slug, slug))
		.limit(1);
	if (!row) return null;
	const isAuthor = !!viewer.anonHash && row.authorTokenHash === viewer.anonHash;
	if (row.status !== 'published' && !viewer.staff && !isAuthor) return null;
	return { ...withByline(row), isAuthor };
}

export async function postTags(postId: number) {
	return db()
		.select({ name: t.tag.name, slug: t.tag.slug })
		.from(t.postTag)
		.innerJoin(t.tag, eq(t.tag.id, t.postTag.tagId))
		.where(eq(t.postTag.postId, postId))
		.orderBy(asc(t.tag.name));
}

export async function createPost(input: {
	title: string;
	bodyMd: string;
	categoryId: number | null;
	coverImage: string | null;
	tagIds: number[];
	visibility: 'published' | 'pending';
	tokenHash: string | null;
	staffAuthorId?: number | null;
	isOfficial?: boolean;
}) {
	const slug = `${slugify(input.title)}-${randomBytes(3).toString('hex')}`;
	return db().transaction(async (tx) => {
		const [row] = await tx
			.insert(t.post)
			.values({
				slug,
				title: input.title,
				excerpt: excerptOf(input.bodyMd),
				bodyMd: input.bodyMd,
				bodyHtml: renderMarkdown(input.bodyMd),
				categoryId: input.categoryId,
				coverImage: input.coverImage,
				status: input.visibility,
				authorTokenHash: input.tokenHash,
				staffAuthorId: input.staffAuthorId ?? null,
				isOfficial: !!input.isOfficial,
				source: input.isOfficial ? 'official' : 'anonymous'
			})
			.returning({ id: t.post.id, slug: t.post.slug });
		if (input.tagIds.length) {
			await tx
				.insert(t.postTag)
				.values(input.tagIds.map((tagId) => ({ postId: row.id, tagId })))
				.onConflictDoNothing();
		}
		return row;
	});
}

/** Anonymous authors may edit their post within the edit window. */
export async function updateOwnPost(input: {
	postId: number;
	tokenHash: string;
	windowMinutes: number;
	title: string;
	bodyMd: string;
	categoryId: number | null;
}): Promise<boolean> {
	const r = await db()
		.update(t.post)
		.set({
			title: input.title,
			bodyMd: input.bodyMd,
			bodyHtml: renderMarkdown(input.bodyMd),
			excerpt: excerptOf(input.bodyMd),
			categoryId: input.categoryId
		})
		.where(
			and(
				eq(t.post.id, input.postId),
				eq(t.post.authorTokenHash, input.tokenHash),
				sql`${t.post.createdAt} > now() - make_interval(mins => ${input.windowMinutes})`
			)
		)
		.returning({ id: t.post.id });
	return r.length > 0;
}

export async function deleteOwnPost(postId: number, tokenHash: string, windowMinutes: number) {
	const r = await db()
		.delete(t.post)
		.where(
			and(
				eq(t.post.id, postId),
				eq(t.post.authorTokenHash, tokenHash),
				sql`${t.post.createdAt} > now() - make_interval(mins => ${windowMinutes})`
			)
		)
		.returning({ id: t.post.id });
	if (r.length) {
		await db()
			.delete(t.comment)
			.where(and(eq(t.comment.parentType, 'post'), eq(t.comment.parentId, postId)));
	}
	return r.length > 0;
}

export function withinWindow(createdAt: Date, windowMinutes: number): boolean {
	return Date.now() - new Date(createdAt).getTime() < windowMinutes * 60_000;
}

/** Generic toggle on the reaction table (posts and comments). One per browser per target. */
export async function toggleReaction(
	targetType: 'post' | 'comment',
	targetId: number,
	tokenHash: string,
	type = 'like'
) {
	return db().transaction(async (tx) => {
		const exists =
			targetType === 'post'
				? await tx
						.select({ id: t.post.id })
						.from(t.post)
						.where(and(eq(t.post.id, targetId), eq(t.post.status, 'published')))
				: await tx
						.select({ id: t.comment.id })
						.from(t.comment)
						.where(and(eq(t.comment.id, targetId), eq(t.comment.visibility, 'published')));
		if (!exists.length) return null;
		const inserted = await tx
			.insert(t.reaction)
			.values({ targetType, targetId, type, tokenHash })
			.onConflictDoNothing()
			.returning({ id: t.reaction.id });
		if (!inserted.length) {
			await tx
				.delete(t.reaction)
				.where(
					and(
						eq(t.reaction.targetType, targetType),
						eq(t.reaction.targetId, targetId),
						eq(t.reaction.type, type),
						eq(t.reaction.tokenHash, tokenHash)
					)
				);
		}
		let count: number;
		if (targetType === 'post') {
			const [row] = await tx
				.update(t.post)
				.set({
					likeCount: sql`greatest(${t.post.likeCount} + ${inserted.length ? 1 : -1}, 0)`,
					updatedAt: sql`${t.post.updatedAt}`
				})
				.where(eq(t.post.id, targetId))
				.returning({ n: t.post.likeCount });
			count = row.n;
		} else {
			const [row] = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(t.reaction)
				.where(
					and(
						eq(t.reaction.targetType, 'comment'),
						eq(t.reaction.targetId, targetId),
						eq(t.reaction.type, type)
					)
				);
			count = row.n;
		}
		return { supported: inserted.length > 0, supportCount: count };
	});
}
