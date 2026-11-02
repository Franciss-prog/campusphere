// Single source for what is and is not collected. Used on /about and /privacy so they never disagree.
export const NOT_COLLECTED = [
	'Your name, email, or student number',
	'An account or password (visitors never sign in)',
	'Your raw IP address',
	'Location data or other metadata inside photos (removed on upload)',
	'Analytics, advertising, or tracking cookies'
];

export const KEPT = [
	'A random token in an httpOnly cookie in your browser. The server stores only a keyed hash of it, so you can edit your own post for a short time and cannot support the same item twice.',
	'A keyed hash of your network address that changes every day, kept briefly to limit spam. It cannot be turned back into your address.',
	'What you post: the text, photos (re-encoded), category, and time.',
	'Reports you send, linked to your hashed token so the same browser cannot report one item many times.',
	'An audit log of every staff action (moderation and status changes).'
];
