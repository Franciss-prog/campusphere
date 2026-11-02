// Pure spam / safety heuristics. The app wires them up in safety.ts.
import { createHmac } from 'node:crypto';

export const HONEYPOT_FIELD = 'website';
export const STAMP_FIELD = '_ts';
export const MIN_SUBMIT_MS = 3_000;
const MAX_STAMP_AGE_MS = 24 * 3_600_000;

/** Signed form-render timestamp, so bots cannot fake "time on page". */
export function makeStamp(secret: string, now = Date.now()): string {
	const sig = createHmac('sha256', secret).update(`stamp:${now}`).digest('hex').slice(0, 16);
	return `${now}.${sig}`;
}

export type StampCheck = 'ok' | 'too-fast' | 'invalid';

export function checkStamp(secret: string, stamp: string | null, now = Date.now()): StampCheck {
	if (!stamp) return 'invalid';
	const [ts, sig] = stamp.split('.');
	const n = Number(ts);
	if (!Number.isFinite(n) || makeStamp(secret, n) !== `${ts}.${sig}`) return 'invalid';
	if (now - n > MAX_STAMP_AGE_MS) return 'invalid';
	if (now - n < MIN_SUBMIT_MS) return 'too-fast';
	return 'ok';
}

export function countLinks(text: string): number {
	return (text.match(/\b(?:https?:\/\/|www\.)\S+/gi) ?? []).length;
}

/** Normalized text used for duplicate detection. */
export function fingerprint(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

export function matchesWordFilter(text: string, words: string[]): string | null {
	const hay = ` ${fingerprint(text)} `;
	for (const w of words) {
		const needle = fingerprint(w);
		if (needle && hay.includes(` ${needle} `)) return w;
	}
	return null;
}

/**
 * Decides how new content is published.
 * - `reject`: obvious bot (honeypot filled, invalid stamp) or submitted too quickly.
 * - `pending`: held for review (pre-moderation mode, word filter hit, too many links, sensitive).
 * - `published`: shown immediately (post-moderation).
 */
export type Verdict =
	| { action: 'reject'; reason: string }
	| { action: 'pending'; reason: string }
	| { action: 'published' };

export function judge(input: {
	honeypot: string | null;
	stamp: StampCheck;
	text: string;
	mode: 'post' | 'pre';
	maxLinks: number;
	words: string[];
	sensitive?: boolean;
}): Verdict {
	if (input.honeypot) return { action: 'reject', reason: 'honeypot' };
	if (input.stamp === 'invalid') {
		return { action: 'reject', reason: 'The form expired. Please reload the page and try again.' };
	}
	if (input.stamp === 'too-fast') {
		return { action: 'reject', reason: 'That was quick. Please take a moment and try again.' };
	}
	if (countLinks(input.text) > input.maxLinks) return { action: 'pending', reason: 'links' };
	const word = matchesWordFilter(input.text, input.words);
	if (word) return { action: 'pending', reason: 'word-filter' };
	if (input.sensitive) return { action: 'pending', reason: 'sensitive' };
	if (input.mode === 'pre') return { action: 'pending', reason: 'pre-moderation' };
	return { action: 'published' };
}
