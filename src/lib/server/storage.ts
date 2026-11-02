import { S3Client } from '@aws-sdk/client-s3';
import * as env from '$app/env/private';

// Bucket declared in neon.ts (`buckets.assets`).
export const ASSETS_BUCKET = 'assets';

let client: S3Client | undefined;

export function s3(): S3Client {
	if (!client) {
		const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION } = env;
		if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_ENDPOINT_URL_S3 || !AWS_REGION) {
			throw new Error('Neon Object Storage env vars (AWS_*) are not set');
		}
		client = new S3Client({
			endpoint: AWS_ENDPOINT_URL_S3,
			region: AWS_REGION,
			credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
			forcePathStyle: true // required by Neon Object Storage
		});
	}
	return client;
}
