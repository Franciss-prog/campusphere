import { requireStaff } from '#lib/server/auth.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => {
	const staff = requireStaff(event);
	return { staff };
};
