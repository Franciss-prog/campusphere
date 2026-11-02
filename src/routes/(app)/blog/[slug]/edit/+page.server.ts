import { error, fail, redirect } from '@sveltejs/kit';
import { readAnonHash } from '#lib/server/anon.ts';
import { getSettings } from '#lib/server/settings.ts';
import { parsePostForm } from '#lib/server/post-form.ts';
import { db, t } from '#lib/server/db/index.ts';
import { eq } from 'drizzle-orm';
import { blogCategories, updateOwnPost, withinWindow } from '#lib/server/services/posts.ts';
import type { Actions, PageServerLoad } from './$types';

async function ownPost(slug: string, hash: string | null) {
	if (!hash) return null;
	const [p] = await db().select().from(t.post).where(eq(t.post.slug, slug)).limit(1);
	return p && p.authorTokenHash === hash ? p : null;
}

export const load: PageServerLoad = async ({ params, cookies }) => {
	const post = await ownPost(params.slug, readAnonHash(cookies));
	if (!post) error(404, { message: 'You can only edit your own post.' });
	const settings = await getSettings();
	if (!withinWindow(post.createdAt, settings.edit_window_minutes)) {
		error(403, { message: 'The time to edit this post has passed.' });
	}
	return {
		slug: post.slug,
		initial: { title: post.title, body: post.bodyMd, category: String(post.categoryId ?? '') },
		categories: await blogCategories()
	};
};

export const actions: Actions = {
	default: async ({ params, cookies, request }) => {
		const hash = readAnonHash(cookies);
		const post = await ownPost(params.slug, hash);
		if (!post || !hash) return fail(403, { message: 'You can only edit your own post.' });
		const parsed = await parsePostForm(await request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });
		const settings = await getSettings();
		const ok = await updateOwnPost({
			postId: post.id,
			tokenHash: hash,
			windowMinutes: settings.edit_window_minutes,
			title: parsed.data.title,
			bodyMd: parsed.data.body,
			categoryId: parsed.data.category
		});
		if (!ok) return fail(400, { message: 'The time to edit this post has passed.' });
		redirect(303, `/blog/${post.slug}`);
	}
};
