import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

const sent: { Body: Buffer; Key: string }[] = [];
vi.mock('./storage.ts', () => ({
	ASSETS_BUCKET: 'assets',
	s3: () => ({
		send: async (cmd: { input: { Body: Buffer; Key: string } }) => sent.push(cmd.input)
	})
}));
const ledger: { key: string; bytes: number }[] = [];
vi.mock('./db/index.ts', () => ({
	t: { media: {} },
	db: () => ({
		insert: () => ({ values: async (v: { key: string; bytes: number }) => ledger.push(v) })
	})
}));
const { processImage, IMAGE_KEY_RE } = await import('./images.ts');

async function jpegWithGps(): Promise<File> {
	const buf = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#d01c23' } })
		.jpeg()
		.withExif({ IFD0: { Make: 'TestCam', Model: 'X' }, IFD3: { GPSLatitudeRef: 'N' } })
		.toBuffer();
	return new File([new Uint8Array(buf)], 'photo.jpg', { type: 'image/jpeg' });
}

describe('processImage', () => {
	it('re-encodes to WebP and strips EXIF', async () => {
		const file = await jpegWithGps();
		expect((await sharp(Buffer.from(await file.arrayBuffer())).metadata()).exif).toBeDefined();
		const res = await processImage(file);
		expect(res.ok).toBe(true);
		const out = sent.at(-1)!;
		expect(out.Key).toMatch(IMAGE_KEY_RE);
		// Every stored object gets an unowned ledger row so unused uploads can be pruned.
		expect(ledger.at(-1)).toEqual({ key: out.Key, bytes: out.Body.length });
		const meta = await sharp(out.Body).metadata();
		expect(meta.format).toBe('webp');
		expect(meta.exif).toBeUndefined();
	});

	it('rejects non-images even with an image MIME type', async () => {
		const res = await processImage(
			new File(['<svg onload=alert(1)>'], 'x.png', { type: 'image/png' })
		);
		expect(res.ok).toBe(false);
	});

	it('rejects files over 5 MB', async () => {
		const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
		expect((await processImage(big)).ok).toBe(false);
	});
});
