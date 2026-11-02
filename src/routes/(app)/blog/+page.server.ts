import { parseUniversityStatement } from '#lib/university.ts';
import {
	blogCategories,
	listPosts,
	pinnedPost,
	POST_SORTS,
	postCountsByCategory
} from '#lib/server/services/posts.ts';
import { oneOf, pageParam, slugParam } from '#lib/server/query.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const category = slugParam(url, 'category');
	const tag = slugParam(url, 'tag');
	const sort = oneOf(url, 'sort', POST_SORTS, 'newest');
	const page = pageParam(url);
	const [pinned, list, counts, categories] = await Promise.all([
		pinnedPost(),
		listPosts({ category, tag, sort, page, perPage: 6, excludePinned: true }),
		postCountsByCategory(),
		blogCategories()
	]);
	const values = pinned ? parseUniversityStatement(pinned.bodyMd).values : [];
	return {
		pinned: pinned ? { slug: pinned.slug, title: pinned.title, excerpt: pinned.excerpt } : null,
		values: values.map((v) => ({ name: v.name, focus: v.focus })),
		list,
		counts,
		categories,
		category,
		tag,
		sort
	};
};
