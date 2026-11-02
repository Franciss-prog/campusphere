import { formStamp } from '#lib/server/safety.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ url }) => {
	// Re-run per navigation so each form gets a fresh signed render timestamp.
	void url.pathname;
	return { stamp: formStamp() };
};
