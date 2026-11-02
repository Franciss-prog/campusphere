import * as env from '$app/env/private';

export const TURNSTILE_FIELD = 'cf-turnstile-response';

/**
 * Verifies a Cloudflare Turnstile token. With no secret configured (development), the check is
 * bypassed. The client address is deliberately not sent to Cloudflare.
 */
export async function verifyTurnstile(token: string | null): Promise<boolean> {
	const secret = env.TURNSTILE_SECRET_KEY;
	if (!secret) return true;
	if (!token) return false;
	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			body: new URLSearchParams({ secret, response: token }),
			signal: AbortSignal.timeout(5000)
		});
		const data = (await res.json()) as { success?: boolean };
		return data.success === true;
	} catch {
		return false;
	}
}
