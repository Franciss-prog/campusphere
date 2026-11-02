import { CONCERN_SORTS, concernCategories, listConcerns } from '#lib/server/services/concerns.ts';
import { supportConcernAction } from '#lib/server/actions.ts';
import { oneOf, pageParam, slugParam, statusParam, textParam } from '#lib/server/query.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const filter = {
		q: textParam(url, 'q'),
		status: statusParam(url),
		category: slugParam(url, 'category'),
		tag: slugParam(url, 'tag'),
		sort: oneOf(url, 'sort', CONCERN_SORTS, 'supported'),
		page: pageParam(url),
		perPage: 10
	};
	const [list, categories] = await Promise.all([
		listConcerns(filter, locals.anonHash),
		concernCategories()
	]);
	return { list, categories, filter };
};

export const actions: Actions = { support: supportConcernAction };
