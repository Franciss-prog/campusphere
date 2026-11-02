import pg from 'pg';
import * as env from '$app/env/private';

// Long-running Bun server (adapter-bun): one module-scoped pool, reused across requests.
// DATABASE_URL is Neon's pooled (-pooler) string; use DATABASE_URL_UNPOOLED for migrations.
let pool: pg.Pool | undefined;

export function db(): pg.Pool {
	if (!pool) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });
		// Idle-client disconnects surface as pool 'error'; without a listener the process crashes.
		pool.on('error', (err) => console.error('[db] idle client error:', err.message));
	}
	return pool;
}
