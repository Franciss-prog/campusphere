import { describe, expect, it } from 'vitest';
import {
	checkStamp,
	countLinks,
	fingerprint,
	judge,
	makeStamp,
	matchesWordFilter
} from './safety-core.ts';

const S = 's'.repeat(40);
const base = {
	honeypot: null,
	stamp: 'ok' as const,
	text: 'Hello',
	mode: 'post' as const,
	maxLinks: 2,
	words: []
};

describe('form stamp', () => {
	it('accepts a stamp older than the minimum time', () => {
		const t0 = 1_000_000;
		expect(checkStamp(S, makeStamp(S, t0), t0 + 5_000)).toBe('ok');
	});
	it('flags submissions that are too fast', () => {
		const t0 = 1_000_000;
		expect(checkStamp(S, makeStamp(S, t0), t0 + 500)).toBe('too-fast');
	});
	it('rejects forged, missing and expired stamps', () => {
		expect(checkStamp(S, '123.deadbeefdeadbeef', 200_000)).toBe('invalid');
		expect(checkStamp(S, null)).toBe('invalid');
		expect(checkStamp(S, makeStamp(S, 0), 2 * 86_400_000)).toBe('invalid');
		expect(checkStamp('other'.repeat(10), makeStamp(S, 1000), 9000)).toBe('invalid');
	});
});

describe('content heuristics', () => {
	it('counts links', () => {
		expect(countLinks('see https://a.com and www.b.com, not c.com')).toBe(2);
	});
	it('normalizes text for duplicate checks', () => {
		expect(fingerprint('  Fix the ROOF!! ')).toBe(fingerprint('fix the roof'));
	});
	it('matches whole words only', () => {
		expect(matchesWordFilter('This is a scam offer', ['scam'])).toBe('scam');
		expect(matchesWordFilter('scampi for lunch', ['scam'])).toBeNull();
	});
});

describe('judge', () => {
	it('publishes clean content in post-moderation mode', () => {
		expect(judge(base)).toEqual({ action: 'published' });
	});
	it('rejects honeypot hits and bad stamps', () => {
		expect(judge({ ...base, honeypot: 'http://spam' }).action).toBe('reject');
		expect(judge({ ...base, stamp: 'invalid' }).action).toBe('reject');
		expect(judge({ ...base, stamp: 'too-fast' }).action).toBe('reject');
	});
	it('holds link-heavy, filtered, sensitive and pre-moderated content', () => {
		expect(judge({ ...base, text: 'http://a http://b http://c' }).action).toBe('pending');
		expect(judge({ ...base, text: 'buy now', words: ['buy now'] }).action).toBe('pending');
		expect(judge({ ...base, sensitive: true }).action).toBe('pending');
		expect(judge({ ...base, mode: 'pre' }).action).toBe('pending');
	});
});
