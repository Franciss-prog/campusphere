import { isStatus, type ConcernStatus } from '#lib/status.ts';

/** Safe readers for list-page query params. Unknown values fall back to defaults. */
export function pageParam(url: URL): number {
	const n = Number(url.searchParams.get('page') ?? '1');
	return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}

export function oneOf<T extends string>(
	url: URL,
	key: string,
	allowed: readonly T[],
	fallback: T
): T {
	const v = url.searchParams.get(key);
	return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function statusParam(url: URL): ConcernStatus | null {
	const v = url.searchParams.get('status');
	return isStatus(v) ? v : null;
}

export function slugParam(url: URL, key: string): string | null {
	const v = url.searchParams.get(key);
	return v && /^[a-z0-9-]{1,80}$/.test(v) ? v : null;
}

export function textParam(url: URL, key: string, max = 120): string | null {
	const v = url.searchParams.get(key)?.trim();
	return v ? v.slice(0, max) : null;
}
