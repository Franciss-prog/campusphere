import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { desc, eq, sql } from 'drizzle-orm';
import { requireStaff } from '#lib/server/auth.ts';
import { db, t } from '#lib/server/db/index.ts';
import { moderate } from '#lib/server/services/moderation.ts';
import { oneOf } from '#lib/server/query.ts';
import type { Actions, PageServerLoad } from './$types';

const TYPES = ['post', 'proposal', 'comment'] as const;
const VIS = ['all', 'published', 'pending', 'hidden'] as const;

export const load: PageServerLoad = async (event) => {
	requireStaff(event);
	const type = oneOf(event.url, 'type', TYPES, 'post');
	const vis = oneOf(event.url, 'vis', VIS, 'all');
	let rows: {
		id: number;
		title: string;
		context: string;
		href: string;
		visibility: string;
		createdAt: Date;
		reports: number;
	}[];
	const reports = (tt: string, col: unknown) =>
		sql<number>`(select count(*)::int from ${t.report} r where r.target_type = ${tt} and r.target_id = ${col} and r.status = 'open')`;
	if (type === 'post') {
		const r = await db()
			.select({
				id: t.post.id,
				title: t.post.title,
				slug: t.post.slug,
				visibility: t.post.status,
				createdAt: t.post.createdAt,
				official: t.post.isOfficial,
				reports: reports('post', t.post.id)
			})
			.from(t.post)
			.where(vis === 'all' ? undefined : eq(t.post.status, vis))
			.orderBy(desc(t.post.createdAt))
			.limit(100);
		rows = r.map((x) => ({
			...x,
			context: x.official ? 'Official post' : 'Blog post',
			href: `/blog/${x.slug}`
		}));
	} else if (type === 'proposal') {
		const r = await db()
			.select({
				id: t.proposal.id,
				title: t.proposal.title,
				concernId: t.proposal.concernId,
				concern: t.concern.title,
				visibility: t.proposal.visibility,
				createdAt: t.proposal.createdAt,
				reports: reports('proposal', t.proposal.id)
			})
			.from(t.proposal)
			.innerJoin(t.concern, eq(t.concern.id, t.proposal.concernId))
			.where(vis === 'all' ? undefined : eq(t.proposal.visibility, vis))
			.orderBy(desc(t.proposal.createdAt))
			.limit(100);
		rows = r.map((x) => ({ ...x, context: `On ${x.concern}`, href: `/concerns/${x.concernId}` }));
	} else {
		const r = await db()
			.select({
				id: t.comment.id,
				body: t.comment.body,
				parentType: t.comment.parentType,
				parentId: t.comment.parentId,
				visibility: t.comment.visibility,
				createdAt: t.comment.createdAt,
				reports: reports('comment', t.comment.id)
			})
			.from(t.comment)
			.where(vis === 'all' ? undefined : eq(t.comment.visibility, vis))
			.orderBy(desc(t.comment.createdAt))
			.limit(100);
		rows = r.map((x) => ({
			id: x.id,
			title: x.body.length > 120 ? x.body.slice(0, 120) + '…' : x.body,
			context: `Comment on a ${x.parentType}`,
			href:
				x.parentType === 'post'
					? `/admin/moderation?item=comment:${x.id}`
					: x.parentType === 'concern'
						? `/concerns/${x.parentId}`
						: `/admin/moderation?item=comment:${x.id}`,
			visibility: x.visibility,
			createdAt: x.createdAt,
			reports: x.reports
		}));
	}
	return { type, vis, rows };
};

const schema = z.object({
	targetType: z.enum(TYPES),
	targetId: z.coerce.number().int().positive()
});

async function act(event: Parameters<Actions[string]>[0], action: 'hide' | 'restore') {
	const staff = requireStaff(event);
	const p = schema.safeParse(Object.fromEntries(await event.request.formData()));
	if (!p.success) return fail(400, { message: 'Invalid request.' });
	await moderate({
		staffId: staff.id,
		targetType: p.data.targetType,
		targetId: p.data.targetId,
		action
	});
	return { ok: true, message: action === 'hide' ? 'Hidden.' : 'Restored.' };
}

export const actions: Actions = { hide: (e) => act(e, 'hide'), restore: (e) => act(e, 'restore') };
