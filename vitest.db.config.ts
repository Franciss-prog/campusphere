import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Integration tests against a real Postgres (use a Neon dev branch, never production).
// They create their own rows and delete them afterwards.
const env = loadEnv('development', process.cwd(), '');
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			'$app/env/private': r('./tests/stubs/app-env-private.ts'),
			'$app/env': r('./tests/stubs/app-env.ts'),
			'#lib/status.ts': r('./src/lib/status.ts')
		}
	},
	test: {
		include: ['src/**/*.db.test.ts'],
		environment: 'node',
		env,
		testTimeout: 30_000,
		fileParallelism: false
	}
});
