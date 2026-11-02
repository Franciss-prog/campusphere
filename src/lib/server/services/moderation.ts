import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { db, t } from '../db/index.ts';
import { audit, type AuditAction } from '../audit.ts';
import { getSettings } from '../settings.ts';
import { bumpCommentCount, type ParentType } from './comments.ts';

export type TargetType = 'post' | 'concern' | 'proposal' | 'comment';
export type Visibility = 'published' | 'pending' | 'hidden';

export const REPORT_REASONS = [
	'Names or targets a private person',
	'Harassment or abusive language',
	'Spam or advertising',
	'Off topic',
	'Safety concern',
	'Something else'
] as const;

type Tx = Parameters<Parameters<ReturnType<typeof db>['transaction']>[0]>[0];

async function currentVisibility(tx: Tx, type: TargetType, id: number): Promise<Visibility | null> {
	const rows =
		type === 'post'
			? await tx.select({ v: t.post.status }).from(t.post).where(eq(t.post.id, id))
			: type === 'concern'
				? await tx.select({ v: t.concern.visibility }).from(t.concern).where(eq(t.concern.id, id))
				: type === 'proposal'
					? await tx
							.select({ v: t.proposal.visibility })
							.from(t.proposal)
							.where(eq(t.proposal.id, id))
					: await tx
							.select({ v: t.comment.visibility })
							.from(t.comment)
							.where(eq(t.comment.id, id));
	return rows[0]?.v ?? null;
}

/**
 * Changes visibility and keeps denormalized counters in step (a hidden comment no longer counts,
 * a hidden proposal no longer counts on its concern).
 */
export async function setVisibility(tx: Tx, type: TargetType, id: number, to: Visibility) {
	const from = await currentVisibility(tx, type, id);
	if (!from || from === to) return from;
	const delta = from === 'published' ? -1 : to === 'published' ? 1 : 0;

	if (type === 'post') {
		await tx
			.update(t.post)
			.set({ status: to, updatedAt: sql`${t.post.updatedAt}` })
			.where(eq(t.post.id, id));
	} else if (type === 'concern') {
		await tx
			.update(t.concern)
			.set({ visibility: to, updatedAt: sql`${t.concern.updatedAt}` })
			.where(eq(t.concern.id, id));
	} else if (type === 'proposal') {
		const [p] = await tx
			.update(t.proposal)
			.set({ visibility: to })
			.where(eq(t.proposal.id, id))
			.returning({ concernId: t.proposal.concernId });
		if (delta && p) {
			await tx
				.update(t.concern)
				.set({
					proposalCount: sql`greatest(${t.concern.proposalCount} + ${delta}, 0)`,
					updatedAt: sql`${t.concern.updatedAt}`
				})
				.where(eq(t.concern.id, p.concernId));
		}
	} else {
		const [c] = await tx
			.update(t.comment)
			.set({ visibility: to })
			.where(eq(t.comment.id, id))
			.returning({ parentType: t.comment.parentType, parentId: t.comment.parentId });
		if (delta && c) await bumpCommentCount(tx, c.parentType as ParentType, c.parentId, delta);
	}
	return from;
}

export async function fileReport(input: {
	targetType: TargetType;
	targetId: number;
	reason: string;
	details: string | null;
	tokenHash: string;
}): Promise<{ ok: true; autoHidden: boolean } | { ok: false; message: string }> {
	const settings = await getSettings();
	return db().transaction(async (tx) => {
		const vis = await currentVisibility(tx, input.targetType, input.targetId);
		if (!vis) return { ok: false as const, message: 'This item is no longer available.' };
		await tx
			.insert(t.report)
			.values({
				targetType: input.targetType,
				targetId: input.targetId,
				reason: input.reason,
				details: input.details,
				reporterTokenHash: input.tokenHash
			})
			.onConflictDoNothing(); // one open report per browser per item
		const [{ n }] = await tx
			.select({ n: sql<number>`count(distinct ${t.report.reporterTokenHash})::int` })
			.from(t.report)
			.where(
				and(
					eq(t.report.targetType, input.targetType),
					eq(t.report.targetId, input.targetId),
					eq(t.report.status, 'open')
				)
			);
		let autoHidden = false;
		if (vis === 'published' && n >= settings.auto_hide_threshold) {
			await setVisibility(tx, input.targetType, input.targetId, 'hidden');
			await audit(
				{
					staffId: null,
					action: 'content.auto_hide',
					targetType: input.targetType,
					targetId: input.targetId,
					meta: { reports: n, threshold: settings.auto_hide_threshold }
				},
				tx
			);
			autoHidden = true;
		}
		return { ok: true as const, autoHidden };
	});
}

/** Staff action on an item: hide / restore / approve, closing its open reports. */
export async function moderate(input: {
	staffId: number;
	targetType: TargetType;
	targetId: number;
	action: 'hide' | 'restore' | 'approve' | 'dismiss';
	note?: string | null;
}) {
	const map: Record<
		typeof input.action,
		{ to: Visibility | null; audit: AuditAction; reports: 'actioned' | 'dismissed' }
	> = {
		hide: { to: 'hidden', audit: 'content.hide', reports: 'actioned' },
		restore: { to: 'published', audit: 'content.restore', reports: 'dismissed' },
		approve: { to: 'published', audit: 'content.approve', reports: 'dismissed' },
		dismiss: { to: null, audit: 'report.dismiss', reports: 'dismissed' }
	};
	const m = map[input.action];
	await db().transaction(async (tx) => {
		const from = m.to ? await setVisibility(tx, input.targetType, input.targetId, m.to) : null;
		const closed = await tx
			.update(t.report)
			.set({ status: m.reports, resolvedById: input.staffId, resolvedAt: new Date() })
			.where(
				and(
					eq(t.report.targetType, input.targetType),
					eq(t.report.targetId, input.targetId),
					eq(t.report.status, 'open')
				)
			)
			.returning({ id: t.report.id });
		await audit(
			{
				staffId: input.staffId,
				action: m.audit,
				targetType: input.targetType,
				targetId: input.targetId,
				meta: { from, reportsClosed: closed.length, note: input.note ?? undefined }
			},
			tx
		);
	});
}

/** Replaces the selected text of a comment/concern/proposal body with "[name removed]". */
export async function redact(input: {
	staffId: number;
	targetType: Exclude<TargetType, 'post'>;
	targetId: number;
	phrase: string;
}): Promise<{ ok: boolean; message: string }> {
	const phrase = input.phrase.trim();
	if (phrase.length < 2) return { ok: false, message: 'Enter the name or phrase to remove.' };
	const replace = (col: unknown) => sql`replace(${col}, ${phrase}, '[name removed]')`;
	let changed = 0;
	await db().transaction(async (tx) => {
		if (input.targetType === 'comment') {
			const r = await tx
				.update(t.comment)
				.set({ body: replace(t.comment.body) })
				.where(
					and(eq(t.comment.id, input.targetId), sql`position(${phrase} in ${t.comment.body}) > 0`)
				)
				.returning({ id: t.comment.id });
			changed = r.length;
		} else if (input.targetType === 'concern') {
			const r = await tx
				.update(t.concern)
				.set({ title: replace(t.concern.title), description: replace(t.concern.description) })
				.where(
					and(
						eq(t.concern.id, input.targetId),
						sql`(position(${phrase} in ${t.concern.title}) > 0 or position(${phrase} in ${t.concern.description}) > 0)`
					)
				)
				.returning({ id: t.concern.id });
			changed = r.length;
		} else {
			const r = await tx
				.update(t.proposal)
				.set({ title: replace(t.proposal.title), description: replace(t.proposal.description) })
				.where(
					and(
						eq(t.proposal.id, input.targetId),
						sql`(position(${phrase} in ${t.proposal.title}) > 0 or position(${phrase} in ${t.proposal.description}) > 0)`
					)
				)
				.returning({ id: t.proposal.id });
			changed = r.length;
		}
		if (changed) {
			// The redacted phrase itself is not written to the log.
			await audit(
				{
					staffId: input.staffId,
					action: 'content.redact',
					targetType: input.targetType,
					targetId: input.targetId
				},
				tx
			);
		}
	});
	return changed
		? { ok: true, message: 'The name was removed.' }
		: { ok: false, message: 'That exact text was not found. Copy it exactly as written.' };
}

export type QueueItem = {
	targetType: TargetType;
	targetId: number;
	reports: number;
	lastReportedAt: Date;
	reasons: { reason: string; n: number }[];
	visibility: Visibility | null;
	title: string;
	body: string;
	context: string | null;
	contextHref: string | null;
	isSensitive: boolean;
};

/** Open reports grouped by item, plus content held for review (pending), oldest first. */
export async function moderationQueue(): Promise<QueueItem[]> {
	const grouped = await db()
		.select({
			targetType: t.report.targetType,
			targetId: t.report.targetId,
			reports: sql<number>`count(distinct ${t.report.reporterTokenHash})::int`,
			lastReportedAt: sql<Date>`max(${t.report.createdAt})`
		})
		.from(t.report)
		.where(eq(t.report.status, 'open'))
		.groupBy(t.report.targetType, t.report.targetId);

	const reasons = grouped.length
		? await db()
				.select({
					targetType: t.report.targetType,
					targetId: t.report.targetId,
					reason: t.report.reason,
					n: sql<number>`count(*)::int`
				})
				.from(t.report)
				.where(eq(t.report.status, 'open'))
				.groupBy(t.report.targetType, t.report.targetId, t.report.reason)
		: [];

	// Pending items (pre-moderation, word filter, sensitive) also need a decision.
	const [pc, pp, pm, pt] = await Promise.all([
		db()
			.select({ id: t.concern.id, at: t.concern.createdAt })
			.from(t.concern)
			.where(eq(t.concern.visibility, 'pending')),
		db()
			.select({ id: t.proposal.id, at: t.proposal.createdAt })
			.from(t.proposal)
			.where(eq(t.proposal.visibility, 'pending')),
		db()
			.select({ id: t.comment.id, at: t.comment.createdAt })
			.from(t.comment)
			.where(eq(t.comment.visibility, 'pending')),
		db()
			.select({ id: t.post.id, at: t.post.createdAt })
			.from(t.post)
			.where(eq(t.post.status, 'pending'))
	]);
	const keys = new Map<
		string,
		{ targetType: TargetType; targetId: number; reports: number; lastReportedAt: Date }
	>();
	for (const g of grouped)
		keys.set(`${g.targetType}:${g.targetId}`, { ...g, lastReportedAt: new Date(g.lastReportedAt) });
	const addPending = (type: TargetType, rows: { id: number; at: Date }[]) => {
		for (const r of rows) {
			const k = `${type}:${r.id}`;
			if (!keys.has(k))
				keys.set(k, { targetType: type, targetId: r.id, reports: 0, lastReportedAt: r.at });
		}
	};
	addPending('concern', pc);
	addPending('proposal', pp);
	addPending('comment', pm);
	addPending('post', pt);

	const items: QueueItem[] = [];
	for (const k of keys.values()) {
		const d = await describeTarget(k.targetType, k.targetId);
		if (!d) continue;
		items.push({
			...k,
			reasons: reasons
				.filter((r) => r.targetType === k.targetType && r.targetId === k.targetId)
				.map((r) => ({ reason: r.reason, n: r.n })),
			...d
		});
	}
	return items.sort((a, b) => a.lastReportedAt.getTime() - b.lastReportedAt.getTime());
}

export async function describeTarget(type: TargetType, id: number) {
	if (type === 'concern') {
		const [r] = await db().select().from(t.concern).where(eq(t.concern.id, id));
		return r
			? {
					visibility: r.visibility,
					title: r.title,
					body: r.description,
					context: r.kind === 'recommendation' ? 'Recommendation' : 'Concern',
					contextHref: `/concerns/${r.id}`,
					isSensitive: r.isSensitive
				}
			: null;
	}
	if (type === 'proposal') {
		const [r] = await db()
			.select({ p: t.proposal, concernTitle: t.concern.title })
			.from(t.proposal)
			.innerJoin(t.concern, eq(t.concern.id, t.proposal.concernId))
			.where(eq(t.proposal.id, id));
		return r
			? {
					visibility: r.p.visibility,
					title: r.p.title,
					body: r.p.description,
					context: `Solution proposal on "${r.concernTitle}"`,
					contextHref: `/concerns/${r.p.concernId}`,
					isSensitive: false
				}
			: null;
	}
	if (type === 'post') {
		const [r] = await db().select().from(t.post).where(eq(t.post.id, id));
		return r
			? {
					visibility: r.status,
					title: r.title,
					body: r.excerpt || r.bodyMd.slice(0, 400),
					context: 'Blog post',
					contextHref: `/blog/${r.slug}`,
					isSensitive: false
				}
			: null;
	}
	const [c] = await db().select().from(t.comment).where(eq(t.comment.id, id));
	if (!c) return null;
	let context: string;
	let contextHref: string | null;
	if (c.parentType === 'concern') {
		const [p] = await db()
			.select({ title: t.concern.title })
			.from(t.concern)
			.where(eq(t.concern.id, c.parentId));
		context = `Comment on "${p?.title ?? 'a concern'}"`;
		contextHref = `/concerns/${c.parentId}`;
	} else if (c.parentType === 'post') {
		const [p] = await db()
			.select({ title: t.post.title, slug: t.post.slug })
			.from(t.post)
			.where(eq(t.post.id, c.parentId));
		context = `Comment on "${p?.title ?? 'a post'}"`;
		contextHref = p ? `/blog/${p.slug}` : null;
	} else {
		const [p] = await db()
			.select({ title: t.proposal.title, concernId: t.proposal.concernId })
			.from(t.proposal)
			.where(eq(t.proposal.id, c.parentId));
		context = `Comment on the proposal "${p?.title ?? ''}"`;
		contextHref = p ? `/concerns/${p.concernId}` : null;
	}
	return {
		visibility: c.visibility,
		title: c.body.length > 90 ? c.body.slice(0, 90) + '…' : c.body,
		body: c.body,
		context,
		contextHref,
		isSensitive: false
	};
}

export async function openReportCount(): Promise<number> {
	const [r] = await db()
		.select({ n: sql<number>`count(distinct (${t.report.targetType}, ${t.report.targetId}))::int` })
		.from(t.report)
		.where(eq(t.report.status, 'open'));
	return r.n;
}

export async function recentAudit(limit = 8) {
	return db()
		.select({
			id: t.auditLog.id,
			action: t.auditLog.action,
			targetType: t.auditLog.targetType,
			targetId: t.auditLog.targetId,
			meta: t.auditLog.meta,
			createdAt: t.auditLog.createdAt,
			staffEmail: t.staffUser.email,
			staffRole: t.staffUser.role
		})
		.from(t.auditLog)
		.leftJoin(t.staffUser, eq(t.staffUser.id, t.auditLog.staffId))
		.where(ne(t.auditLog.action, 'staff.login'))
		.orderBy(desc(t.auditLog.createdAt))
		.limit(limit);
}
