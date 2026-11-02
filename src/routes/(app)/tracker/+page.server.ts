import { concernCategories, statusCounts, trackerBoard } from '#lib/server/services/concerns.ts';
import { slugParam } from '#lib/server/query.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const category = slugParam(url, 'category');
	const [counts, cards, categories] = await Promise.all([
		statusCounts({ category }),
		trackerBoard(category),
		concernCategories()
	]);
	return { counts, cards, categories, category };
};
