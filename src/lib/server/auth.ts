import { createHash, randomBytes } from 'node:crypto';
import { error, redirect, type Cookies, type RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/env';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { db, t } from './db/index.ts';

export const STAFF_COOKIE = 'cs_staff';
const SESSION_MS = 12 * 3_600_000;
const RENEW_BELOW_MS = 6 * 3_600_000;
/** How long an invite's temporary password works. */
export const TEMP_PASSWORD_MS = 72 * 3_600_000;

export type Staff = NonNullable<App.Locals['staff']>;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function createSession(cookies: Cookies, staffId: number): Promise<void> {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_MS);
	await db()
		.insert(t.staffSession)
		.values({ id: sha256(token), staffId, expiresAt });
	cookies.set(STAFF_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		expires: expiresAt
	});
	// Housekeeping: drop expired sessions.
	await db().delete(t.staffSession).where(lt(t.staffSession.expiresAt, new Date()));
}

export async function readSession(cookies: Cookies): Promise<Staff | null> {
	const token = cookies.get(STAFF_COOKIE);
	if (!token || token.length > 100) return null;
	const id = sha256(token);
	const [row] = await db()
		.select({
			id: t.staffUser.id,
			email: t.staffUser.email,
			displayName: t.staffUser.displayName,
			role: t.staffUser.role,
			mustChangePassword: t.staffUser.mustChangePassword,
			expiresAt: t.staffSession.expiresAt
		})
		.from(t.staffSession)
		.innerJoin(t.staffUser, eq(t.staffUser.id, t.staffSession.staffId))
		.where(
			and(
				eq(t.staffSession.id, id),
				gt(t.staffSession.expiresAt, new Date()),
				isNull(t.staffUser.disabledAt)
			)
		)
		.limit(1);
	if (!row) {
		cookies.delete(STAFF_COOKIE, { path: '/' });
		return null;
	}
	if (row.expiresAt.getTime() - Date.now() < RENEW_BELOW_MS) {
		const expiresAt = new Date(Date.now() + SESSION_MS);
		await db().update(t.staffSession).set({ expiresAt }).where(eq(t.staffSession.id, id));
		cookies.set(STAFF_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			expires: expiresAt
		});
	}
	return {
		id: row.id,
		email: row.email,
		displayName: row.displayName,
		role: row.role,
		mustChangePassword: row.mustChangePassword
	};
}

export async function destroySession(cookies: Cookies): Promise<void> {
	const token = cookies.get(STAFF_COOKIE);
	if (token)
		await db()
			.delete(t.staffSession)
			.where(eq(t.staffSession.id, sha256(token)));
	cookies.delete(STAFF_COOKIE, { path: '/' });
}

// ---------------------------------------------------------------------------
// RBAC: call at the top of every admin load function and action.
// ---------------------------------------------------------------------------
export function requireStaff(event: Pick<RequestEvent, 'locals' | 'url'>): Staff {
	const staff = event.locals.staff;
	if (!staff) {
		redirect(303, `/admin/login?next=${encodeURIComponent(event.url.pathname)}`);
	}
	return staff;
}

export function requireAdmin(event: Pick<RequestEvent, 'locals' | 'url'>): Staff {
	const staff = requireStaff(event);
	if (staff.role !== 'ADMIN') error(403, { message: 'Only administrators can do this.' });
	return staff;
}

export function can(
	staff: Staff | null,
	action: 'moderate' | 'change-status' | 'manage-taxonomy' | 'manage-staff'
): boolean {
	if (!staff) return false;
	if (action === 'moderate') return true;
	return staff.role === 'ADMIN';
}
