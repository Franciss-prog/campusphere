import { fail, type RequestEvent } from '@sveltejs/kit';
import * as env from '$app/env/private';
import { addressHash, ensureAnon } from './anon.ts';
import { hit, tooManyMessage } from './ratelimit.ts';
import type { Bucket } from './ratelimit-core.ts';
import { checkStamp, HONEYPOT_FIELD, judge, makeStamp, STAMP_FIELD } from './safety-core.ts';
import { getSettings } from './settings.ts';
import { TURNSTILE_FIELD, verifyTurnstile } from './turnstile.ts';

export { HONEYPOT_FIELD, STAMP_FIELD };

export function formStamp(): string {
	return makeStamp(env.ANON_SECRET);
}

type GuardOk = {
	ok: true;
	token: string;
	tokenHash: string;
	/** Where new content goes: shown now, or held for review. */
	visibility: 'published' | 'pending';
	heldReason: string | null;
};
type GuardFail = { ok: false; response: ReturnType<typeof fail> };

/**
 * Every anonymous submission passes through here: rate limit (hashed address + token),
 * honeypot, signed min-time stamp, bot check, then the publish verdict (links, word filter,
 * pre-moderation, sensitive). Returns a SvelteKit `fail()` to return from the action on rejection.
 */
export async function guardSubmission(
	event: RequestEvent,
	form: FormData,
	opts: { bucket: Bucket; text: string; sensitive?: boolean; values?: Record<string, unknown> }
): Promise<GuardOk | GuardFail> {
	const { token, hash } = ensureAnon(event.cookies);
	const values = opts.values ?? {};

	const limited = await hit(opts.bucket, [addressHash(event), hash]);
	if (!limited.ok) {
		return {
			ok: false,
			response: fail(429, { message: tooManyMessage(limited.retryAfter), values })
		};
	}

	const settings = await getSettings();
	const verdict = judge({
		honeypot: (form.get(HONEYPOT_FIELD) as string | null) || null,
		stamp: checkStamp(env.ANON_SECRET, form.get(STAMP_FIELD) as string | null),
		text: opts.text,
		mode: settings.moderation_mode,
		maxLinks: settings.max_links,
		words: settings.word_filter,
		sensitive: opts.sensitive
	});
	if (verdict.action === 'reject') {
		// Honeypot hits get a generic message; nothing reveals which check fired.
		const message =
			verdict.reason === 'honeypot' ? 'Something went wrong. Please try again.' : verdict.reason;
		return { ok: false, response: fail(400, { message, values }) };
	}

	if (!(await verifyTurnstile(form.get(TURNSTILE_FIELD) as string | null))) {
		return {
			ok: false,
			response: fail(400, { message: 'Please complete the check that you are not a bot.', values })
		};
	}

	return {
		ok: true,
		token,
		tokenHash: hash,
		visibility: verdict.action === 'published' ? 'published' : 'pending',
		heldReason: verdict.action === 'pending' ? verdict.reason : null
	};
}

/** Lightweight guard for one-click actions (support, like, report): rate limit only. */
export async function guardClick(
	event: RequestEvent,
	bucket: Bucket
): Promise<{ ok: true; tokenHash: string } | GuardFail> {
	const { hash } = ensureAnon(event.cookies);
	const limited = await hit(bucket, [addressHash(event), hash]);
	if (!limited.ok) {
		return { ok: false, response: fail(429, { message: tooManyMessage(limited.retryAfter) }) };
	}
	return { ok: true, tokenHash: hash };
}
