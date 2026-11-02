// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			/** HMAC of the anonymous token cookie, or null if this browser never contributed. */
			anonHash: string | null;
			/** Signed-in staff member, or null. */
			staff: { id: number; email: string; role: 'ADMIN' | 'MODERATOR' } | null;
		}
		interface Error {
			message: string;
		}
	}
}

export {};
