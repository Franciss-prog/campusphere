import type { Handle } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import { readAnonHash } from '#lib/server/anon.ts';
import { readSession } from '#lib/server/auth.ts';

const ADMIN_ONLY = ['/admin/users', '/admin/taxonomy'];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.anonHash = readAnonHash(event.cookies);
	event.locals.staff = null;

	const path = event.url.pathname;
	const isAdminArea = path === '/admin' || path.startsWith('/admin/');
	// Only touch the session table where it matters (staff pages, or when a staff cookie exists).
	if (isAdminArea || event.cookies.get('cs_staff')) {
		event.locals.staff = await readSession(event.cookies);
	}

	// Defense in depth: every admin load/action also calls requireStaff/requireAdmin.
	if (isAdminArea && path !== '/admin/login') {
		if (!event.locals.staff) {
			return new Response(null, {
				status: 303,
				headers: { location: `/admin/login?next=${encodeURIComponent(path)}` }
			});
		}
		if (ADMIN_ONLY.some((p) => path === p || path.startsWith(p + '/'))) {
			if (event.locals.staff.role !== 'ADMIN' && event.request.method !== 'GET') {
				return new Response('Only administrators can do this.', { status: 403 });
			}
		}
	}

	const response = await resolve(event);

	const h = response.headers;
	h.set('X-Content-Type-Options', 'nosniff');
	h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	h.set('X-Frame-Options', 'DENY');
	h.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
	);
	h.set('Cross-Origin-Opener-Policy', 'same-origin');
	if (!dev) h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	if (isAdminArea || event.locals.staff) h.set('Cache-Control', 'private, no-store');
	return response;
};
