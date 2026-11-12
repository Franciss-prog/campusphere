import { expect, test } from '@playwright/test';
import pg from 'pg';

// Remove what the run created (comments, proposals, reports and history cascade with the concern)
// and reset rate limits, so repeated runs on the dev branch neither pile up nor lock themselves out.
test.afterAll(async () => {
	if (process.env.NEON_BRANCH === 'production' || !process.env.DATABASE_URL_UNPOOLED) return;
	const c = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
	await c.connect();
	try {
		await c.query(`delete from concern where title like 'E2E test concern %' and source <> 'seed'`);
		await c.query(`delete from rate_limit`);
	} finally {
		await c.end();
	}
});

// Report a concern, comment, propose a solution, then an admin updates the status and the
// public timeline reflects it.
test('concern lifecycle from report to public status update', async ({ page, browser }) => {
	if (process.env.NEON_BRANCH === 'production') test.skip(true, 'Never run against production');
	const email = process.env.SEED_ADMIN_EMAIL;
	const password = process.env.SEED_ADMIN_PASSWORD;
	test.skip(!email || !password, 'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set');

	const title = `E2E test concern ${Date.now()}`;

	// 1. Report a concern (anonymous). Wait past the minimum time-to-submit.
	await page.goto('/concerns/new');
	await page.waitForLoadState('networkidle');
	await page.getByLabel('Title').fill(title);
	await page
		.getByLabel('What is happening?')
		.fill('The e2e test describes a problem that happens every day.');
	await page.getByLabel('Category').selectOption({ label: 'Facilities' });
	await page.waitForTimeout(3200);
	await page.getByRole('button', { name: 'Post anonymously' }).click();
	await expect(page).toHaveURL(/\/concerns\/\d+/);
	await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
	const url = page.url().split('?')[0];

	// 2. Add a comment.
	await page
		.getByLabel('Add a comment')
		.last()
		.fill('E2E comment: this happens in the morning too.');
	await page.waitForTimeout(3200);
	await page.getByRole('button', { name: 'Post comment' }).last().click();
	await expect(page.getByText('E2E comment: this happens in the morning too.')).toBeVisible();

	// 3. Propose a solution.
	await page.locator('summary', { hasText: 'Propose a solution' }).click();
	await page.getByLabel('Your solution in one line').fill('Fix it with an e2e proposal');
	await page
		.getByLabel('How would it work?')
		.fill('The e2e proposal explains how the fix would work.');
	await page.waitForTimeout(3200);
	await page.getByRole('button', { name: 'Post proposal' }).click();
	await expect(page.getByText('Your proposal is posted.')).toBeVisible();
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Fix it with an e2e proposal' })).toBeVisible();

	// 4. Admin signs in and updates the status with a public note.
	const staff = await browser.newPage();
	await staff.goto('/admin/login');
	await staff.waitForLoadState('networkidle');
	await staff.getByLabel('Email').fill(email!);
	await staff.getByLabel('Password').fill(password!);
	await staff.getByRole('button', { name: 'Sign in' }).click();
	await expect(staff).toHaveURL(/\/admin$/);
	const id = url.split('/').pop();
	await staff.goto(`/admin/concerns?update=${id}`);
	await staff.waitForLoadState('networkidle');
	const dialog = staff.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await dialog.getByLabel('New status').selectOption({ label: 'Under Review' });
	await dialog.getByLabel(/Public note/).fill('E2E: forwarded to the facilities office.');
	await dialog.getByRole('button', { name: 'Save status' }).click();
	await expect(staff.getByText('Status saved')).toBeVisible();

	// 5. The public timeline shows the change.
	await page.reload();
	await expect(page.getByText('E2E: forwarded to the facilities office.')).toBeVisible();
	await expect(page.locator('.dh .st')).toHaveText('Under Review');

	// 6. Anonymous visitors cannot reach the admin area.
	const anon = await browser.newPage();
	await anon.goto('/admin/concerns');
	await expect(anon).toHaveURL(/\/admin\/login/);
	const res = await anon.request.post('/admin/concerns?/update', {
		form: { id: String(id), status: 'resolved' },
		headers: { origin: 'http://localhost:5180' },
		maxRedirects: 0
	});
	expect([303, 403]).toContain(res.status());
});

// Action Campaigns: index cards, detail page with prefilled links, and 404 for unknown slugs.
test('action campaigns render and unknown slugs return 404', async ({ page }) => {
	await page.goto('/campaigns');
	await expect(page.getByRole('heading', { level: 1, name: 'Action Campaigns' })).toBeVisible();
	for (const name of [
		'Keep Our Campus Clean',
		'Practice Academic Integrity',
		'Respect Campus Facilities',
		'Promote Responsible Student Behavior'
	]) {
		await expect(page.getByRole('heading', { level: 3, name })).toBeVisible();
	}

	await page.getByRole('link', { name: /Join this campaign.*Keep Our Campus Clean/ }).click();
	await expect(page).toHaveURL(/\/campaigns\/keep-our-campus-clean$/);
	await expect(
		page.getByRole('heading', { level: 1, name: 'Keep Our Campus Clean' })
	).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Take part' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Suggested actions' })).toBeVisible();

	// With the campaign tag seeded, the concern form arrives with the tag checked.
	await page.locator('#take-part').getByRole('link', { name: 'Report a concern' }).click();
	await expect(page).toHaveURL(/\/concerns\/new/);
	if (page.url().includes('campaign=')) {
		await expect(page.getByLabel('Keep Our Campus Clean')).toBeChecked();
	}

	const res = await page.goto('/campaigns/not-a-campaign');
	expect(res?.status()).toBe(404);
});

// Landing: campaign-first hero, its two calls to action, and the flow anchors.
test('landing page shows the flow sections and hero actions', async ({ page }) => {
	await page.goto('/');
	await expect(
		page.getByRole('heading', { level: 1, name: 'A better campus starts with you.' })
	).toBeVisible();
	for (const id of ['discover', 'campaigns', 'participate', 'engage']) {
		await expect(page.locator(`#${id}`)).toHaveCount(1);
	}
	const hero = page.locator('.hcopy');
	await expect(hero.getByText('Ethics in Action Campaign')).toBeVisible();
	await expect(hero.getByRole('link', { name: 'Take action' })).toHaveAttribute(
		'href',
		'/campaigns'
	);
	await expect(hero.getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', '#discover');
	const ribbon = page.getByRole('navigation', { name: 'How Campusphere works' });
	for (const [name, href] of [
		['Discover', '#discover'],
		['Participate', '#participate'],
		['Engage', '#engage']
	]) {
		await expect(ribbon.getByRole('link', { name: new RegExp(name) })).toHaveAttribute(
			'href',
			href
		);
	}
	await expect(
		page.getByRole('heading', {
			level: 2,
			name: 'Values are what we say. Campaigns are what we do.'
		})
	).toBeVisible();
	await expect(
		page.getByRole('heading', { level: 3, name: 'Keep Our Campus Clean' })
	).toBeVisible();
});
