import { requireStaff } from '#lib/server/auth.ts';
import { dashboard } from '#lib/server/services/admin.ts';
import { moderationQueue, recentAudit } from '#lib/server/services/moderation.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event);
	const [d, queue, activity] = await Promise.all([dashboard(), moderationQueue(), recentAudit(8)]);
	return {
		...d,
		reportsToReview: queue.length,
		queueTop: queue.slice(0, 4).map((q) => ({
			key: `${q.targetType}:${q.targetId}`,
			title: q.title,
			reports: q.reports,
			at: q.lastReportedAt,
			pending: q.visibility === 'pending'
		})),
		activity: activity.map((a) => ({ ...a, meta: a.meta as Record<string, unknown> }))
	};
};
