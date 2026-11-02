// Display helpers (client + server). Plain words, sentence case.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function timeAgo(date: Date | string, now = Date.now()): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const diff = Math.max(0, now - d.getTime());
	if (diff < MIN) return 'Just now';
	if (diff < HOUR) {
		const m = Math.floor(diff / MIN);
		return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`;
	}
	if (diff < DAY) {
		const h = Math.floor(diff / HOUR);
		return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
	}
	const days = Math.floor(diff / DAY);
	if (days === 1) return 'Yesterday';
	if (days < 7) return `${days} days ago`;
	if (days < 14) return '1 week ago';
	if (days < 31) return `${Math.floor(days / 7)} weeks ago`;
	return shortDate(d);
}

export function shortDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const sameYear = d.getFullYear() === new Date().getFullYear();
	return d.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(sameYear ? {} : { year: 'numeric' })
	});
}

export function plural(n: number, one: string, many = `${one}s`): string {
	return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

export function readingMinutes(text: string): number {
	return Math.max(1, Math.round(text.split(/\s+/).length / 220));
}

/** Builds a URL for list controls, keeping other params and resetting the page. */
export function withParams(
	url: { href: string },
	changes: Record<string, string | number | null>
): string {
	const next = new URL(url.href);
	for (const [k, v] of Object.entries(changes)) {
		if (v === null || v === '' || v === undefined) next.searchParams.delete(k);
		else next.searchParams.set(k, String(v));
	}
	if (!('page' in changes)) next.searchParams.delete('page');
	return next.pathname + (next.search ? next.search : '');
}
