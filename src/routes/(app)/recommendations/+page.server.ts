import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db, t } from '#lib/server/db/index.ts';
import { parseForm, text } from '#lib/server/forms.ts';
import { guardSubmission } from '#lib/server/safety.ts';
import { cleanText } from '#lib/server/sanitize.ts';
import { fileFrom, processImage } from '#lib/server/images.ts';
import { hit } from '#lib/server/ratelimit.ts';
import { addressHash } from '#lib/server/anon.ts';
import {
	CONCERN_SORTS,
	createConcern,
	isDuplicateConcern,
	listConcerns,
	statusCounts
} from '#lib/server/services/concerns.ts';
import { supportConcernAction } from '#lib/server/actions.ts';
import { oneOf, pageParam, statusParam } from '#lib/server/query.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const status = statusParam(url);
	const sort = oneOf(url, 'sort', CONCERN_SORTS, 'supported');
	const [list, counts] = await Promise.all([
		listConcerns(
			{ kind: 'recommendation', status, sort, page: pageParam(url), perPage: 9 },
			locals.anonHash
		),
		statusCounts({ kind: 'recommendation' })
	]);
	return { list, counts, status, sort };
};

const schema = z.object({ idea: text('Your idea', 15, 1000) });

/** First sentence (or first 100 characters) becomes the title; the full text is the description. */
function titleFrom(idea: string): string {
	const first = idea.split(/(?<=[.!?])\s|\n/)[0].trim();
	const t = first.length <= 100 ? first : first.slice(0, 97).replace(/\s+\S*$/, '') + '…';
	return t.replace(/[.!?]+$/, '');
}

export const actions: Actions = {
	post: async (event) => {
		const form = await event.request.formData();
		const parsed = parseForm(schema, form);
		if (!parsed.ok)
			return fail(400, { form: 'post', errors: parsed.errors, values: parsed.values });
		const idea = cleanText(parsed.data.idea);
		const g = await guardSubmission(event, form, {
			bucket: 'concern',
			text: idea,
			values: { idea }
		});
		if (!g.ok) return g.response;
		const title = titleFrom(idea);
		if (await isDuplicateConcern(g.tokenHash, title)) {
			return fail(400, {
				form: 'post',
				message: 'You already posted this idea today.',
				values: { idea }
			});
		}
		const images: string[] = [];
		const photo = fileFrom(form, 'photo');
		if (photo) {
			const lim = await hit('upload', [addressHash(event), g.tokenHash]);
			if (!lim.ok)
				return fail(429, {
					form: 'post',
					message: 'Too many photos. Try again later.',
					values: { idea }
				});
			const img = await processImage(photo);
			if (!img.ok)
				return fail(400, { form: 'post', errors: { photo: img.message }, values: { idea } });
			images.push(img.key);
		}
		const [other] = await db()
			.select({ id: t.category.id })
			.from(t.category)
			.where(and(eq(t.category.type, 'concern'), eq(t.category.isFallback, true)))
			.limit(1);
		const id = await createConcern({
			kind: 'recommendation',
			title,
			description: idea,
			categoryId: other?.id ?? null,
			location: null,
			images,
			isSensitive: false,
			visibility: g.visibility,
			tokenHash: g.tokenHash
		});
		redirect(303, `/concerns/${id}?posted=${g.visibility}`);
	},
	support: supportConcernAction
};
