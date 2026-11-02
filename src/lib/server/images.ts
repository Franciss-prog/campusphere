import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { ASSETS_BUCKET, s3 } from './storage.ts';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
export const IMAGE_KEY_RE = /^uploads\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/;

export type ImageResult = { ok: true; key: string } | { ok: false; message: string };

/** Returns the uploaded File if the form field has one, otherwise null. */
export function fileFrom(form: FormData, field: string): File | null {
	const v = form.get(field);
	return v instanceof File && v.size > 0 ? v : null;
}

/**
 * Validates by decoding (not by trusting the MIME type), re-encodes to WebP, and uploads.
 * Re-encoding drops all metadata: EXIF (including GPS location), XMP, ICC comments.
 */
export async function processImage(file: File): Promise<ImageResult> {
	if (file.size > MAX_IMAGE_BYTES)
		return { ok: false, message: 'The photo must be 5 MB or smaller.' };
	const input = Buffer.from(await file.arrayBuffer());
	let out: Buffer;
	try {
		const img = sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' });
		const meta = await img.metadata();
		if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
			return { ok: false, message: 'Use a JPG, PNG, or WebP photo.' };
		}
		out = await img
			.rotate() // apply EXIF orientation before metadata is dropped
			.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 80 })
			.toBuffer();
	} catch {
		return { ok: false, message: 'That file could not be read as a photo.' };
	}
	const now = new Date();
	const key = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.webp`;
	await s3().send(
		new PutObjectCommand({ Bucket: ASSETS_BUCKET, Key: key, Body: out, ContentType: 'image/webp' })
	);
	return { ok: true, key };
}

export function mediaUrl(key: string): string {
	return `/media/${key}`;
}
