import { error, fail, redirect } from '@sveltejs/kit';
import { otherSections, parseUniversityStatement } from '#lib/university.ts';
import { renderMarkdown } from '#lib/server/sanitize.ts';
import { readAnonHash } from '#lib/server/anon.ts';
import { getSettings } from '#lib/server/settings.ts';
import { listComments } from '#lib/server/services/comments.ts';
import { deleteOwnPost, getPost, postTags, withinWindow } from '#lib/server/services/posts.ts';
import { commentAction, reactAction, reportAction } from '#lib/server/actions.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const post = await getPost(params.slug, { anonHash: locals.anonHash, staff: !!locals.staff });
	if (!post) error(404, { message: 'This post does not exist or was removed.' });
	const settings = await getSettings();
	const [tags, comments] = await Promise.all([
		postTags(post.id),
		listComments('post', post.id, locals.anonHash)
	]);
	const statement = post.isOfficial && post.isPinned ? parseUniversityStatement(post.bodyMd) : null;
	const { bodyMd, ...rest } = post;
	const posted = url.searchParams.get('posted');
	return {
		post: { ...rest, words: bodyMd.split(/\s+/).length },
		statement:
			statement && statement.values.length
				? { ...statement, restHtml: renderMarkdown(otherSections(bodyMd)) }
				: null,
		tags,
		comments,
		canEdit: post.isAuthor && withinWindow(post.createdAt, settings.edit_window_minutes),
		editWindow: settings.edit_window_minutes,
		posted: posted === 'published' || posted === 'pending' ? posted : null
	};
};

export const actions: Actions = {
	comment: async (event) => {
		const post = await getPost(event.params.slug, { anonHash: null, staff: false });
		if (!post) return fail(404, { message: 'This post is no longer available.' });
		return commentAction(event, 'post', post.id);
	},
	react: reactAction,
	report: reportAction,
	deleteOwn: async (event) => {
		const hash = readAnonHash(event.cookies);
		const post = await getPost(event.params.slug, { anonHash: hash, staff: false });
		if (!post || !hash || !post.isAuthor)
			return fail(403, { message: 'You can only delete your own post.' });
		const settings = await getSettings();
		const ok = await deleteOwnPost(post.id, hash, settings.edit_window_minutes);
		if (!ok)
			return fail(400, { message: 'The time to delete this post has passed. Report it instead.' });
		redirect(303, '/blog?deleted=1');
	}
};
