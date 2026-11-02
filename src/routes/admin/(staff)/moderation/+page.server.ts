import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdmin, requireStaff } from '#lib/server/auth.ts';
import { audit } from '#lib/server/audit.ts';
import { getSettings, setSetting } from '#lib/server/settings.ts';
import {
	moderate,
	moderationQueue,
	redact,
	type TargetType
} from '#lib/server/services/moderation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const staff = requireStaff(event);
	const queue = await moderationQueue();
	const key = event.url.searchParams.get('item');
	const selected = queue.find((q) => `${q.targetType}:${q.targetId}` === key) ?? queue[0] ?? null;
	const settings = await getSettings();
	return { queue, selected, settings, isAdmin: staff.role === 'ADMIN' };
};

const target = z.object({
	targetType: z.enum(['post', 'concern', 'proposal', 'comment']),
	targetId: z.coerce.number().int().positive()
});

async function act(
	event: Parameters<Actions[string]>[0],
	action: 'hide' | 'restore' | 'approve' | 'dismiss'
) {
	const staff = requireStaff(event);
	const form = await event.request.formData();
	const p = target.safeParse(Object.fromEntries(form));
	if (!p.success) return fail(400, { message: 'Invalid request.' });
	await moderate({
		staffId: staff.id,
		targetType: p.data.targetType as TargetType,
		targetId: p.data.targetId,
		action
	});
	const done = {
		hide: 'Hidden from the public site.',
		restore: 'Restored.',
		approve: 'Approved and published.',
		dismiss: 'Reports dismissed.'
	};
	return { ok: true, message: done[action] };
}

export const actions: Actions = {
	hide: (e) => act(e, 'hide'),
	restore: (e) => act(e, 'restore'),
	approve: (e) => act(e, 'approve'),
	dismiss: (e) => act(e, 'dismiss'),
	redact: async (event) => {
		const staff = requireStaff(event);
		const form = await event.request.formData();
		const p = target
			.extend({
				targetType: z.enum(['concern', 'proposal', 'comment']),
				phrase: z.string().max(200)
			})
			.safeParse(Object.fromEntries(form));
		if (!p.success)
			return fail(400, { message: 'Names can be removed from concerns, proposals, and comments.' });
		const r = await redact({ staffId: staff.id, ...p.data });
		return r.ok ? { ok: true, message: r.message } : fail(400, { message: r.message });
	},
	settings: async (event) => {
		const staff = requireAdmin(event);
		const form = await event.request.formData();
		const p = z
			.object({
				moderation_mode: z.enum(['post', 'pre']),
				auto_hide_threshold: z.coerce.number().int().min(1).max(50),
				max_links: z.coerce.number().int().min(0).max(20),
				edit_window_minutes: z.coerce.number().int().min(0).max(1440),
				word_filter: z.string().max(5000)
			})
			.safeParse(Object.fromEntries(form));
		if (!p.success) return fail(400, { message: 'Check the settings values.' });
		const words = p.data.word_filter
			.split(/\n|,/)
			.map((w) => w.trim())
			.filter(Boolean)
			.slice(0, 300);
		await setSetting('moderation_mode', p.data.moderation_mode);
		await setSetting('auto_hide_threshold', p.data.auto_hide_threshold);
		await setSetting('max_links', p.data.max_links);
		await setSetting('edit_window_minutes', p.data.edit_window_minutes);
		await setSetting('word_filter', words);
		await audit({ staffId: staff.id, action: 'setting.change', meta: { key: 'moderation' } });
		return { ok: true, message: 'Settings saved.' };
	}
};
