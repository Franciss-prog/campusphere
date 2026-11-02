import { z } from 'zod';

export type FieldErrors = Record<string, string>;

export type Parsed<T> =
	{ ok: true; data: T } | { ok: false; errors: FieldErrors; values: Record<string, string> };

/** Reads FormData into a plain object (last value wins; checkboxes become 'on'). */
export function formValues(form: FormData): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [k, v] of form.entries()) if (typeof v === 'string') out[k] = v;
	return out;
}

/** Validates FormData with a Zod schema and returns friendly, per-field messages. */
export function parseForm<S extends z.ZodType>(schema: S, form: FormData): Parsed<z.output<S>> {
	const values = formValues(form);
	const result = schema.safeParse(values);
	if (result.success) return { ok: true, data: result.data };
	const errors: FieldErrors = {};
	for (const issue of result.error.issues) {
		const key = String(issue.path[0] ?? '_form');
		errors[key] ??= issue.message;
	}
	return { ok: false, errors, values };
}

// Reusable field schemas with plain-language messages.
export const text = (label: string, min: number, max: number) =>
	z
		.string({ error: `${label} is required.` })
		.trim()
		.min(min, min <= 1 ? `${label} is required.` : `${label} needs at least ${min} characters.`)
		.max(max, `${label} can be at most ${max} characters.`);

export const optionalText = (label: string, max: number) =>
	z
		.string()
		.trim()
		.max(max, `${label} can be at most ${max} characters.`)
		.optional()
		.transform((v) => (v ? v : null));

export const checkbox = z
	.string()
	.optional()
	.transform((v) => v === 'on' || v === 'true');

export const intId = z.coerce.number({ error: 'Invalid id.' }).int().positive();
