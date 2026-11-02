import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin, requireStaff } from '#lib/server/auth.ts';
import { adminConcerns } from '#lib/server/services/admin.ts';
import { changeStatus, getConcern, getHistory } from '#lib/server/services/concerns.ts';
import { proposalsForStaff, setAdopted } from '#lib/server/services/proposals.ts';
import { textParam } from '#lib/server/query.ts';
import { cleanText } from '#lib/server/sanitize.ts';
import { isStatus, STATUSES } from '#lib/status.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const staff = requireStaff(event);
	const { url } = event;
	const raw = url.searchParams.get('status');
	const status = raw === 'stale' ? 'stale' : isStatus(raw) ? raw : null;
	const q = textParam(url, 'q');
	const rows = await adminConcerns({ q, status });
	const updateId = Number(url.searchParams.get('update'));
	let selected = null;
	if (Number.isInteger(updateId) && updateId > 0) {
		const c = await getConcern(updateId, { anonHash: null, staff: true });
		if (c)
			selected = {
				id: c.id,
				title: c.title,
				status: c.status,
				categoryName: c.categoryName,
				history: await getHistory(c.id),
				proposals: await proposalsForStaff(c.id)
			};
	}
	return { rows, status, q, selected, canChange: staff.role === 'ADMIN' };
};

const schema = z.object({
	id: z.coerce.number().int().positive(),
	status: z.enum(STATUSES),
	note: z.string().max(1000).optional()
});

export const actions: Actions = {
	update: async (event) => {
		const staff = requireAdmin(event); // only administrators change status
		const form = await event.request.formData();
		const p = schema.safeParse(Object.fromEntries(form));
		if (!p.success) return fail(400, { message: 'Choose a valid status.' });
		const note = p.data.note ? cleanText(p.data.note) : null;
		const r = await changeStatus({
			concernId: p.data.id,
			to: p.data.status,
			note,
			staffId: staff.id
		});
		if (!r.ok) return fail(400, { message: r.message, id: p.data.id, note: note ?? '' });
		return { ok: true, message: 'Status saved. The public timeline is updated.' };
	},
	adopt: async (event) => {
		const staff = requireAdmin(event);
		const form = await event.request.formData();
		const id = z.coerce.number().int().positive().safeParse(form.get('proposalId'));
		if (!id.success) return fail(400, { message: 'Invalid request.' });
		const adopt = form.get('adopt') === '1';
		if (!(await setAdopted(staff.id, id.data, adopt)))
			return fail(404, { message: 'Only published proposals can be adopted.' });
		return {
			ok: true,
			message: adopt ? 'Proposal marked as adopted.' : 'Adoption withdrawn.'
		};
	}
};
