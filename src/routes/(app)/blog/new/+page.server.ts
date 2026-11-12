import { fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db, t } from '#lib/server/db/index.ts';
import { findCampaign } from '#lib/campaigns.ts';
import { guardSubmission } from '#lib/server/safety.ts';
import { fileFrom, processImage } from '#lib/server/images.ts';
import { hit } from '#lib/server/ratelimit.ts';
import { addressHash } from '#lib/server/anon.ts';
import { audit } from '#lib/server/audit.ts';
import { parsePostForm } from '#lib/server/post-form.ts';
import { blogCategories, createPost } from '#lib/server/services/posts.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const [categories, tags] = await Promise.all([
		blogCategories(),
		db()
			.select({ id: t.tag.id, name: t.tag.name, slug: t.tag.slug })
			.from(t.tag)
			.orderBy(asc(t.tag.name))
	]);
	// `?campaign=<slug>` pre-checks that campaign's tag when it exists.
	const c = findCampaign(url.searchParams.get('campaign'));
	const tag = c ? tags.find((tg) => tg.slug === c.slug) : undefined;
	return {
		categories,
		tags,
		isStaff: !!locals.staff,
		campaign: c && tag ? { slug: c.slug, title: c.title, tagId: tag.id } : null
	};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const parsed = await parsePostForm(form);
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });
		const d = parsed.data;
		const values = { title: d.title, body: d.body, category: String(d.category) };
		const staff = event.locals.staff;
		const official = !!staff && form.get('official') === 'on';

		const g = await guardSubmission(event, form, {
			bucket: 'post',
			text: `${d.title}\n${d.body}`,
			values
		});
		if (!g.ok) return g.response;

		const [dup] = await db()
			.select({ id: t.post.id })
			.from(t.post)
			.where(
				and(
					eq(t.post.authorTokenHash, g.tokenHash),
					sql`lower(${t.post.title}) = lower(${d.title})`,
					sql`${t.post.createdAt} > now() - interval '24 hours'`
				)
			);
		if (dup) return fail(400, { message: 'You already posted this today.', values });

		let coverImage: string | null = null;
		const photo = fileFrom(form, 'photo');
		if (photo) {
			const lim = await hit('upload', [addressHash(event), g.tokenHash]);
			if (!lim.ok) return fail(429, { message: 'Too many photos. Try again later.', values });
			const img = await processImage(photo);
			if (!img.ok) return fail(400, { errors: { photo: img.message }, values });
			coverImage = img.key;
		}
		const tagIds = form
			.getAll('tags')
			.map(Number)
			.filter((n) => Number.isInteger(n) && n > 0)
			.slice(0, 5);
		const validTags = tagIds.length
			? (await db().select({ id: t.tag.id }).from(t.tag).where(inArray(t.tag.id, tagIds))).map(
					(r) => r.id
				)
			: [];

		const row = await createPost({
			title: d.title,
			bodyMd: d.body,
			categoryId: d.category,
			coverImage,
			tagIds: validTags,
			// Staff posts skip pre-moderation but still pass the word/link checks above.
			visibility: staff ? 'published' : g.visibility,
			tokenHash: g.tokenHash,
			staffAuthorId: staff?.id ?? null,
			isOfficial: official
		});
		if (official && staff) {
			await audit({
				staffId: staff.id,
				action: 'post.official',
				targetType: 'post',
				targetId: row.id
			});
		}
		redirect(303, `/blog/${row.slug}?posted=${staff ? 'published' : g.visibility}`);
	}
};
