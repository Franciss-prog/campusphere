import { json } from '@sveltejs/kit';
import { callHello } from '#lib/server/functions.ts';
import type { RequestHandler } from './$types';

// Smoke test: invoke the deployed `hello` Neon Function.
export const GET: RequestHandler = async () => {
	const res = await callHello();
	const body = await res.text();
	return json({ ok: res.ok, status: res.status, body });
};
