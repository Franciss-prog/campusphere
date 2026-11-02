import { defineConfig } from 'drizzle-kit';

// Migrations use the direct (unpooled) connection. Bun loads .env.local automatically.
const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set (run `neon env pull`)');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	casing: 'snake_case',
	dbCredentials: { url },
	strict: true,
	verbose: true
});
