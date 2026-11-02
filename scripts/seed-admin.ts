// Creates (or resets the password of) the first administrator from env vars.
//   SEED_ADMIN_EMAIL=you@example.edu SEED_ADMIN_PASSWORD='long passphrase' bun run db:seed-admin
// No default credentials exist anywhere in the repository.
import { eq } from 'drizzle-orm';
import { createDb } from '../src/lib/server/db/client.ts';
import * as t from '../src/lib/server/db/schema.ts';
import { hashPassword, passwordProblem } from '../src/lib/server/password.ts';

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
if (!email || !password) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD');
const problem = passwordProblem(password);
if (problem) throw new Error(`SEED_ADMIN_PASSWORD: ${problem}`);

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set');
const { pool, db } = createDb(url, 1);

try {
	const passwordHash = await hashPassword(password);
	const existing = await db.query.staffUser.findFirst({ where: eq(t.staffUser.email, email) });
	if (existing) {
		await db
			.update(t.staffUser)
			.set({ passwordHash, role: 'ADMIN', disabledAt: null })
			.where(eq(t.staffUser.id, existing.id));
		await db.delete(t.staffSession).where(eq(t.staffSession.staffId, existing.id));
		console.log(`Updated administrator ${email} (existing sessions signed out).`);
	} else {
		await db.insert(t.staffUser).values({ email, passwordHash, role: 'ADMIN' });
		console.log(`Created administrator ${email}.`);
	}
} finally {
	await pool.end();
}
