import { describe, expect, it } from 'vitest';
import { RULES, retryAfterSec, windowStart } from './ratelimit-core.ts';

describe('rate-limit windows', () => {
	it('aligns windows to fixed boundaries', () => {
		const now = Date.UTC(2026, 10, 2, 10, 37, 12);
		expect(windowStart(now, 3600).toISOString()).toBe('2026-11-02T10:00:00.000Z');
		expect(windowStart(now, 600).toISOString()).toBe('2026-11-02T10:30:00.000Z');
	});

	it('reports the seconds left in the window', () => {
		const now = Date.UTC(2026, 10, 2, 10, 59, 30);
		expect(retryAfterSec(now, 3600)).toBe(30);
	});

	it('never returns zero', () => {
		expect(retryAfterSec(Date.UTC(2026, 0, 1), 60)).toBeGreaterThanOrEqual(1);
	});

	it('keeps login strict', () => {
		expect(RULES.login.max).toBeLessThanOrEqual(5);
	});
});
