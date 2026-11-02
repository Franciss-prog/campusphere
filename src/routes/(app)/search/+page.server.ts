import { addressHash } from '#lib/server/anon.ts';
import { hit } from '#lib/server/ratelimit.ts';
import { oneOf, textParam } from '#lib/server/query.ts';
import { searchAll, SEARCH_TYPES } from '#lib/server/services/search.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const q = textParam(event.url, 'q');
	const type = oneOf(event.url, 'type', SEARCH_TYPES, 'all');
	if (!q)
		return { q: '', type, hits: [], counts: { concern: 0, post: 0, proposal: 0 }, limited: false };
	const lim = await hit('search', [addressHash(event)]);
	if (!lim.ok)
		return { q, type, hits: [], counts: { concern: 0, post: 0, proposal: 0 }, limited: true };
	const r = await searchAll(q, type);
	return { q, type, ...r, limited: false };
};
