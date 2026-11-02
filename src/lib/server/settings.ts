import { db, t } from './db/index.ts';
import { DEFAULT_SETTINGS, type Settings } from './settings-defaults.ts';

let cache: { at: number; value: Settings } | undefined;
const TTL_MS = 30_000;

export async function getSettings(): Promise<Settings> {
	if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
	const rows = await db().select().from(t.setting);
	const value = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
	for (const r of rows) if (r.key in DEFAULT_SETTINGS) value[r.key] = r.value;
	cache = { at: Date.now(), value: value as Settings };
	return cache.value;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
	await db()
		.insert(t.setting)
		.values({ key, value })
		.onConflictDoUpdate({ target: t.setting.key, set: { value } });
	cache = undefined;
}
