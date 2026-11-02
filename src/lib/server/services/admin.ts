import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { db, t } from '../db/index.ts';
import { audit } from '../audit.ts';
import { hashPassword } from '../password.ts';
import { TEMP_PASSWORD_MS } from '../auth.ts';
import { slugify } from '../sanitize.ts';
import type { ConcernStatus } from '#lib/status.ts';

/** A concern "needs update" when it sat at Submitted for 3+ days or any open stage for 10+ days. */
const NEEDS_UPDATE = sql`(
	(${t.concern.currentStatus} = 'submitted' and ${t.concern.statusChangedAt} < now() - interval '3 days')
	or (${t.concern.currentStatus} not in ('submitted', 'resolved', 'closed') and ${t.concern.statusChangedAt} < now() - interval '10 days')
)`;

export async function dashboard() {
	const [[stale], [week], [resolved]] = await Promise.all([
		db()
			.select({ n: sql<number>`count(*)::int` })
			.from(t.concern)
			.where(and(eq(t.concern.visibility, 'published'), NEEDS_UPDATE)),
		db()
			.select({ n: sql<number>`count(*)::int` })
			.from(t.concern)
			.where(sql`${t.concern.createdAt} > now() - interval '7 days'`),
		db()
			.select({ n: sql<number>`count(*)::int` })
			.from(t.concern)
			.where(
				and(
					eq(t.concern.currentStatus, 'resolved'),
					sql`${t.concern.statusChangedAt} > date_trunc('month', now())`
				)
			)
	]);

	const weeks = await db().execute<{ week: string; n: number }>(sql`
		select to_char(w.week, 'Mon DD') as week, coalesce(count(c.id), 0)::int as n
		from generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') as w(week)
		left join ${t.concern} c on date_trunc('week', c.created_at) = w.week
		group by w.week order by w.week`);

	const staleList = await db()
		.select({
			id: t.concern.id,
			title: t.concern.title,
			status: t.concern.currentStatus,
			statusChangedAt: t.concern.statusChangedAt
		})
		.from(t.concern)
		.where(and(eq(t.concern.visibility, 'published'), NEEDS_UPDATE))
		.orderBy(asc(t.concern.statusChangedAt))
		.limit(5);

	return {
		staleCount: stale.n,
		newThisWeek: week.n,
		resolvedThisMonth: resolved.n,
		weeks: weeks.rows.map((r) => ({ week: r.week, n: Number(r.n) })),
		staleList
	};
}

export async function adminConcerns(f: {
	q: string | null;
	status: ConcernStatus | 'stale' | null;
}) {
	const parts = [
		f.status === 'stale'
			? NEEDS_UPDATE
			: f.status
				? eq(t.concern.currentStatus, f.status)
				: undefined,
		f.q ? sql`${t.concern.title} ilike ${'%' + f.q.replace(/[%_\\]/g, '\\$&') + '%'}` : undefined
	];
	return db()
		.select({
			id: t.concern.id,
			title: t.concern.title,
			kind: t.concern.kind,
			status: t.concern.currentStatus,
			visibility: t.concern.visibility,
			isSensitive: t.concern.isSensitive,
			categoryName: t.category.name,
			supportCount: t.concern.supportCount,
			statusChangedAt: t.concern.statusChangedAt,
			needsUpdate: sql<boolean>`${NEEDS_UPDATE}`
		})
		.from(t.concern)
		.leftJoin(t.category, eq(t.category.id, t.concern.categoryId))
		.where(and(...parts))
		.orderBy(desc(sql`${NEEDS_UPDATE}`), desc(t.concern.statusChangedAt))
		.limit(100);
}

// ---------------------------------------------------------------------------
// Staff accounts
// ---------------------------------------------------------------------------
export async function listStaff() {
	return db()
		.select({
			id: t.staffUser.id,
			email: t.staffUser.email,
			displayName: t.staffUser.displayName,
			role: t.staffUser.role,
			pendingSetup: t.staffUser.mustChangePassword,
			lastLoginAt: t.staffUser.lastLoginAt,
			createdAt: t.staffUser.createdAt
		})
		.from(t.staffUser)
		.where(isNull(t.staffUser.disabledAt))
		.orderBy(asc(t.staffUser.createdAt));
}

/** Creates a staff account with a one-time temporary password the admin hands over privately. */
export async function inviteStaff(byId: number, email: string, role: 'ADMIN' | 'MODERATOR') {
	const temp = randomBytes(12).toString('base64url');
	const passwordHash = await hashPassword(temp);
	const temporary = {
		mustChangePassword: true,
		tempPasswordExpiresAt: new Date(Date.now() + TEMP_PASSWORD_MS)
	};
	const [existing] = await db().select().from(t.staffUser).where(eq(t.staffUser.email, email));
	if (existing && !existing.disabledAt)
		return { ok: false as const, message: 'This email already has an account.' };
	const id = existing
		? (
				await db()
					.update(t.staffUser)
					.set({ passwordHash, role, disabledAt: null, ...temporary })
					.where(eq(t.staffUser.id, existing.id))
					.returning({ id: t.staffUser.id })
			)[0].id
		: (
				await db()
					.insert(t.staffUser)
					.values({ email, passwordHash, role, ...temporary })
					.returning({ id: t.staffUser.id })
			)[0].id;
	await audit({
		staffId: byId,
		action: 'staff.invite',
		targetType: 'staff',
		targetId: id,
		meta: { role }
	});
	return { ok: true as const, temp };
}

async function adminCount() {
	const [r] = await db()
		.select({ n: sql<number>`count(*)::int` })
		.from(t.staffUser)
		.where(and(eq(t.staffUser.role, 'ADMIN'), isNull(t.staffUser.disabledAt)));
	return r.n;
}

export async function setRole(byId: number, id: number, role: 'ADMIN' | 'MODERATOR') {
	if (id === byId) return { ok: false, message: 'You cannot change your own role.' };
	const [u] = await db().select().from(t.staffUser).where(eq(t.staffUser.id, id));
	if (!u || u.disabledAt) return { ok: false, message: 'This account no longer exists.' };
	if (u.role === 'ADMIN' && role !== 'ADMIN' && (await adminCount()) <= 1) {
		return { ok: false, message: 'Keep at least one administrator.' };
	}
	await db().update(t.staffUser).set({ role }).where(eq(t.staffUser.id, id));
	await audit({
		staffId: byId,
		action: 'staff.role',
		targetType: 'staff',
		targetId: id,
		meta: { role }
	});
	return { ok: true, message: `Role updated for ${u.email}.` };
}

export async function removeStaff(byId: number, id: number) {
	if (id === byId) return { ok: false, message: 'You cannot remove your own account.' };
	const [u] = await db().select().from(t.staffUser).where(eq(t.staffUser.id, id));
	if (!u || u.disabledAt) return { ok: false, message: 'This account no longer exists.' };
	if (u.role === 'ADMIN' && (await adminCount()) <= 1)
		return { ok: false, message: 'Keep at least one administrator.' };
	// Disable rather than delete so audit entries keep their author.
	await db().update(t.staffUser).set({ disabledAt: new Date() }).where(eq(t.staffUser.id, id));
	await db().delete(t.staffSession).where(eq(t.staffSession.staffId, id));
	await audit({ staffId: byId, action: 'staff.remove', targetType: 'staff', targetId: id });
	return { ok: true, message: `${u.email} was removed.` };
}

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------
export async function taxonomy() {
	const cats = await db()
		.select({
			id: t.category.id,
			name: t.category.name,
			type: t.category.type,
			isFallback: t.category.isFallback,
			items: sql<number>`case when ${t.category.type} = 'concern'
				then (select count(*) from ${t.concern} c where c.category_id = ${t.category.id})
				else (select count(*) from ${t.post} p where p.category_id = ${t.category.id}) end::int`
		})
		.from(t.category)
		.orderBy(asc(t.category.type), asc(t.category.sort), asc(t.category.name));
	const tags = await db()
		.select({
			id: t.tag.id,
			name: t.tag.name,
			items: sql<number>`((select count(*) from ${t.concernTag} x where x.tag_id = ${t.tag.id}) + (select count(*) from ${t.postTag} y where y.tag_id = ${t.tag.id}))::int`
		})
		.from(t.tag)
		.orderBy(asc(t.tag.name));
	return { cats, tags };
}

export async function addCategory(byId: number, type: 'concern' | 'blog', name: string) {
	const slug = slugify(name);
	const [dup] = await db()
		.select({ id: t.category.id })
		.from(t.category)
		.where(and(eq(t.category.type, type), eq(t.category.slug, slug)));
	if (dup) return { ok: false, message: 'A category with this name already exists.' };
	const [{ max }] = await db()
		.select({ max: sql<number>`coalesce(max(${t.category.sort}), 0)::int` })
		.from(t.category)
		.where(and(eq(t.category.type, type), eq(t.category.isFallback, false)));
	const [row] = await db()
		.insert(t.category)
		.values({ name, slug, type, sort: max + 1 })
		.returning({ id: t.category.id });
	// Keep the fallback ("Other") last.
	await db()
		.update(t.category)
		.set({ sort: max + 2 })
		.where(and(eq(t.category.type, type), eq(t.category.isFallback, true)));
	await audit({
		staffId: byId,
		action: 'category.create',
		targetType: 'category',
		targetId: row.id,
		meta: { name }
	});
	return { ok: true, message: `Added ${name}.` };
}

export async function renameCategory(byId: number, id: number, name: string) {
	const [c] = await db().select().from(t.category).where(eq(t.category.id, id));
	if (!c) return { ok: false, message: 'This category no longer exists.' };
	const slug = slugify(name);
	const [dup] = await db()
		.select({ id: t.category.id })
		.from(t.category)
		.where(and(eq(t.category.type, c.type), eq(t.category.slug, slug), ne(t.category.id, id)));
	if (dup) return { ok: false, message: 'Another category already uses this name.' };
	await db().update(t.category).set({ name, slug }).where(eq(t.category.id, id));
	await audit({
		staffId: byId,
		action: 'category.rename',
		targetType: 'category',
		targetId: id,
		meta: { from: c.name, to: name }
	});
	return { ok: true, message: `Renamed to ${name}.` };
}

/** Deletes a category after a typed-name confirmation; its items move to the fallback ("Other"). */
export async function deleteCategory(byId: number, id: number, confirmName: string) {
	const [c] = await db().select().from(t.category).where(eq(t.category.id, id));
	if (!c) return { ok: false, message: 'This category no longer exists.' };
	if (c.isFallback) return { ok: false, message: `${c.name} cannot be deleted.` };
	if (confirmName.trim() !== c.name)
		return { ok: false, message: `Type "${c.name}" exactly to confirm.` };
	await db().transaction(async (tx) => {
		const [fallback] = await tx
			.select({ id: t.category.id })
			.from(t.category)
			.where(and(eq(t.category.type, c.type), eq(t.category.isFallback, true)));
		const target = fallback?.id ?? null;
		if (c.type === 'concern') {
			await tx.update(t.concern).set({ categoryId: target }).where(eq(t.concern.categoryId, id));
		} else {
			await tx.update(t.post).set({ categoryId: target }).where(eq(t.post.categoryId, id));
		}
		await tx.delete(t.category).where(eq(t.category.id, id));
		await audit(
			{
				staffId: byId,
				action: 'category.delete',
				targetType: 'category',
				targetId: id,
				meta: { name: c.name }
			},
			tx
		);
	});
	return { ok: true, message: `Deleted ${c.name}. Its items moved to Other.` };
}

export async function addTag(byId: number, name: string) {
	const slug = slugify(name);
	const [dup] = await db().select({ id: t.tag.id }).from(t.tag).where(eq(t.tag.slug, slug));
	if (dup) return { ok: false, message: 'This tag already exists.' };
	const [row] = await db()
		.insert(t.tag)
		.values({ name: name.toLowerCase(), slug })
		.returning({ id: t.tag.id });
	await audit({
		staffId: byId,
		action: 'tag.create',
		targetType: 'tag',
		targetId: row.id,
		meta: { name }
	});
	return { ok: true, message: `Added ${name}.` };
}

export async function renameTag(byId: number, id: number, name: string) {
	const slug = slugify(name);
	const [dup] = await db()
		.select({ id: t.tag.id })
		.from(t.tag)
		.where(and(eq(t.tag.slug, slug), ne(t.tag.id, id)));
	if (dup) return { ok: false, message: 'Another tag already uses this name. Merge them instead.' };
	const r = await db()
		.update(t.tag)
		.set({ name: name.toLowerCase(), slug })
		.where(eq(t.tag.id, id))
		.returning({ id: t.tag.id });
	if (!r.length) return { ok: false, message: 'This tag no longer exists.' };
	await audit({
		staffId: byId,
		action: 'tag.rename',
		targetType: 'tag',
		targetId: id,
		meta: { to: name }
	});
	return { ok: true, message: `Renamed to ${name}.` };
}

/** Moves every use of `fromId` onto `intoId`, then deletes `fromId`. */
export async function mergeTag(byId: number, fromId: number, intoId: number) {
	if (fromId === intoId) return { ok: false, message: 'Choose a different tag to merge into.' };
	await db().transaction(async (tx) => {
		await tx.execute(
			sql`insert into ${t.concernTag} (concern_id, tag_id) select concern_id, ${intoId} from ${t.concernTag} where tag_id = ${fromId} on conflict do nothing`
		);
		await tx.execute(
			sql`insert into ${t.postTag} (post_id, tag_id) select post_id, ${intoId} from ${t.postTag} where tag_id = ${fromId} on conflict do nothing`
		);
		await tx.delete(t.tag).where(eq(t.tag.id, fromId));
		await audit(
			{
				staffId: byId,
				action: 'tag.merge',
				targetType: 'tag',
				targetId: intoId,
				meta: { from: fromId }
			},
			tx
		);
	});
	return { ok: true, message: 'Tags merged.' };
}

export async function deleteTag(byId: number, id: number, confirmName: string) {
	const [tg] = await db().select().from(t.tag).where(eq(t.tag.id, id));
	if (!tg) return { ok: false, message: 'This tag no longer exists.' };
	if (confirmName.trim().toLowerCase() !== tg.name.toLowerCase()) {
		return { ok: false, message: `Type "${tg.name}" exactly to confirm.` };
	}
	await db().delete(t.tag).where(eq(t.tag.id, id));
	await audit({
		staffId: byId,
		action: 'tag.delete',
		targetType: 'tag',
		targetId: id,
		meta: { name: tg.name }
	});
	return { ok: true, message: `Deleted ${tg.name}.` };
}
