import { defineConfig } from 'vitest/config';

// Unit tests run against plain TS modules (no SvelteKit plugin needed).
// DB integration tests (`*.db.test.ts`) need DATABASE_URL and are opt-in: `bun run test:db`.
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		exclude: ['src/**/*.db.test.ts'],
		environment: 'node'
	}
});
