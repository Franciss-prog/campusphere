import { error, json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ASSETS_BUCKET, s3 } from '#lib/server/storage.ts';
import type { RequestHandler } from './$types';

// Smoke test: put an object, read it back, presign it, fetch via the presigned URL, then delete.
export const GET: RequestHandler = async () => {
	// Smoke test: development only, never exposed in production.
	if (!dev) error(404);
	const client = s3();
	const key = `healthchecks/${crypto.randomUUID()}.txt`;
	const body = `hello from campusphere @ ${new Date().toISOString()}`;

	await client.send(
		new PutObjectCommand({ Bucket: ASSETS_BUCKET, Key: key, Body: body, ContentType: 'text/plain' })
	);
	const got = await client.send(new GetObjectCommand({ Bucket: ASSETS_BUCKET, Key: key }));
	const readBack = await got.Body?.transformToString();

	const url = await getSignedUrl(
		client,
		new GetObjectCommand({ Bucket: ASSETS_BUCKET, Key: key }),
		{
			expiresIn: 60
		}
	);
	const presignedRes = await fetch(url);
	const presignedBody = await presignedRes.text();

	await client.send(new DeleteObjectCommand({ Bucket: ASSETS_BUCKET, Key: key }));

	return json({
		ok: readBack === body && presignedBody === body,
		key,
		readBackMatches: readBack === body,
		presignedStatus: presignedRes.status,
		presignedMatches: presignedBody === body
	});
};
