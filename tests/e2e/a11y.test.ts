import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Automated WCAG 2.1 AA checks on the main public pages. (Manual keyboard and screen-reader
// checks are still needed; axe finds roughly a third of real issues.)
const PAGES = [
	'/',
	'/recommendations',
	'/concerns',
	'/concerns/new',
	'/solutions',
	'/tracker',
	'/blog',
	'/blog/new',
	'/search?q=library',
	'/about',
	'/guidelines',
	'/privacy',
	'/admin/login'
];

for (const path of PAGES) {
	test(`no detectable accessibility violations on ${path}`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();
		const summary = results.violations.map(
			(v) =>
				`${v.id} (${v.impact}): ${v.nodes
					.slice(0, 3)
					.map((n) => n.target.join(' '))
					.join(' | ')}`
		);
		expect(summary).toEqual([]);
	});
}

test('no detectable accessibility violations on a concern and a blog post', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	for (const [list, sel] of [
		['/concerns', 'a.go'],
		['/blog', 'h3 a']
	] as const) {
		await page.goto(list);
		// The branch may hold only a few sample concerns and no blog posts; check what exists.
		if (!(await page.locator(sel).count())) continue;
		await page.locator(sel).first().click();
		await page.waitForLoadState('networkidle');
		const r = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();
		expect(
			r.violations.map(
				(v) =>
					`${page.url()} ${v.id}: ${v.nodes
						.map((n) => n.target.join(' '))
						.slice(0, 3)
						.join(' | ')}`
			)
		).toEqual([]);
	}
});
