// Copies one concern (with its status history and tags) from one Neon branch to another.
// Category and tags are matched by slug, since ids differ between branches. Supports, comments,
// proposals and photos are not copied.
//
//   SOURCE_DATABASE_URL=<from> DATABASE_URL_UNPOOLED=<to> bun run scripts/copy-concern.ts <id>
//
// Writing to production also needs NEON_BRANCH=production and --allow-production.
import pg from 'pg';

const id = Number(process.argv[2]);
const from = process.env.SOURCE_DATABASE_URL;
const to = process.env.DATABASE_URL_UNPOOLED;
if (!Number.isInteger(id) || id <= 0) throw new Error('Usage: copy-concern.ts <concern id>');
if (!from || !to) throw new Error('Set SOURCE_DATABASE_URL and DATABASE_URL_UNPOOLED');
if (from === to) throw new Error('Source and target are the same database');
if (process.env.NEON_BRANCH === 'production' && !process.argv.includes('--allow-production')) {
	throw new Error('Target is production. Pass --allow-production to confirm.');
}

const src = new pg.Client({ connectionString: from });
const dst = new pg.Client({ connectionString: to });
await src.connect();
await dst.connect();
try {
	const { rows } = await src.query(
		`select c.*, cat.slug as category_slug from concern c
		 left join category cat on cat.id = c.category_id where c.id = $1`,
		[id]
	);
	const c = rows[0];
	if (!c) throw new Error(`Concern ${id} not found in the source database`);
	const history = (
		await src.query(
			`select status, public_note, created_at from status_history where concern_id = $1 order by created_at`,
			[id]
		)
	).rows;
	const tags = (
		await src.query(
			`select tg.slug from concern_tag ct join tag tg on tg.id = ct.tag_id where ct.concern_id = $1`,
			[id]
		)
	).rows.map((r) => r.slug as string);

	await dst.query('begin');
	const dup = await dst.query(`select id from concern where title = $1 and created_at = $2`, [
		c.title,
		c.created_at
	]);
	if (dup.rows.length) throw new Error(`Already copied (target id ${dup.rows[0].id})`);
	const cat = c.category_slug
		? ((
				await dst.query(`select id from category where type = 'concern' and slug = $1`, [
					c.category_slug
				])
			).rows[0]?.id ?? null)
		: null;
	const inserted = await dst.query(
		`insert into concern (kind, title, description, category_id, location, images, current_status,
			is_sensitive, visibility, author_token_hash, source, status_changed_at, created_at, updated_at)
		 values ($1, $2, $3, $4, $5, '[]'::jsonb, $6, $7, $8, $9, $10, $11, $12, $13) returning id`,
		[
			c.kind,
			c.title,
			c.description,
			cat,
			c.location,
			c.current_status,
			c.is_sensitive,
			c.visibility,
			c.author_token_hash,
			c.source,
			c.status_changed_at,
			c.created_at,
			c.updated_at
		]
	);
	const newId = inserted.rows[0].id as number;
	for (const h of history) {
		await dst.query(
			`insert into status_history (concern_id, status, public_note, created_at) values ($1, $2, $3, $4)`,
			[newId, h.status, h.public_note, h.created_at]
		);
	}
	if (tags.length) {
		await dst.query(
			`insert into concern_tag (concern_id, tag_id) select $1, id from tag where slug = any($2::text[])
			 on conflict do nothing`,
			[newId, tags]
		);
	}
	await dst.query('commit');
	console.log(
		`Copied "${c.title}" as concern ${newId} (category ${cat ?? 'none'}, ${history.length} history, ${tags.length} tags).`
	);
	if (c.images?.length) console.log(`Note: ${c.images.length} photo(s) were not copied.`);
} catch (e) {
	await dst.query('rollback').catch(() => {});
	throw e;
} finally {
	await src.end();
	await dst.end();
}
