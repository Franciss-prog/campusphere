import * as env from '$app/env/private';

/** Call a Neon Function declared in neon.ts by its injected base URL. */
export async function callHello(init?: RequestInit): Promise<Response> {
	const base = env.NEON_FUNCTION_HELLO_BASE_URL;
	if (!base) throw new Error('NEON_FUNCTION_HELLO_BASE_URL is not set');
	return fetch(base, init);
}
