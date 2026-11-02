import { describe, expect, it } from 'vitest';
import { plural, timeAgo, withParams } from './format.ts';

describe('format', () => {
	const now = Date.UTC(2026, 10, 2, 12);
	it('describes relative time in plain words', () => {
		expect(timeAgo(new Date(now - 30_000), now)).toBe('Just now');
		expect(timeAgo(new Date(now - 2 * 3_600_000), now)).toBe('2 hours ago');
		expect(timeAgo(new Date(now - 86_400_000 - 1000), now)).toBe('Yesterday');
		expect(timeAgo(new Date(now - 3 * 86_400_000), now)).toBe('3 days ago');
	});
	it('pluralizes', () => {
		expect(plural(1, 'comment')).toBe('1 comment');
		expect(plural(1200, 'support')).toBe('1,200 supports');
	});
	it('builds filter URLs and resets the page', () => {
		const url = new URL('http://x/concerns?status=resolved&page=3');
		expect(withParams(url, { category: 'facilities' })).toBe(
			'/concerns?status=resolved&category=facilities'
		);
		expect(withParams(url, { status: null })).toBe('/concerns');
		expect(withParams(url, { page: 2 })).toBe('/concerns?status=resolved&page=2');
	});
});
