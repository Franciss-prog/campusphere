import { describe, expect, it } from 'vitest';

// auth.ts imports the SvelteKit runtime ($app/env); test the pure permission matrix via a copy-free
// dynamic import guarded by a stub of the modules it needs.
import { vi } from 'vitest';
vi.mock('$app/env', () => ({ dev: true }));
vi.mock('./db/index.ts', () => ({ db: () => ({}), t: {} }));

const { can, requireAdmin, requireStaff } = await import('./auth.ts');

const admin = { id: 1, email: 'a@x', role: 'ADMIN' as const };
const mod = { id: 2, email: 'm@x', role: 'MODERATOR' as const };
const url = new URL('http://x/admin/users');

describe('permissions', () => {
	it('lets moderators moderate but not change status or manage', () => {
		expect(can(mod, 'moderate')).toBe(true);
		expect(can(mod, 'change-status')).toBe(false);
		expect(can(mod, 'manage-taxonomy')).toBe(false);
		expect(can(mod, 'manage-staff')).toBe(false);
	});
	it('lets administrators do everything', () => {
		for (const a of ['moderate', 'change-status', 'manage-taxonomy', 'manage-staff'] as const) {
			expect(can(admin, a)).toBe(true);
		}
	});
	it('denies anonymous visitors', () => {
		expect(can(null, 'moderate')).toBe(false);
	});
	it('redirects anonymous visitors to sign in', () => {
		expect(() => requireStaff({ locals: { staff: null, anonHash: null }, url })).toThrow();
		try {
			requireStaff({ locals: { staff: null, anonHash: null }, url });
		} catch (e) {
			expect((e as { status: number; location: string }).status).toBe(303);
			expect((e as { location: string }).location).toBe('/admin/login?next=%2Fadmin%2Fusers');
		}
	});
	it('forbids moderators on admin-only pages', () => {
		try {
			requireAdmin({ locals: { staff: mod, anonHash: null }, url });
			expect.unreachable();
		} catch (e) {
			expect((e as { status: number }).status).toBe(403);
		}
		expect(requireAdmin({ locals: { staff: admin, anonHash: null }, url })).toEqual(admin);
	});
});
