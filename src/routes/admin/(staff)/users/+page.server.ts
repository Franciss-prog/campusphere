import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '#lib/server/auth.ts';
import { inviteStaff, listStaff, removeStaff, setRole } from '#lib/server/services/admin.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const me = requireAdmin(event);
	return { staff: await listStaff(), meId: me.id };
};

const role = z.enum(['ADMIN', 'MODERATOR']);

export const actions: Actions = {
	invite: async (event) => {
		const me = requireAdmin(event);
		const p = z
			.object({
				email: z.string().trim().toLowerCase().email('Enter a valid email.').max(200),
				role
			})
			.safeParse(Object.fromEntries(await event.request.formData()));
		if (!p.success) return fail(400, { message: p.error.issues[0].message });
		const r = await inviteStaff(me.id, p.data.email, p.data.role);
		if (!r.ok) return fail(400, { message: r.message });
		// Shown once, never stored in plain text. The admin passes it on privately.
		return {
			ok: true,
			invited: p.data.email,
			temp: r.temp,
			message: `Account created for ${p.data.email}.`
		};
	},
	role: async (event) => {
		const me = requireAdmin(event);
		const p = z
			.object({ id: z.coerce.number().int().positive(), role })
			.safeParse(Object.fromEntries(await event.request.formData()));
		if (!p.success) return fail(400, { message: 'Invalid request.' });
		const r = await setRole(me.id, p.data.id, p.data.role);
		return r.ok ? { ok: true, message: r.message } : fail(400, { message: r.message });
	},
	remove: async (event) => {
		const me = requireAdmin(event);
		const p = z
			.object({ id: z.coerce.number().int().positive() })
			.safeParse(Object.fromEntries(await event.request.formData()));
		if (!p.success) return fail(400, { message: 'Invalid request.' });
		const r = await removeStaff(me.id, p.data.id);
		return r.ok ? { ok: true, message: r.message } : fail(400, { message: r.message });
	}
};
