// Deletes uploaded images that no concern or post uses any more: uploads whose form was rejected
// after the photo was stored, and images of deleted items. Hidden items keep their images, since
// a moderator can restore them.
//
//   bun run db:prune-media            list what would be deleted (dry run)
//   bun run db:prune-media --apply    delete the objects and their ledger rows
//
// Only rows unowned for longer than the grace period are touched, so an upload that is about to
// be attached by an in-flight request is never removed.
import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3';
import { and, inArray, isNull, lt } from 'drizzle-orm';
import { createDb } from '../src/lib/server/db/client.ts';
import { media } from '../src/lib/server/db/schema.ts';

const GRACE_HOURS = 24;
const BUCKET = 'assets';
const apply = process.argv.includes('--apply');

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set (run `neon env pull`)');
const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION } = process.env;
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_ENDPOINT_URL_S3 || !AWS_REGION) {
	throw new Error('Neon Object Storage env vars (AWS_*) are not set');
}
const s3 = new S3Client({
	endpoint: AWS_ENDPOINT_URL_S3,
	region: AWS_REGION,
	credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
	forcePathStyle: true
});
const { pool, db } = createDb(url, 1);

const orphans = await db
	.select({ key: media.key, bytes: media.bytes })
	.from(media)
	.where(
		and(
			isNull(media.concernId),
			isNull(media.postId),
			lt(media.createdAt, new Date(Date.now() - GRACE_HOURS * 3_600_000))
		)
	);

const total = orphans.reduce((a, r) => a + r.bytes, 0);
console.log(`${orphans.length} unused image(s), ${(total / 1024).toFixed(0)} KB`);
for (const r of orphans) console.log(`  ${r.key}`);

if (apply && orphans.length) {
	for (let i = 0; i < orphans.length; i += 1000) {
		const batch = orphans.slice(i, i + 1000).map((r) => r.key);
		const res = await s3.send(
			new DeleteObjectsCommand({
				Bucket: BUCKET,
				Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true }
			})
		);
		const failed = new Set((res.Errors ?? []).map((e) => e.Key));
		const done = batch.filter((k) => !failed.has(k));
		if (done.length) await db.delete(media).where(inArray(media.key, done));
		for (const e of res.Errors ?? []) console.error(`  failed ${e.Key}: ${e.Message}`);
	}
	console.log('Deleted.');
} else if (orphans.length) {
	console.log('Dry run. Pass --apply to delete.');
}
await pool.end();
