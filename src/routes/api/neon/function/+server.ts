import { error, json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { callHello } from '#lib/server/functions.ts';
import type { RequestHandler } from './$types';

// Smoke test: invoke the deployed `hello` Neon Function.
export const GET: RequestHandler = async () => {
	// Smoke test: development only, never exposed in production.
	if (!dev) error(404);
	const res = await callHello();
	const body = await res.text();
	return json({ ok: res.ok, status: res.status, body });
};
