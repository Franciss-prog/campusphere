import { json } from '@sveltejs/kit';
import { addressHash } from '#lib/server/anon.ts';
import { hit } from '#lib/server/ratelimit.ts';
import { similarConcerns } from '#lib/server/services/concerns.ts';
import { STATUS_LABEL } from '#lib/status.ts';
import type { RequestHandler } from './$types';

// Duplicate hint for the report form: "Similar concerns already posted".
export const GET: RequestHandler = async (event) => {
	const title = (event.url.searchParams.get('title') ?? '').trim().slice(0, 120);
	if (title.length < 6) return json({ items: [] });
	const lim = await hit('search', [addressHash(event)]);
	if (!lim.ok) return json({ items: [] }, { status: 429 });
	const rows = await similarConcerns(title);
	return json(
		{
			items: rows.map((r) => ({
				id: r.id,
				title: r.title,
				meta: `${STATUS_LABEL[r.status]}, ${r.supportCount} ${r.supportCount === 1 ? 'support' : 'supports'}`
			}))
		},
		{ headers: { 'Cache-Control': 'no-store' } }
	);
};
