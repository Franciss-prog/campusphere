import { error } from '@sveltejs/kit';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { ASSETS_BUCKET, s3 } from '#lib/server/storage.ts';
import { IMAGE_KEY_RE } from '#lib/server/images.ts';
import type { RequestHandler } from './$types';

// Serves processed uploads from the private bucket. Only well-formed upload keys are allowed.
export const GET: RequestHandler = async ({ params }) => {
	if (!IMAGE_KEY_RE.test(params.key)) error(404, { message: 'Not found' });
	try {
		const obj = await s3().send(new GetObjectCommand({ Bucket: ASSETS_BUCKET, Key: params.key }));
		if (!obj.Body) error(404, { message: 'Not found' });
		return new Response(obj.Body.transformToWebStream(), {
			headers: {
				'Content-Type': 'image/webp',
				'Cache-Control': 'public, max-age=31536000, immutable',
				'X-Content-Type-Options': 'nosniff',
				'Content-Disposition': 'inline'
			}
		});
	} catch {
		error(404, { message: 'Not found' });
	}
};
