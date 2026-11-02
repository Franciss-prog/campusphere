import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.ts';

export type Database = NodePgDatabase<typeof schema>;

/** Framework-free factory, shared by the app and by scripts (migrate, seed, tests). */
export function createDb(connectionString: string, max = 10): { pool: pg.Pool; db: Database } {
	// pg treats sslmode=require as verify-full today and warns about it; say so explicitly.
	const url = connectionString.replace(/sslmode=require\b/, 'sslmode=verify-full');
	const pool = new pg.Pool({ connectionString: url, max });
	// Idle-client disconnects surface as pool 'error'; without a listener the process crashes.
	pool.on('error', (err) => console.error('[db] idle client error:', err.message));
	const db = drizzle({ client: pool, schema, casing: 'snake_case' });
	return { pool, db };
}
