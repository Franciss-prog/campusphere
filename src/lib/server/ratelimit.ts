import { lt, sql } from 'drizzle-orm';
import { db, t } from './db/index.ts';
import { RULES, retryAfterSec, windowStart, type Bucket } from './ratelimit-core.ts';

export type LimitResult = { ok: true } | { ok: false; retryAfter: number };

/**
 * Counts one hit for every subject (hashed address, anonymous token hash, ...) and fails if any
 * subject is over the bucket's limit. Subjects are already hashed: nothing here is identifying.
 */
export async function hit(
	bucket: Bucket,
	subjects: (string | null | undefined)[]
): Promise<LimitResult> {
	const rule = RULES[bucket];
	const now = Date.now();
	const start = windowStart(now, rule.windowSec);
	const keys = [...new Set(subjects.filter((s): s is string => !!s))].map((s) => `${bucket}:${s}`);
	if (!keys.length) return { ok: true };

	const rows = await db()
		.insert(t.rateLimit)
		.values(keys.map((key) => ({ key, windowStart: start, count: 1 })))
		.onConflictDoUpdate({
			target: [t.rateLimit.key, t.rateLimit.windowStart],
			set: { count: sql`${t.rateLimit.count} + 1` }
		})
		.returning({ count: t.rateLimit.count });

	// Occasionally prune old windows so the table stays small (rate-limit data is short-lived).
	if (Math.random() < 0.02) {
		await db()
			.delete(t.rateLimit)
			.where(lt(t.rateLimit.windowStart, new Date(now - 2 * 86_400_000)));
	}

	return rows.some((r) => r.count > rule.max)
		? { ok: false, retryAfter: retryAfterSec(now, rule.windowSec) }
		: { ok: true };
}

export function tooManyMessage(retryAfter: number): string {
	const minutes = Math.ceil(retryAfter / 60);
	return minutes <= 1
		? 'You are doing that too often. Please wait a minute and try again.'
		: `You are doing that too often. Please try again in ${minutes} minutes.`;
}
