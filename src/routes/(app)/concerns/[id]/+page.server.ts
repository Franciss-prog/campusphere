import { error } from '@sveltejs/kit';
import { getConcern, getConcernTags, getHistory } from '#lib/server/services/concerns.ts';
import { listComments } from '#lib/server/services/comments.ts';
import { PROPOSAL_SORTS, proposalsFor } from '#lib/server/services/proposals.ts';
import {
	commentAction,
	proposeAction,
	reactAction,
	reportAction,
	supportConcernAction,
	supportProposalAction
} from '#lib/server/actions.ts';
import { oneOf } from '#lib/server/query.ts';
import type { Actions, PageServerLoad } from './$types';

function idParam(raw: string): number {
	const id = Number(raw);
	if (!Number.isInteger(id) || id <= 0) error(404, { message: 'This concern does not exist.' });
	return id;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const id = idParam(params.id);
	const concern = await getConcern(id, { anonHash: locals.anonHash, staff: !!locals.staff });
	if (!concern) error(404, { message: 'This concern does not exist or was removed.' });
	const psort = oneOf(url, 'psort', PROPOSAL_SORTS, 'supported');
	const [history, tags, proposals, comments] = await Promise.all([
		getHistory(id),
		getConcernTags(id),
		proposalsFor(id, locals.anonHash, psort),
		listComments('concern', id, locals.anonHash)
	]);
	const proposalComments = Object.fromEntries(
		await Promise.all(
			proposals.map(
				async (p) => [p.id, await listComments('proposal', p.id, locals.anonHash)] as const
			)
		)
	);
	const posted = url.searchParams.get('posted');
	return {
		concern,
		history,
		tags,
		proposals,
		proposalComments,
		comments,
		psort,
		posted: posted === 'published' || posted === 'pending' ? posted : null
	};
};

export const actions: Actions = {
	support: supportConcernAction,
	supportProposal: supportProposalAction,
	comment: (event) =>
		commentAction(event, 'concern', idParam(event.params.id), idParam(event.params.id)),
	propose: (event) => proposeAction(event, idParam(event.params.id)),
	report: reportAction,
	react: reactAction
};
