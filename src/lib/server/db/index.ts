import type pg from 'pg';
import * as env from '$app/env/private';
import { createDb, type Database } from './client.ts';

// Long-running Bun server (adapter-bun): one module-scoped pool, reused across requests.
// DATABASE_URL is Neon's pooled (-pooler) string; use DATABASE_URL_UNPOOLED for migrations.
let instance: { pool: pg.Pool; db: Database } | undefined;

function get() {
	if (!instance) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		instance = createDb(env.DATABASE_URL);
	}
	return instance;
}

export function pool(): pg.Pool {
	return get().pool;
}

export function db(): Database {
	return get().db;
}

export * as t from './schema.ts';
export type { Database };
