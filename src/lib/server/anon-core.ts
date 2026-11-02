// Framework-free anonymity primitives. Used by the app (via anon.ts), scripts and tests.
// Nothing here stores or returns a raw token or a raw client address.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** 256-bit random token for the anonymous identity cookie. */
export function newToken(): string {
	return randomBytes(32).toString('base64url');
}

export function isWellFormedToken(value: string | undefined): value is string {
	return !!value && /^[A-Za-z0-9_-]{43}$/.test(value);
}

function hmac(secret: string, purpose: string, ...parts: string[]): string {
	return createHmac('sha256', secret)
		.update(`${purpose}\u0000${parts.join('\u0000')}`)
		.digest('hex');
}

/** Stored with content, supports and reports instead of the token. */
export function hashToken(secret: string, token: string): string {
	return hmac(secret, 'token', token);
}

export function safeEqualHex(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * Rate-limit subject for a client address. Salted with the secret and the UTC day, so the hash
 * rotates daily and cannot be joined across days or reversed with a lookup table of addresses.
 */
export function hashAddress(secret: string, address: string, now = new Date()): string {
	const day = now.toISOString().slice(0, 10);
	return hmac(secret, 'addr', day, address).slice(0, 32);
}

/** Per-thread label seed: stable inside one thread, unlinkable across threads. */
export function labelSeed(secret: string, token: string, thread: string): string {
	return hmac(secret, 'label', thread, token).slice(0, 16);
}

const NAMES = [
	'Pelican',
	'Heron',
	'Mango',
	'Egret',
	'Lark',
	'Kingfisher',
	'Sparrow',
	'Tamarind',
	'Calamansi',
	'Narra',
	'Sampaguita',
	'Dove',
	'Oriole',
	'Swift',
	'Plover',
	'Ylang',
	'Banyan',
	'Kalachuchi',
	'Owl',
	'Finch',
	'Starling',
	'Guava',
	'Bamboo',
	'Robin'
] as const;

const COLORS = [
	'#C0392B',
	'#7C3AED',
	'#D97706',
	'#2563EB',
	'#0F766E',
	'#A5121A',
	'#9D174D',
	'#4D7C0F'
];

export function anonLabel(seed: string): { name: string; color: string } {
	const n = parseInt(seed.slice(0, 8), 16) || 0;
	return { name: `Anonymous ${NAMES[n % NAMES.length]}`, color: COLORS[(n >>> 8) % COLORS.length] };
}
