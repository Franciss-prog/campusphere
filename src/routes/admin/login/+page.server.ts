import { fail, redirect } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, t } from '#lib/server/db/index.ts';
import { createSession } from '#lib/server/auth.ts';
import { addressHash } from '#lib/server/anon.ts';
import { audit } from '#lib/server/audit.ts';
import { hashPassword, verifyPassword } from '#lib/server/password.ts';
import { hit } from '#lib/server/ratelimit.ts';
import type { Actions, PageServerLoad } from './$types';

function safeNext(next: string | null): string {
	return next && /^\/admin(\/[\w\-/]*)?$/.test(next) ? next : '/admin';
}

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.staff) redirect(303, safeNext(url.searchParams.get('next')));
	return {};
};

// Verified against when the email is unknown, so both paths take similar time.
let dummyHash: Promise<string> | undefined;

const schema = z.object({
	email: z.string().trim().toLowerCase().email('Enter a valid email.').max(200),
	password: z.string().min(1, 'Enter your password.').max(200)
});

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const parsed = schema.safeParse({ email: form.get('email'), password: form.get('password') });
		const email = String(form.get('email') ?? '').slice(0, 200);
		if (!parsed.success) return fail(400, { email, message: 'Enter your email and password.' });

		const emailKey = createHash('sha256').update(parsed.data.email).digest('hex').slice(0, 32);
		const lim = await hit('login', [addressHash(event), emailKey]);
		if (!lim.ok) {
			return fail(429, {
				email,
				message: `Too many attempts. Sign in is paused for ${Math.ceil(lim.retryAfter / 60)} minutes.`
			});
		}

		const [user] = await db()
			.select()
			.from(t.staffUser)
			.where(eq(t.staffUser.email, parsed.data.email))
			.limit(1);
		dummyHash ??= hashPassword('not-a-real-password-placeholder');
		const ok = await verifyPassword(user?.passwordHash ?? (await dummyHash), parsed.data.password);
		if (!user || !ok || user.disabledAt) {
			return fail(400, { email, message: 'That email and password do not match.' });
		}
		if (
			user.mustChangePassword &&
			user.tempPasswordExpiresAt &&
			user.tempPasswordExpiresAt.getTime() < Date.now()
		) {
			return fail(400, {
				email,
				message: 'This temporary password has expired. Ask an administrator for a new one.'
			});
		}

		await db()
			.update(t.staffUser)
			.set({ lastLoginAt: new Date() })
			.where(eq(t.staffUser.id, user.id));
		await createSession(event.cookies, user.id);
		await audit({ staffId: user.id, action: 'staff.login' });
		redirect(
			303,
			user.mustChangePassword ? '/admin/account' : safeNext(event.url.searchParams.get('next'))
		);
	}
};
