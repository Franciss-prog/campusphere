import { defineEnvVars } from '@sveltejs/kit/env';

// Server-only (non-public), read at runtime. Values come from `.env.local`, written by
// `neon deploy` / `neon env pull` from the linked Neon branch (see neon.ts).
export const variables = defineEnvVars({
	DATABASE_URL: { description: 'Neon Postgres pooled connection string (app traffic)' },
	DATABASE_URL_UNPOOLED: {
		description: 'Neon Postgres direct connection string (migrations, LISTEN/NOTIFY)'
	},
	AWS_ACCESS_KEY_ID: { description: 'Neon Object Storage access key (branch-scoped)' },
	AWS_SECRET_ACCESS_KEY: { description: 'Neon Object Storage secret key (branch-scoped)' },
	AWS_ENDPOINT_URL_S3: { description: 'Neon Object Storage S3 endpoint for this branch' },
	AWS_REGION: { description: 'Neon Object Storage region' },
	NEON_FUNCTION_HELLO_BASE_URL: { description: 'Invocation URL of the `hello` Neon Function' }
});
