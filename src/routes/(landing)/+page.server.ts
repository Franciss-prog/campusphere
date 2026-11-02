import { desc, eq, and, inArray } from 'drizzle-orm';
import { db, t } from '#lib/server/db/index.ts';
import { publicStats } from '#lib/server/services/concerns.ts';
import { pinnedPost } from '#lib/server/services/posts.ts';
import { parseUniversityStatement } from '#lib/university.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const base = db()
		.select({
			id: t.concern.id,
			title: t.concern.title,
			description: t.concern.description,
			status: t.concern.currentStatus,
			supportCount: t.concern.supportCount,
			commentCount: t.concern.commentCount
		})
		.from(t.concern);
	const [stats, pinned, open, resolved, review, recent] = await Promise.all([
		publicStats(),
		pinnedPost(),
		base
			.where(
				and(
					eq(t.concern.visibility, 'published'),
					inArray(t.concern.currentStatus, ['in_discussion', 'in_progress', 'action_planned'])
				)
			)
			.orderBy(desc(t.concern.supportCount))
			.limit(1),
		db()
			.select({
				id: t.concern.id,
				title: t.concern.title,
				status: t.concern.currentStatus,
				supportCount: t.concern.supportCount,
				commentCount: t.concern.commentCount
			})
			.from(t.concern)
			.where(and(eq(t.concern.visibility, 'published'), eq(t.concern.currentStatus, 'resolved')))
			.orderBy(desc(t.concern.statusChangedAt))
			.limit(1),
		db()
			.select({ id: t.concern.id, title: t.concern.title, status: t.concern.currentStatus })
			.from(t.concern)
			.where(
				and(
					eq(t.concern.visibility, 'published'),
					inArray(t.concern.currentStatus, ['under_review', 'submitted'])
				)
			)
			.orderBy(desc(t.concern.supportCount))
			.limit(1),
		db()
			.select({ id: t.concern.id, title: t.concern.title })
			.from(t.concern)
			.where(eq(t.concern.visibility, 'published'))
			.orderBy(desc(t.concern.createdAt))
			.limit(8)
	]);
	const statement = pinned ? parseUniversityStatement(pinned.bodyMd) : null;
	return {
		stats,
		statement,
		pinnedSlug: pinned?.slug ?? null,
		notes: {
			open: open[0]
				? { ...open[0], description: open[0].description.split(/(?<=[.!?])\s/)[0] }
				: null,
			resolved: resolved[0] ?? null,
			review: review[0] ?? null
		},
		marquee: recent.map((r) => r.title)
	};
};
