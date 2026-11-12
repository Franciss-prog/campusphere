import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db, pool, t } from '../db/index.ts';
import { createConcern } from './concerns.ts';
import { createPost } from './posts.ts';
import { campaignContent, campaignProgress, campaignTagIds } from './campaigns.ts';

if (process.env.NEON_BRANCH === 'production') {
	throw new Error('Refusing to run DB integration tests against the production branch.');
}

// A throwaway tag stands in for a campaign tag, so the test never touches the real ones.
const slug = `test-campaign-${randomBytes(4).toString('hex')}`;
const missing = `test-missing-${randomBytes(4).toString('hex')}`;
const concernIds: number[] = [];
const postIds: number[] = [];
let tagId: number;

async function concern(kind: 'concern' | 'recommendation', visibility: 'published' | 'pending') {
	const id = await createConcern({
		kind,
		title: `Campaign test ${kind} ${Date.now()}`,
		description: 'Integration test item, removed after the run.',
		categoryId: null,
		location: null,
		images: [],
		isSensitive: false,
		visibility,
		tokenHash: randomBytes(32).toString('hex'),
		tagIds: [tagId]
	});
	concernIds.push(id);
	return id;
}

beforeAll(async () => {
	const [tag] = await db()
		.insert(t.tag)
		.values({ name: 'Test campaign', slug })
		.returning({ id: t.tag.id });
	tagId = tag.id;
	await concern('concern', 'published');
	const resolved = await concern('concern', 'published');
	await db().update(t.concern).set({ currentStatus: 'resolved' }).where(eq(t.concern.id, resolved));
	await concern('recommendation', 'published');
	await concern('concern', 'pending'); // not counted
	for (const visibility of ['published', 'pending'] as const) {
		const p = await createPost({
			title: `Campaign test article ${visibility}`,
			bodyMd: 'Integration test article, removed after the run.',
			categoryId: null,
			coverImage: null,
			tagIds: [tagId],
			visibility,
			tokenHash: randomBytes(32).toString('hex')
		});
		postIds.push(p.id);
	}
});

afterAll(async () => {
	if (concernIds.length) await db().delete(t.concern).where(inArray(t.concern.id, concernIds));
	if (postIds.length) await db().delete(t.post).where(inArray(t.post.id, postIds));
	if (tagId) await db().delete(t.tag).where(eq(t.tag.id, tagId));
	await pool().end();
});

describe('campaignProgress', () => {
	it('counts only published items linked through the tag', async () => {
		const p = await campaignProgress([slug, missing]);
		expect(p[slug]).toEqual({
			tagExists: true,
			articles: 1,
			concerns: 2,
			recommendations: 1,
			resolved: 1,
			total: 3
		});
	});

	it('returns zeros for a campaign whose tag does not exist', async () => {
		const p = await campaignProgress([missing]);
		expect(p[missing]).toEqual({
			tagExists: false,
			articles: 0,
			concerns: 0,
			recommendations: 0,
			resolved: 0,
			total: 0
		});
		expect(await campaignTagIds([missing])).toEqual({});
	});
});

describe('campaignContent', () => {
	it('lists published items per kind without identifiers', async () => {
		const c = await campaignContent(slug);
		expect(c.articles).toHaveLength(1);
		expect(c.concerns).toHaveLength(2);
		expect(c.recommendations).toHaveLength(1);
		const keys = [...c.articles, ...c.concerns, ...c.recommendations].flatMap(Object.keys);
		expect(keys).not.toContain('authorTokenHash');
		expect(keys).not.toContain('supported');
	});
});
