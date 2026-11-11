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
