import { error, json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { pool as db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

// Smoke test: write a row and read it back.
export const GET: RequestHandler = async () => {
	// Writes on GET: development only, never exposed in production.
	if (!dev) error(404);
	const pool = db();
	await pool.query(
		'CREATE TABLE IF NOT EXISTS healthchecks (id serial PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now())'
	);
	const inserted = await pool.query<{ id: number; created_at: Date }>(
		'INSERT INTO healthchecks DEFAULT VALUES RETURNING id, created_at'
	);
	const { rows } = await pool.query<{ count: string; version: string }>(
		'SELECT count(*)::text AS count, version() AS version FROM healthchecks'
	);
	return json({
		ok: true,
		inserted: inserted.rows[0],
		total: Number(rows[0].count),
		version: rows[0].version
	});
};
