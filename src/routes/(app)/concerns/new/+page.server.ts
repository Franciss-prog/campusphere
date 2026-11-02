import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { asc, inArray } from 'drizzle-orm';
import { db, t } from '#lib/server/db/index.ts';
import { checkbox, optionalText, parseForm, text } from '#lib/server/forms.ts';
import { guardSubmission } from '#lib/server/safety.ts';
import { cleanText } from '#lib/server/sanitize.ts';
import { fileFrom, processImage } from '#lib/server/images.ts';
import { hit } from '#lib/server/ratelimit.ts';
import { addressHash } from '#lib/server/anon.ts';
import {
	concernCategories,
	createConcern,
	isDuplicateConcern
} from '#lib/server/services/concerns.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [categories, tags] = await Promise.all([
		concernCategories(),
		db().select({ id: t.tag.id, name: t.tag.name }).from(t.tag).orderBy(asc(t.tag.name))
	]);
	return { categories, tags };
};

const schema = z.object({
	title: text('Title', 8, 100),
	description: text('Description', 20, 4000),
	category: z.coerce.number({ error: 'Choose a category.' }).int().positive('Choose a category.'),
	location: optionalText('Location', 120),
	sensitive: checkbox
});

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const parsed = parseForm(schema, form);
		const tagIds = form
			.getAll('tags')
			.map((v) => Number(v))
			.filter((n) => Number.isInteger(n) && n > 0)
			.slice(0, 5);
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });
		const d = parsed.data;
		const title = cleanText(d.title);
		const description = cleanText(d.description);
		const values = { ...parsed.data, sensitive: d.sensitive ? 'on' : '' };

		const cats = await concernCategories();
		if (!cats.some((c) => c.id === d.category)) {
			return fail(400, { errors: { category: 'Choose a category.' }, values });
		}

		const g = await guardSubmission(event, form, {
			bucket: 'concern',
			text: `${title}\n${description}\n${d.location ?? ''}`,
			sensitive: d.sensitive,
			values
		});
		if (!g.ok) return g.response;
		if (await isDuplicateConcern(g.tokenHash, title)) {
			return fail(400, {
				message: 'You already reported a concern with this title today.',
				values
			});
		}

		const images: string[] = [];
		const photo = fileFrom(form, 'photo');
		if (photo) {
			const lim = await hit('upload', [addressHash(event), g.tokenHash]);
			if (!lim.ok) return fail(429, { message: 'Too many photos. Try again later.', values });
			const img = await processImage(photo);
			if (!img.ok) return fail(400, { errors: { photo: img.message }, values });
			images.push(img.key);
		}

		const validTags = tagIds.length
			? (await db().select({ id: t.tag.id }).from(t.tag).where(inArray(t.tag.id, tagIds))).map(
					(r) => r.id
				)
			: [];

		const id = await createConcern({
			kind: 'concern',
			title,
			description,
			categoryId: d.category,
			location: d.location ? cleanText(d.location) : null,
			images,
			isSensitive: d.sensitive,
			visibility: g.visibility,
			tokenHash: g.tokenHash,
			tagIds: validTags
		});
		redirect(303, `/concerns/${id}?posted=${g.visibility}`);
	}
};
