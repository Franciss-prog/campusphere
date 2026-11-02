// Recomputes the cached counters (likes, supports, comments, proposals) from the source rows and
// fixes any that drifted. Safe to run any time; it only touches rows whose count is wrong.
//
//   bun run db:reconcile            report and fix
//   bun run db:reconcile --check    report only (exits 1 if anything drifted)
import { sql } from 'drizzle-orm';
import { createDb } from '../src/lib/server/db/client.ts';

const check = process.argv.includes('--check');
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set (run `neon env pull`)');
const { pool, db } = createDb(url, 1);

// [label, table, column, expression computing the true value for row `x`]
const COUNTERS: [string, string, string, string][] = [
	[
		'post likes',
		'post',
		'like_count',
		`(select count(*) from reaction r where r.post_id = x.id and r.type = 'like')`
	],
	[
		'post comments',
		'post',
		'comment_count',
		`(select count(*) from comment c where c.post_id = x.id and c.visibility = 'published')`
	],
	[
		'concern supports',
		'concern',
		'support_count',
		`(select count(*) from concern_support s where s.concern_id = x.id)`
	],
	[
		'concern comments',
		'concern',
		'comment_count',
		`(select count(*) from comment c where c.concern_id = x.id and c.visibility = 'published')`
	],
	[
		'concern proposals',
		'concern',
		'proposal_count',
		`(select count(*) from proposal p where p.concern_id = x.id and p.visibility = 'published')`
	],
	[
		'proposal supports',
		'proposal',
		'support_count',
		`(select count(*) from proposal_support s where s.proposal_id = x.id)`
	],
	[
		'proposal comments',
		'proposal',
		'comment_count',
		`(select count(*) from comment c where c.proposal_id = x.id and c.visibility = 'published')`
	]
];

let drifted = 0;
for (const [label, table, column, truth] of COUNTERS) {
	const where = `x.${column} is distinct from ${truth}`;
	const q = check
		? `select count(*)::int as n from ${table} x where ${where}`
		: `with fixed as (update ${table} x set ${column} = ${truth} where ${where} returning 1) select count(*)::int as n from fixed`;
	// Table and column names are constants above, never input.
	const { rows } = await db.execute<{ n: number }>(sql.raw(q));
	const n = Number(rows[0].n);
	drifted += n;
	console.log(`${label.padEnd(18)} ${n ? `${n} ${check ? 'wrong' : 'fixed'}` : 'ok'}`);
}
await pool.end();
if (check && drifted) process.exit(1);
