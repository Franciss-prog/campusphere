// Fixed-window rate-limit rules. Pure, so the window math is unit-tested without a database.

export type Rule = { max: number; windowSec: number };

export const RULES = {
	concern: { max: 5, windowSec: 3600 },
	post: { max: 4, windowSec: 3600 },
	proposal: { max: 8, windowSec: 3600 },
	comment: { max: 20, windowSec: 3600 },
	react: { max: 120, windowSec: 600 },
	report: { max: 20, windowSec: 3600 },
	upload: { max: 10, windowSec: 3600 },
	search: { max: 120, windowSec: 60 },
	login: { max: 5, windowSec: 900 }
} satisfies Record<string, Rule>;

export type Bucket = keyof typeof RULES;

export function windowStart(now: number, windowSec: number): Date {
	const ms = windowSec * 1000;
	return new Date(Math.floor(now / ms) * ms);
}

export function retryAfterSec(now: number, windowSec: number): number {
	const ms = windowSec * 1000;
	return Math.max(1, Math.ceil((windowStart(now, windowSec).getTime() + ms - now) / 1000));
}
