import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => (value ? value : undefined);

// Server-only unless `public: true`. Read at runtime. Neon values come from `.env.local`, written by
// `neon deploy` / `neon env pull` from the linked Neon branch (see neon.ts). See `.env.example`.
export const variables = defineEnvVars({
	DATABASE_URL: { description: 'Neon Postgres pooled connection string (app traffic)' },
	DATABASE_URL_UNPOOLED: {
		description: 'Neon Postgres direct connection string (migrations, LISTEN/NOTIFY)'
	},
	AWS_ACCESS_KEY_ID: { description: 'Neon Object Storage access key (branch-scoped)' },
	AWS_SECRET_ACCESS_KEY: { description: 'Neon Object Storage secret key (branch-scoped)' },
	AWS_ENDPOINT_URL_S3: { description: 'Neon Object Storage S3 endpoint for this branch' },
	AWS_REGION: { description: 'Neon Object Storage region' },
	NEON_FUNCTION_HELLO_BASE_URL: { description: 'Invocation URL of the `hello` Neon Function' },

	ANON_SECRET: {
		description:
			'Server secret (>= 32 chars) used to HMAC anonymous tokens and client addresses. Never expose.',
		schema: (value) => {
			if (!value || value.length < 32) {
				throw new Error('ANON_SECRET must be set to a random string of at least 32 characters');
			}
			return value;
		}
	},
	TURNSTILE_SECRET_KEY: {
		description: 'Cloudflare Turnstile secret. Unset = bot check bypassed (dev only).',
		schema: optional
	},
	TURNSTILE_SITE_KEY: {
		description: 'Cloudflare Turnstile site key (public). Unset = widget hidden.',
		public: true,
		schema: optional
	}
});
