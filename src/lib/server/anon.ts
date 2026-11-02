import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/env';
import * as env from '$app/env/private';
import {
	anonLabel,
	hashAddress,
	hashToken,
	isWellFormedToken,
	labelSeed,
	newToken
} from './anon-core.ts';

export const ANON_COOKIE = 'cs_anon';
const ONE_YEAR = 60 * 60 * 24 * 365;

function secret(): string {
	return env.ANON_SECRET;
}

/** Hash of the visitor's existing token, or null if they never contributed. Never creates a cookie. */
export function readAnonHash(cookies: Cookies): string | null {
	const token = cookies.get(ANON_COOKIE);
	return isWellFormedToken(token) ? hashToken(secret(), token) : null;
}

/**
 * Called by mutating actions only: returns the visitor's token, creating it on first contribution.
 * The raw token lives only in an httpOnly cookie; the server stores `hash`.
 */
export function ensureAnon(cookies: Cookies): { token: string; hash: string } {
	let token = cookies.get(ANON_COOKIE);
	if (!isWellFormedToken(token)) {
		token = newToken();
		cookies.set(ANON_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: ONE_YEAR
		});
	}
	return { token, hash: hashToken(secret(), token) };
}

/** Per-thread label seed for comments; the thread is e.g. `concern:12`. */
export function threadSeed(token: string, thread: string): string {
	return labelSeed(secret(), token, thread);
}

export { anonLabel };

/** Short-lived, daily-rotating hash of the client address. The raw address is never stored. */
export function addressHash(event: RequestEvent): string {
	let address = 'unknown';
	try {
		address = event.getClientAddress();
	} catch {
		// Some adapters/dev setups cannot determine the address; fall back to a shared bucket.
	}
	return hashAddress(secret(), address);
}

/** Byline for anonymous posts: stable per post, not linkable across posts. */
export function authorLabel(authorTokenHash: string | null, postId: number): string {
	if (!authorTokenHash) return 'Anonymous';
	return anonLabel(labelSeed(secret(), authorTokenHash, `post:${postId}`)).name;
}
