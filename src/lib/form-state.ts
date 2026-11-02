/** Loose view of an action result for templates (ActionData is a wide union across actions). */
export type FormState = {
	form?: string;
	ok?: boolean;
	message?: string;
	errors?: Record<string, string>;
	values?: Record<string, unknown>;
	[key: string]: unknown;
};

/** Narrows `form` to the given form name. Guard failures without a name are attributed too. */
export function formState(form: unknown, name?: string): FormState | null {
	if (!form || typeof form !== 'object') return null;
	const f = form as FormState;
	if (name && f.form && f.form !== name) return null;
	return f;
}

export function val(f: FormState | null, key: string): string {
	const v = f?.values?.[key];
	return typeof v === 'string' ? v : '';
}
