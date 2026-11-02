import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { requireStaff } from '#lib/server/auth.ts';
import { db, t } from '#lib/server/db/index.ts';
import { cleanText } from '#lib/server/sanitize.ts';
import { hashPassword, passwordProblem, verifyPassword } from '#lib/server/password.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const me = requireStaff(event);
	return {
		email: me.email,
		displayName: me.displayName,
		mustChangePassword: me.mustChangePassword
	};
};

export const actions: Actions = {
	password: async (event) => {
		const me = requireStaff(event);
		const form = await event.request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const [u] = await db().select().from(t.staffUser).where(eq(t.staffUser.id, me.id));
		if (!u || !(await verifyPassword(u.passwordHash, current))) {
			return fail(400, { form: 'password', message: 'Your current password is not correct.' });
		}
		const problem = passwordProblem(next);
		if (problem) return fail(400, { form: 'password', message: problem });
		if (next === current)
			return fail(400, { form: 'password', message: 'Choose a password you have not used here.' });
		if (next !== String(form.get('confirm') ?? ''))
			return fail(400, { form: 'password', message: 'The new passwords do not match.' });
		await db()
			.update(t.staffUser)
			.set({
				passwordHash: await hashPassword(next),
				mustChangePassword: false,
				tempPasswordExpiresAt: null
			})
			.where(eq(t.staffUser.id, me.id));
		return { form: 'password', ok: true, message: 'Password changed.' };
	},
	profile: async (event) => {
		const me = requireStaff(event);
		const form = await event.request.formData();
		const name = cleanText(String(form.get('displayName') ?? '')).slice(0, 60);
		await db()
			.update(t.staffUser)
			.set({ displayName: name || null })
			.where(eq(t.staffUser.id, me.id));
		return { form: 'profile', ok: true, message: 'Name saved.' };
	}
};
