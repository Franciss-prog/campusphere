import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from 'vite';

// Make .env.local (Neon branch, seed admin) available to the tests.
Object.assign(process.env, { ...loadEnv('development', process.cwd(), ''), ...process.env });

// E2E smoke test against the dev server and the Neon dev branch (never production).
// Uses SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from .env.local for the staff part.
// Set CHROMIUM_PATH to use a system browser instead of `bunx playwright install chromium`.
const PORT = 5180;

export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 90_000,
	fullyParallel: false,
	retries: 0,
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure',
		launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `bun run dev -- --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: true,
		timeout: 120_000
	}
});
