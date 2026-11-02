import { and, asc, eq, sql } from 'drizzle-orm';
import { db, t } from '../db/index.ts';
import { anonLabel } from '../anon-core.ts';

export type ParentType = 'post' | 'concern' | 'proposal';

export type CommentView = {
	id: number;
	body: string;
	name: string;
	color: string;
	createdAt: Date;
	mine: boolean;
	pending: boolean;
	helpful: number;
	helpedByMe: boolean;
	replies: CommentView[];
};

/** Published comments (plus the viewer's own pending ones), one reply level, oldest first. */
export async function listComments(
	parentType: ParentType,
	parentId: number,
	anonHash: string | null
): Promise<CommentView[]> {
	const rows = await db()
		.select({
			id: t.comment.id,
			parentCommentId: t.comment.parentCommentId,
			body: t.comment.body,
			seed: t.comment.anonLabelSeed,
			visibility: t.comment.visibility,
			author: t.comment.authorTokenHash,
			staff: t.comment.staffAuthorId,
			createdAt: t.comment.createdAt,
			helpful: sql<number>`(select count(*)::int from ${t.reaction} r where r.target_type = 'comment' and r.target_id = ${t.comment.id} and r.type = 'like')`,
			helpedByMe: anonHash
				? sql<boolean>`exists (select 1 from ${t.reaction} r where r.target_type = 'comment' and r.target_id = ${t.comment.id} and r.type = 'like' and r.token_hash = ${anonHash})`
				: sql<boolean>`false`
		})
		.from(t.comment)
		.where(
			and(
				eq(t.comment.parentType, parentType),
				eq(t.comment.parentId, parentId),
				anonHash
					? sql`(${t.comment.visibility} = 'published' or (${t.comment.visibility} = 'pending' and ${t.comment.authorTokenHash} = ${anonHash}))`
					: eq(t.comment.visibility, 'published')
			)
		)
		.orderBy(asc(t.comment.createdAt), asc(t.comment.id));

	const view = (r: (typeof rows)[number]): CommentView => {
		const label = r.staff ? { name: 'Campusphere team', color: '#34080C' } : anonLabel(r.seed);
		return {
			id: r.id,
			body: r.body,
			name: label.name,
			color: label.color,
			createdAt: r.createdAt,
			mine: !!anonHash && r.author === anonHash,
			pending: r.visibility === 'pending',
			helpful: r.helpful,
			helpedByMe: r.helpedByMe,
			replies: []
		};
	};
	const roots: CommentView[] = [];
	const byId = new Map<number, CommentView>();
	for (const r of rows) {
		const v = view(r);
		byId.set(r.id, v);
		if (r.parentCommentId && byId.has(r.parentCommentId))
			byId.get(r.parentCommentId)!.replies.push(v);
		else if (!r.parentCommentId) roots.push(v);
	}
	return roots;
}

/** Visible-parent check so comments cannot be attached to hidden or missing content. */
async function parentVisible(parentType: ParentType, parentId: number): Promise<boolean> {
	const q =
		parentType === 'post'
			? db()
					.select({ id: t.post.id })
					.from(t.post)
					.where(and(eq(t.post.id, parentId), eq(t.post.status, 'published')))
			: parentType === 'concern'
				? db()
						.select({ id: t.concern.id })
						.from(t.concern)
						.where(and(eq(t.concern.id, parentId), eq(t.concern.visibility, 'published')))
				: db()
						.select({ id: t.proposal.id })
						.from(t.proposal)
						.where(and(eq(t.proposal.id, parentId), eq(t.proposal.visibility, 'published')));
	const rows = await q.limit(1);
	return rows.length > 0;
}

export async function isDuplicateComment(
	tokenHash: string,
	parentType: ParentType,
	parentId: number,
	body: string
) {
	const [row] = await db()
		.select({ id: t.comment.id })
		.from(t.comment)
		.where(
			and(
				eq(t.comment.authorTokenHash, tokenHash),
				eq(t.comment.parentType, parentType),
				eq(t.comment.parentId, parentId),
				sql`lower(${t.comment.body}) = lower(${body})`,
				sql`${t.comment.createdAt} > now() - interval '1 day'`
			)
		)
		.limit(1);
	return !!row;
}

export async function addComment(input: {
	parentType: ParentType;
	parentId: number;
	replyTo: number | null;
	body: string;
	seed: string;
	tokenHash: string;
	visibility: 'published' | 'pending';
}): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
	if (!(await parentVisible(input.parentType, input.parentId))) {
		return { ok: false, message: 'This discussion is no longer available.' };
	}
	let parentCommentId: number | null = null;
	if (input.replyTo) {
		const [p] = await db()
			.select({ id: t.comment.id, root: t.comment.parentCommentId })
			.from(t.comment)
			.where(
				and(
					eq(t.comment.id, input.replyTo),
					eq(t.comment.parentType, input.parentType),
					eq(t.comment.parentId, input.parentId)
				)
			)
			.limit(1);
		if (!p) return { ok: false, message: 'The comment you replied to is no longer available.' };
		parentCommentId = p.root ?? p.id; // one level of threading
	}
	return db().transaction(async (tx) => {
		const [row] = await tx
			.insert(t.comment)
			.values({
				parentType: input.parentType,
				parentId: input.parentId,
				parentCommentId,
				body: input.body,
				anonLabelSeed: input.seed,
				authorTokenHash: input.tokenHash,
				visibility: input.visibility
			})
			.returning({ id: t.comment.id });
		if (input.visibility === 'published')
			await bumpCommentCount(tx, input.parentType, input.parentId, 1);
		return { ok: true as const, id: row.id };
	});
}

type Tx = Parameters<Parameters<ReturnType<typeof db>['transaction']>[0]>[0];

export async function bumpCommentCount(
	tx: Tx,
	parentType: ParentType,
	parentId: number,
	delta: number
) {
	if (parentType === 'concern') {
		await tx
			.update(t.concern)
			.set({
				commentCount: sql`greatest(${t.concern.commentCount} + ${delta}, 0)`,
				updatedAt: sql`${t.concern.updatedAt}`
			})
			.where(eq(t.concern.id, parentId));
	} else if (parentType === 'proposal') {
		await tx
			.update(t.proposal)
			.set({ commentCount: sql`greatest(${t.proposal.commentCount} + ${delta}, 0)` })
			.where(eq(t.proposal.id, parentId));
	} else {
		await tx
			.update(t.post)
			.set({
				commentCount: sql`greatest(${t.post.commentCount} + ${delta}, 0)`,
				updatedAt: sql`${t.post.updatedAt}`
			})
			.where(eq(t.post.id, parentId));
	}
}
