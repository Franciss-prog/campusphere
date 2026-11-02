import { concernCategories } from '#lib/server/services/concerns.ts';
import {
	listProposals,
	PROPOSAL_SORTS,
	proposalCountsByCategory
} from '#lib/server/services/proposals.ts';
import { supportProposalAction } from '#lib/server/actions.ts';
import { oneOf, pageParam, slugParam } from '#lib/server/query.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const category = slugParam(url, 'category');
	const sort = oneOf(url, 'sort', PROPOSAL_SORTS, 'supported');
	const page = pageParam(url);
	const [list, counts, categories] = await Promise.all([
		listProposals({ category, sort, page, perPage: 8 }, locals.anonHash),
		proposalCountsByCategory(),
		concernCategories()
	]);
	return { list, counts, categories, category, sort };
};

export const actions: Actions = { supportProposal: supportProposalAction };
