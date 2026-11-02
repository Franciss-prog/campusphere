import { hash, verify } from '@node-rs/argon2';

// argon2id (the library default) with OWASP-recommended minimums.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
	return hash(password, OPTIONS);
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
	try {
		return await verify(stored, password);
	} catch {
		return false;
	}
}

/** Same rule on invite, reset and seed. */
export function passwordProblem(password: string): string | null {
	if (password.length < 12) return 'Use at least 12 characters.';
	if (password.length > 200) return 'Use at most 200 characters.';
	return null;
}
