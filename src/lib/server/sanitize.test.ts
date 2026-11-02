import { describe, expect, it } from 'vitest';
import { excerptOf, renderMarkdown, slugify } from './sanitize.ts';

describe('renderMarkdown', () => {
	it('keeps safe formatting', () => {
		const html = renderMarkdown('## Title\n\n**bold** and *em*\n\n> quote');
		expect(html).toContain('<h2>Title</h2>');
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<blockquote>');
	});
	it('removes scripts, event handlers and inline styles', () => {
		const html = renderMarkdown(
			'<script>alert(1)</script><img src=x onerror=alert(1)><p style="color:red" onclick="x()">hi</p>'
		);
		expect(html).not.toMatch(/script|onerror|onclick|style=|<img/i);
	});
	it('drops javascript: links and hardens real ones', () => {
		expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('javascript:');
		const html = renderMarkdown('[site](https://example.com)');
		expect(html).toContain('rel="nofollow ugc noopener noreferrer"');
	});
	it('demotes h1 so the page title stays the only h1', () => {
		expect(renderMarkdown('# Big')).toContain('<h2>Big</h2>');
	});
	it('drops raw iframes and data URLs', () => {
		const html = renderMarkdown('<iframe src="https://evil"></iframe>\n\n[a](data:text/html,x)');
		expect(html).not.toContain('<iframe');
		expect(html).not.toContain('href="data:');
	});
});

describe('text helpers', () => {
	it('builds plain-text excerpts', () => {
		expect(excerptOf('**Hello** <b>world</b>')).toBe('Hello world');
		expect(excerptOf('word '.repeat(100), 50).length).toBeLessThanOrEqual(51);
	});
	it('slugifies titles', () => {
		expect(slugify('Enrollment tips: that work!')).toBe('enrollment-tips-that-work');
		expect(slugify('!!!')).toBe('post');
	});
});
