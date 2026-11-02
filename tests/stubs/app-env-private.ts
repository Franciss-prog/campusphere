// Test stub for SvelteKit's `$app/env/private`: reads the same variables from process.env.
export const DATABASE_URL = process.env.DATABASE_URL ?? '';
export const DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED ?? '';
export const ANON_SECRET = process.env.ANON_SECRET ?? 'test-secret-test-secret-test-secret-123';
export const TURNSTILE_SECRET_KEY = undefined;
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? '';
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? '';
export const AWS_ENDPOINT_URL_S3 = process.env.AWS_ENDPOINT_URL_S3 ?? '';
export const AWS_REGION = process.env.AWS_REGION ?? '';
export const NEON_FUNCTION_HELLO_BASE_URL = '';
