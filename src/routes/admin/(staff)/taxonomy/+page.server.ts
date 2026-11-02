import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin } from '#lib/server/auth.ts';
import { cleanText } from '#lib/server/sanitize.ts';
import {
	addCategory,
	addTag,
	deleteCategory,
	deleteTag,
	mergeTag,
	renameCategory,
	renameTag,
	taxonomy
} from '#lib/server/services/admin.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	return taxonomy();
};

const name = z
	.string()
	.trim()
	.min(2, 'Use at least 2 characters.')
	.max(40, 'Use at most 40 characters.');
const id = z.coerce.number().int().positive();

function done(r: { ok: boolean; message: string }) {
	return r.ok ? { ok: true, message: r.message } : fail(400, { message: r.message });
}

async function body(event: Parameters<Actions[string]>[0]) {
	return Object.fromEntries(await event.request.formData());
}

export const actions: Actions = {
	addCategory: async (event) => {
		const s = requireAdmin(event);
		const p = z.object({ name, type: z.enum(['concern', 'blog']) }).safeParse(await body(event));
		if (!p.success) return fail(400, { message: p.error.issues[0].message });
		return done(await addCategory(s.id, p.data.type, cleanText(p.data.name)));
	},
	renameCategory: async (event) => {
		const s = requireAdmin(event);
		const p = z.object({ id, name }).safeParse(await body(event));
		if (!p.success) return fail(400, { message: p.error.issues[0].message });
		return done(await renameCategory(s.id, p.data.id, cleanText(p.data.name)));
	},
	deleteCategory: async (event) => {
		const s = requireAdmin(event);
		const p = z.object({ id, confirm: z.string().max(60) }).safeParse(await body(event));
		if (!p.success) return fail(400, { message: 'Type the name to confirm.' });
		return done(await deleteCategory(s.id, p.data.id, p.data.confirm));
	},
	addTag: async (event) => {
		const s = requireAdmin(event);
		const p = z.object({ name }).safeParse(await body(event));
		if (!p.success) return fail(400, { message: p.error.issues[0].message });
		return done(await addTag(s.id, cleanText(p.data.name)));
	},
	renameTag: async (event) => {
		const s = requireAdmin(event);
		const p = z.object({ id, name }).safeParse(await body(event));
		if (!p.success) return fail(400, { message: p.error.issues[0].message });
		return done(await renameTag(s.id, p.data.id, cleanText(p.data.name)));
	},
	mergeTag: async (event) => {
		const s = requireAdmin(event);
		const p = z.object({ id, into: id }).safeParse(await body(event));
		if (!p.success) return fail(400, { message: 'Choose a tag to merge into.' });
		return done(await mergeTag(s.id, p.data.id, p.data.into));
	},
	deleteTag: async (event) => {
		const s = requireAdmin(event);
		const p = z.object({ id, confirm: z.string().max(60) }).safeParse(await body(event));
		if (!p.success) return fail(400, { message: 'Type the name to confirm.' });
		return done(await deleteTag(s.id, p.data.id, p.data.confirm));
	}
};
