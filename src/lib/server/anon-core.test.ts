import { describe, expect, it } from 'vitest';
import {
	anonLabel,
	hashAddress,
	hashToken,
	isWellFormedToken,
	labelSeed,
	newToken,
	safeEqualHex
} from './anon-core.ts';

const S = 'x'.repeat(40);

describe('anonymous identity', () => {
	it('creates well-formed random tokens', () => {
		const a = newToken();
		expect(isWellFormedToken(a)).toBe(true);
		expect(a).not.toBe(newToken());
		expect(isWellFormedToken('short')).toBe(false);
		expect(isWellFormedToken(undefined)).toBe(false);
	});

	it('hashes tokens deterministically and never returns the token', () => {
		const tok = newToken();
		const h = hashToken(S, tok);
		expect(h).toBe(hashToken(S, tok));
		expect(h).not.toContain(tok);
		expect(h).toMatch(/^[0-9a-f]{64}$/);
		expect(hashToken('y'.repeat(40), tok)).not.toBe(h);
		expect(safeEqualHex(h, hashToken(S, tok))).toBe(true);
	});

	it('rotates address hashes daily', () => {
		const d1 = new Date('2026-11-02T10:00:00Z');
		const d2 = new Date('2026-11-03T10:00:00Z');
		expect(hashAddress(S, '10.0.0.1', d1)).toBe(hashAddress(S, '10.0.0.1', d1));
		expect(hashAddress(S, '10.0.0.1', d1)).not.toBe(hashAddress(S, '10.0.0.1', d2));
		expect(hashAddress(S, '10.0.0.1', d1)).not.toContain('10.0.0.1');
	});

	it('gives stable labels inside a thread and unlinkable seeds across threads', () => {
		const tok = newToken();
		expect(labelSeed(S, tok, 'concern:1')).toBe(labelSeed(S, tok, 'concern:1'));
		expect(labelSeed(S, tok, 'concern:1')).not.toBe(labelSeed(S, tok, 'concern:2'));
		expect(anonLabel(labelSeed(S, tok, 'concern:1')).name).toMatch(/^Anonymous [A-Z]/);
	});
});
