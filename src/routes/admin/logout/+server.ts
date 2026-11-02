import { redirect } from '@sveltejs/kit';
import { destroySession } from '#lib/server/auth.ts';
import type { RequestHandler } from './$types';

// POST only (form in the staff sidebar); SvelteKit's origin check protects it from CSRF.
export const POST: RequestHandler = async ({ cookies }) => {
	await destroySession(cookies);
	redirect(303, '/admin/login');
};
