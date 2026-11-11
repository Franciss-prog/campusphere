// Seeds taxonomy, default settings, the pinned official post, and sample content.
//
//   bun run db:seed            insert (refuses if sample content already exists)
//   bun run db:seed --reset    delete previous sample content (source = 'seed') first
//   bun run db:seed --base     only taxonomy, settings and the official post (no sample content)
//   bun run db:seed --limit=5  only the first 5 sample concerns and up to 5 sample posts
//   bun run db:seed --concerns-only   concerns (status history, tags, supports) without proposals,
//                                     comments, blog posts or reports
//   bun run db:seed --no-supports     sample items start with 0 supports and likes (no fake voters)
//   bun run db:seed --remove   delete sample content and stop (base data is kept)
//
// Refuses to run against the Neon `production` branch unless --allow-production is passed.
import { randomBytes } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { createDb } from '../src/lib/server/db/client.ts';
import * as t from '../src/lib/server/db/schema.ts';
import { labelSeed } from '../src/lib/server/anon-core.ts';
import { excerptOf, renderMarkdown } from '../src/lib/server/sanitize.ts';
import { STATUSES, type ConcernStatus } from '../src/lib/status.ts';
import { DEFAULT_SETTINGS } from '../src/lib/server/settings-defaults.ts';

const args = new Set(process.argv.slice(2));
const limitArg = [...args].find((a) => a.startsWith('--limit='));
const CONCERNS_ONLY = args.has('--concerns-only');
const NO_SUPPORTS = args.has('--no-supports');
/** Sample support/like count, or 0 with --no-supports. */
const votes = (n: number) => (NO_SUPPORTS ? 0 : n);
const LIMIT = limitArg ? Math.max(1, Number(limitArg.slice(8)) || 1) : Infinity;
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set (run `neon env pull`)');
if (process.env.NEON_BRANCH === 'production' && !args.has('--allow-production')) {
	throw new Error('Refusing to seed the production branch. Pass --allow-production to override.');
}
const SECRET = process.env.ANON_SECRET ?? randomBytes(32).toString('hex');

const { pool, db } = createDb(url, 2);

const DAY = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000);
const fakeToken = () => randomBytes(32).toString('base64url');
const fakeHash = () => randomBytes(32).toString('hex');
const fakeVoters = (n: number) => Array.from({ length: n }, fakeHash);

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------
const CONCERN_CATEGORIES = [
	['Facilities', 'facilities', 'Buildings, rooms, utilities, and grounds.'],
	['Services', 'services', 'Canteen, library, clinic, offices, and other campus services.'],
	['Academic process', 'academic-process', 'Enrollment, clearance, schedules, and records.'],
	['Accessibility', 'accessibility', 'Access for people with disabilities or limited mobility.'],
	['Other', 'other', 'Anything that does not fit the categories above.']
] as const;

const BLOG_CATEGORIES = [
	['Stories', 'story', 'Personal experiences from campus life.'],
	['Guides', 'guide', 'Practical how-tos for students and faculty.'],
	['Announcements', 'announcement', 'Official announcements from the campus.'],
	['Campus news', 'campus-news', 'What is happening around campus.']
] as const;

const TAGS = ['library', 'wifi', 'enrollment', 'canteen', 'safety', 'lighting', 'ramps', 'water'];

async function seedBase() {
	await db
		.insert(t.category)
		.values(
			CONCERN_CATEGORIES.map(([name, slug, description], i) => ({
				name,
				slug,
				description,
				type: 'concern' as const,
				sort: i,
				isFallback: slug === 'other'
			}))
		)
		.onConflictDoNothing();
	await db
		.insert(t.category)
		.values(
			BLOG_CATEGORIES.map(([name, slug, description], i) => ({
				name,
				slug,
				description,
				type: 'blog' as const,
				sort: i
			}))
		)
		.onConflictDoNothing();
	await db
		.insert(t.tag)
		.values(TAGS.map((name) => ({ name, slug: name })))
		.onConflictDoNothing();
	await db
		.insert(t.setting)
		.values(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })))
		.onConflictDoNothing();

	const officialSlug = 'our-university-vision-mission-and-core-values';
	const existing = await db.query.post.findFirst({ where: eq(t.post.slug, officialSlug) });
	if (!existing) {
		const announcement = await db.query.category.findFirst({
			where: and(eq(t.category.type, 'blog'), eq(t.category.slug, 'announcement'))
		});
		await db.insert(t.post).values({
			slug: officialSlug,
			title: 'Our university: vision, mission, and core values',
			excerpt:
				'The purpose behind every improvement we ask for on campus, and where Campusphere fits in.',
			bodyMd: OFFICIAL_POST,
			bodyHtml: renderMarkdown(OFFICIAL_POST),
			categoryId: announcement?.id ?? null,
			isOfficial: true,
			isPinned: true,
			source: 'official',
			createdAt: ago(13)
		});
	}
	console.log('Base data ready: categories, tags, settings, official post.');
}

const OFFICIAL_POST = `## Vision

> A premier national university that develops leaders in the global knowledge economy.

## Mission

A university committed to producing leaders by providing a 21st century learning environment through innovations in education, multidisciplinary research, and community and industry partnerships in order to nurture the spirit of nationhood, propel the national economy, and engage the world for sustainable development.

## Core values

- **Patriotism**: Responsibility toward the university community.
- **Service**: Collaboration and assistance among campus members. This is the value Campusphere is built on.
- **Integrity**: Honest reporting and transparent progress updates.
- **Resilience**: Developing solutions to overcome campus challenges.
- **Excellence**: Supporting continuous improvement of campus services.
- **Faith**: Compassion, respect, and responsibility.

## Why it matters here

A better campus is not built by one person. It is built by a community willing to contribute. Campusphere turns individual concerns into shared improvement, one honest report and one useful idea at a time.
`;

// ---------------------------------------------------------------------------
// Sample content (source = 'seed', removable with --reset)
// ---------------------------------------------------------------------------
type SampleConcern = {
	kind: 'concern' | 'recommendation';
	title: string;
	description: string;
	category: string;
	location?: string;
	status: ConcernStatus;
	days: number;
	supports: number;
	tags?: string[];
	notes?: Partial<Record<ConcernStatus, string>>;
	proposals?: { title: string; description: string; feasibility?: string; supports: number }[];
	comments?: string[];
};

const CONCERNS: SampleConcern[] = [
	{
		kind: 'concern',
		title: 'Fix the leaking roof at the main building',
		description:
			'The roof above the second floor corridor has been leaking for weeks. Water collects on the floor whenever it rains, and it is slippery between classes. Please check it before someone gets hurt.',
		category: 'facilities',
		location: 'Main building, second floor corridor',
		status: 'in_progress',
		days: 9,
		supports: 36,
		tags: ['safety', 'water'],
		notes: {
			under_review: 'Forwarded to the responsible office for assessment.',
			in_discussion: 'Students shared photos and proposed solutions below.',
			action_planned: 'Repair scheduled for the coming week.',
			in_progress: 'A contractor is on site. The most damaged section is being covered first.'
		},
		proposals: [
			{
				title: 'Patch the damaged section now, then schedule a full re-roofing',
				description: 'Stops the leak this month and gives the office time to budget a proper fix.',
				feasibility: 'Patch materials are on hand; re-roofing needs next year’s budget.',
				supports: 41
			},
			{
				title: 'Put out buckets and warning signs in the meantime',
				description: 'A low-cost stopgap so nobody slips while repairs are planned.',
				supports: 18
			}
		],
		comments: [
			'It dripped on my notes again today. A temporary cover would already help a lot.',
			'Agree. I saw workers up there this morning, so it looks like it is moving.',
			'The same corridor flooded last year. A full fix would be better than another patch.'
		]
	},
	{
		kind: 'concern',
		title: 'Brighter lighting along the back walkway',
		description:
			'The path behind the science building is very dark after evening classes. Several lamps are out and the rest are dim.',
		category: 'facilities',
		location: 'Behind the science building',
		status: 'in_progress',
		days: 7,
		supports: 57,
		tags: ['lighting', 'safety'],
		notes: {
			action_planned: 'Lamp replacement approved.',
			in_progress: 'New lamps being installed.'
		},
		proposals: [
			{
				title: 'Install solar lamps along the walkway',
				description: 'No wiring needed, and they can be added before the next term.',
				supports: 38
			}
		],
		comments: ['Please also check the stairs near the gate. Same problem there.']
	},
	{
		kind: 'concern',
		title: 'Add a ramp at the old gym entrance',
		description:
			'The current steps are too steep for wheelchairs and for anyone carrying equipment.',
		category: 'accessibility',
		location: 'Old gym',
		status: 'action_planned',
		days: 6,
		supports: 31,
		tags: ['ramps'],
		notes: { action_planned: 'Design for a ramp with handrails is being prepared.' },
		proposals: [
			{
				title: 'Build a ramp on the east side where there is more space',
				description: 'The east side has room for a gentle slope without blocking the door.',
				supports: 19
			}
		]
	},
	{
		kind: 'concern',
		title: 'Wi-Fi drops in the third floor rooms',
		description:
			'The connection cuts out every few minutes in the third floor classrooms, which makes online quizzes hard.',
		category: 'facilities',
		location: 'Third floor classrooms',
		status: 'in_discussion',
		days: 8,
		supports: 40,
		tags: ['wifi'],
		proposals: [
			{
				title: 'Add an access point in the third floor corridor',
				description: 'Most dropouts happen far from the current router.',
				supports: 22
			}
		],
		comments: ['Room 304 is the worst. It is fine near the stairs.']
	},
	{
		kind: 'concern',
		title: 'Faster clearance process at the end of the term',
		description:
			'Students line up for hours across several offices to get one signature each. A single checklist would help.',
		category: 'academic-process',
		location: 'Registrar area',
		status: 'submitted',
		days: 1,
		supports: 22,
		tags: ['enrollment']
	},
	{
		kind: 'concern',
		title: 'Clearer posting of class schedules',
		description:
			'Room changes are posted late and only on one bulletin board. Many students go to the wrong room.',
		category: 'academic-process',
		location: 'Bulletin boards',
		status: 'in_discussion',
		days: 10,
		supports: 19
	},
	{
		kind: 'concern',
		title: 'Repair the broken water fountain',
		description: 'The fountain near the covered court has not worked for a month.',
		category: 'facilities',
		location: 'Covered court',
		status: 'resolved',
		days: 24,
		supports: 33,
		tags: ['water'],
		notes: { resolved: 'The fountain was repaired and tested. Thank you for reporting it.' }
	},
	{
		kind: 'concern',
		title: 'Shuttle service between the campus and the town proper',
		description: 'Many students walk a long way after evening classes. A shuttle would help.',
		category: 'services',
		status: 'closed',
		days: 30,
		supports: 14,
		notes: {
			closed:
				'Not feasible this year: transport services are outside the campus budget. The concern was shared with the local transport office.'
		}
	},
	{
		kind: 'recommendation',
		title: 'More shaded areas in the library',
		description: 'It gets too hot when studying at the library, especially in the afternoon.',
		category: 'facilities',
		location: 'Library',
		status: 'under_review',
		days: 2,
		supports: 28,
		tags: ['library'],
		notes: { under_review: 'Forwarded to the library and facilities offices.' },
		proposals: [
			{
				title: 'Add trees and a shaded bench area outside the east entrance',
				description: 'Gives students a cool place to read and costs little.',
				supports: 27
			}
		]
	},
	{
		kind: 'recommendation',
		title: 'Add more study seats in the canteen',
		description: 'There are not enough seats during peak hours.',
		category: 'services',
		location: 'Canteen',
		status: 'resolved',
		days: 5,
		supports: 49,
		tags: ['canteen'],
		notes: { resolved: 'Twelve new tables were added along the east wall.' },
		proposals: [
			{
				title: 'Open the covered court as an overflow study area',
				description: 'Uses space that is empty during lunch, with no construction.',
				supports: 33
			}
		]
	},
	{
		kind: 'recommendation',
		title: 'More outlets in the library reading area',
		description: 'Only two outlets work in the reading area, so laptops run out of battery.',
		category: 'facilities',
		location: 'Library',
		status: 'action_planned',
		days: 4,
		supports: 26,
		tags: ['library']
	},
	{
		kind: 'recommendation',
		title: 'Post the canteen menu online each morning',
		description: 'It would help us plan lunch and reduce the line at the counter.',
		category: 'services',
		status: 'submitted',
		days: 0,
		supports: 6,
		tags: ['canteen']
	}
];

const SAMPLE_POSTS = [
	{
		category: 'guide',
		title: 'Enrollment tips that actually work',
		body: 'Which window to visit first, what to bring, and how to avoid the long line.\n\n## Before you go\n\nPrepare photocopies of your documents and check the posted schedule for your year level.\n\n## On the day\n\nArrive before the windows open and visit the cashier last.',
		days: 3,
		likes: 31
	},
	{
		category: 'story',
		title: 'What I wish I knew in my first semester',
		body: 'Small habits that made my first year easier, from someone who learned the hard way.\n\nAsk questions early, find a quiet study spot, and do not skip the orientation.',
		days: 5,
		likes: 24
	},
	{
		category: 'guide',
		title: 'The best places to study on campus',
		body: 'A list of quiet corners, charging spots, and spaces that are rarely full.\n\n- The second floor of the library before noon\n- The covered court benches after 3 PM\n- The empty rooms on the third floor during lunch',
		days: 9,
		likes: 42
	},
	{
		category: 'story',
		title: 'Why the canteen line is slowest on Fridays',
		body: 'I counted for three weeks. Here is what I found and what might help.\n\nMost of the delay comes from a single payment counter. A second counter at peak times would cut the wait in half.',
		days: 12,
		likes: 27
	}
];

async function seedSample() {
	const cats = await db.select().from(t.category);
	const catId = (type: 'blog' | 'concern', slug: string) =>
		cats.find((c) => c.type === type && c.slug === slug)?.id ?? null;
	const tags = await db.select().from(t.tag);
	const tagId = (slug: string) => tags.find((x) => x.slug === slug)!.id;

	const concerns = CONCERNS.slice(0, LIMIT);
	const posts = CONCERNS_ONLY ? [] : SAMPLE_POSTS.slice(0, LIMIT);
	for (const c of concerns) {
		const created = ago(c.days, 3);
		const path: ConcernStatus[] =
			c.status === 'closed'
				? ['submitted', 'under_review', 'closed']
				: STATUSES.slice(0, STATUSES.indexOf(c.status) + 1);
		const [row] = await db
			.insert(t.concern)
			.values({
				kind: c.kind,
				title: c.title,
				description: c.description,
				categoryId: catId('concern', c.category),
				location: c.location ?? null,
				currentStatus: c.status,
				supportCount: votes(c.supports),
				authorTokenHash: fakeHash(),
				source: 'seed',
				createdAt: created,
				updatedAt: created,
				statusChangedAt: created
			})
			.returning({ id: t.concern.id });
		if (votes(c.supports)) {
			await db
				.insert(t.concernSupport)
				.values(fakeVoters(c.supports).map((tokenHash) => ({ concernId: row.id, tokenHash })));
		}

		// Status history: spread evenly between creation and now.
		const steps = path.length;
		for (const [i, status] of path.entries()) {
			const at = new Date(
				created.getTime() + ((Date.now() - created.getTime()) * i) / Math.max(steps, 1)
			);
			await db.insert(t.statusHistory).values({
				concernId: row.id,
				status,
				publicNote: c.notes?.[status] ?? null,
				createdAt: at
			});
			if (i === steps - 1) {
				await db.update(t.concern).set({ statusChangedAt: at }).where(eq(t.concern.id, row.id));
			}
		}
		if (c.tags?.length) {
			await db
				.insert(t.concernTag)
				.values(c.tags.map((s) => ({ concernId: row.id, tagId: tagId(s) })));
		}
		for (const [i, p] of (CONCERNS_ONLY ? [] : (c.proposals ?? [])).entries()) {
			const [prop] = await db
				.insert(t.proposal)
				.values({
					concernId: row.id,
					title: p.title,
					description: p.description,
					feasibilityNotes: p.feasibility ?? null,
					supportCount: votes(p.supports),
					authorTokenHash: fakeHash(),
					source: 'seed',
					createdAt: ago(Math.max(c.days - 1 - i, 0))
				})
				.returning({ id: t.proposal.id });
			if (votes(p.supports)) {
				await db
					.insert(t.proposalSupport)
					.values(fakeVoters(p.supports).map((tokenHash) => ({ proposalId: prop.id, tokenHash })));
			}
			if (i === 0) {
				await db.insert(t.comment).values({
					parentType: 'proposal',
					parentId: prop.id,
					body: 'This is the most realistic option for this term.',
					anonLabelSeed: labelSeed(SECRET, fakeToken(), `proposal:${prop.id}`),
					authorTokenHash: fakeHash(),
					createdAt: ago(Math.max(c.days - 2, 0))
				});
			}
		}
		for (const [i, body] of (CONCERNS_ONLY ? [] : (c.comments ?? [])).entries()) {
			await db.insert(t.comment).values({
				parentType: 'concern',
				parentId: row.id,
				body,
				anonLabelSeed: labelSeed(SECRET, fakeToken(), `concern:${row.id}`),
				authorTokenHash: fakeHash(),
				createdAt: ago(0, (c.comments!.length - i) * 5)
			});
		}
	}

	for (const p of posts) {
		const [post] = await db
			.insert(t.post)
			.values({
				slug: p.title
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, ''),
				title: p.title,
				excerpt: excerptOf(p.body),
				bodyMd: p.body,
				bodyHtml: renderMarkdown(p.body),
				categoryId: catId('blog', p.category),
				likeCount: votes(p.likes),
				authorTokenHash: fakeHash(),
				source: 'seed',
				createdAt: ago(p.days)
			})
			.returning({ id: t.post.id });
		if (votes(p.likes)) {
			await db.insert(t.reaction).values(
				fakeVoters(p.likes).map((tokenHash) => ({
					targetType: 'post' as const,
					targetId: post.id,
					tokenHash
				}))
			);
		}
	}

	// A few open reports so the moderation queue has something to review.
	const [flagged] = await db
		.select({ id: t.comment.id })
		.from(t.comment)
		.innerJoin(t.concern, eq(t.concern.id, t.comment.parentId))
		.where(and(eq(t.comment.parentType, 'concern'), eq(t.concern.source, 'seed')))
		.limit(1);
	if (flagged && !CONCERNS_ONLY) {
		await db.insert(t.report).values([
			{
				targetType: 'comment',
				targetId: flagged.id,
				reason: 'off_topic',
				reporterTokenHash: fakeHash()
			},
			{
				targetType: 'comment',
				targetId: flagged.id,
				reason: 'spam',
				reporterTokenHash: fakeHash()
			}
		]);
	}

	await recount();
	console.log(`Sample content ready: ${concerns.length} concerns, ${posts.length} posts.`);
}

/** Denormalized counters (comments, proposals) recomputed from rows. */
async function recount() {
	await db.execute(sql`
		update concern c set
			comment_count = (select count(*) from comment m where m.parent_type = 'concern' and m.parent_id = c.id and m.visibility = 'published'),
			proposal_count = (select count(*) from proposal p where p.concern_id = c.id and p.visibility = 'published')`);
	await db.execute(sql`
		update proposal p set
			comment_count = (select count(*) from comment m where m.parent_type = 'proposal' and m.parent_id = p.id and m.visibility = 'published')`);
	await db.execute(sql`
		update post p set
			comment_count = (select count(*) from comment m where m.parent_type = 'post' and m.parent_id = p.id and m.visibility = 'published')`);
}

async function resetSample() {
	// Comments, supports, reactions and reports go with their parent (foreign-key cascade).
	const c = await db
		.delete(t.concern)
		.where(eq(t.concern.source, 'seed'))
		.returning({ id: t.concern.id });
	const p = await db.delete(t.post).where(eq(t.post.source, 'seed')).returning({ id: t.post.id });
	console.log(`Removed sample content: ${c.length} concerns, ${p.length} posts.`);
}

try {
	if (args.has('--remove')) {
		await resetSample();
	} else {
		await seedBase();
	}
	if (!args.has('--base') && !args.has('--remove')) {
		if (args.has('--reset')) await resetSample();
		const [{ n }] = await db
			.select({ n: sql<number>`count(*)::int` })
			.from(t.concern)
			.where(eq(t.concern.source, 'seed'));
		if (n > 0) {
			console.log('Sample content already exists. Use --reset to replace it.');
		} else {
			await seedSample();
		}
	}
} finally {
	await pool.end();
}
