import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { requireStaff } from '#lib/server/auth.ts';
import { db, t } from '#lib/server/db/index.ts';
import { hashPassword, passwordProblem, verifyPassword } from '#lib/server/password.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => ({ email: requireStaff(event).email });

export const actions: Actions = {
	default: async (event) => {
		const me = requireStaff(event);
		const form = await event.request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const [u] = await db().select().from(t.staffUser).where(eq(t.staffUser.id, me.id));
		if (!u || !(await verifyPassword(u.passwordHash, current))) {
			return fail(400, { message: 'Your current password is not correct.' });
		}
		const problem = passwordProblem(next);
		if (problem) return fail(400, { message: problem });
		if (next !== String(form.get('confirm') ?? ''))
			return fail(400, { message: 'The new passwords do not match.' });
		await db()
			.update(t.staffUser)
			.set({ passwordHash: await hashPassword(next) })
			.where(eq(t.staffUser.id, me.id));
		return { ok: true, message: 'Password changed.' };
	}
};
