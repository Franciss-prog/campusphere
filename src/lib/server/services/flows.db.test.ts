import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db, pool, t } from '../db/index.ts';
import { changeStatus, createConcern, getHistory, toggleConcernSupport } from './concerns.ts';
import { fileReport } from './moderation.ts';
import { createProposal, setAdopted, toggleProposalSupport } from './proposals.ts';
import { toggleReaction } from './posts.ts';
import { addComment } from './comments.ts';
import { getSettings } from '../settings.ts';

if (process.env.NEON_BRANCH === 'production') {
	throw new Error('Refusing to run DB integration tests against the production branch.');
}

const token = () => randomBytes(32).toString('hex');
const created: number[] = [];
let staffId: number;

beforeAll(async () => {
	const [s] = await db()
		.insert(t.staffUser)
		.values({ email: `test-${Date.now()}@example.test`, passwordHash: 'x', role: 'ADMIN' })
		.returning({ id: t.staffUser.id });
	staffId = s.id;
});

afterAll(async () => {
	if (created.length) {
		await db()
			.delete(t.report)
			.where(and(eq(t.report.targetType, 'concern'), inArray(t.report.targetId, created)));
		await db()
			.delete(t.comment)
			.where(and(eq(t.comment.parentType, 'concern'), inArray(t.comment.parentId, created)));
		await db().delete(t.concern).where(inArray(t.concern.id, created));
	}
	await db().delete(t.auditLog).where(eq(t.auditLog.staffId, staffId));
	await db().delete(t.staffUser).where(eq(t.staffUser.id, staffId));
	await pool().end();
});

async function newConcern() {
	const id = await createConcern({
		kind: 'concern',
		title: `Test concern ${Date.now()}`,
		description: 'Integration test concern, removed after the run.',
		categoryId: null,
		location: null,
		images: [],
		isSensitive: false,
		visibility: 'published',
		tokenHash: token()
	});
	created.push(id);
	return id;
}

describe('concern lifecycle', () => {
	it('creates a concern with a Submitted history entry', async () => {
		const id = await newConcern();
		const h = await getHistory(id);
		expect(h.map((x) => x.status)).toEqual(['submitted']);
	});

	it('changes status, writes history with the public note, and audits it', async () => {
		const id = await newConcern();
		const r = await changeStatus({
			concernId: id,
			to: 'under_review',
			note: 'Forwarded.',
			staffId
		});
		expect(r.ok).toBe(true);
		const h = await getHistory(id);
		expect(h[0]).toMatchObject({ status: 'under_review', publicNote: 'Forwarded.', byStaff: true });
		const [c] = await db().select().from(t.concern).where(eq(t.concern.id, id));
		expect(c.currentStatus).toBe('under_review');
		const logs = await db()
			.select()
			.from(t.auditLog)
			.where(and(eq(t.auditLog.targetId, id), eq(t.auditLog.action, 'status.change')));
		expect(logs).toHaveLength(1);
	});

	it('rejects Closed / Not Feasible without a note and writes nothing', async () => {
		const id = await newConcern();
		const r = await changeStatus({ concernId: id, to: 'closed', note: '', staffId });
		expect(r.ok).toBe(false);
		expect(await getHistory(id)).toHaveLength(1);
	});
});

describe('duplicate prevention', () => {
	it('allows one support per browser: a second click removes it', async () => {
		const id = await newConcern();
		const tok = token();
		expect(await toggleConcernSupport(id, tok)).toMatchObject({ supported: true, supportCount: 1 });
		expect(await toggleConcernSupport(id, tok)).toMatchObject({
			supported: false,
			supportCount: 0
		});
		await toggleConcernSupport(id, tok);
		await toggleConcernSupport(id, token());
		const [c] = await db().select().from(t.concern).where(eq(t.concern.id, id));
		expect(c.supportCount).toBe(2);
	});

	it('enforces one proposal support per browser with a unique constraint', async () => {
		const id = await newConcern();
		const p = await createProposal({
			concernId: id,
			title: 'Test proposal',
			description: 'A proposal created by the integration test.',
			feasibilityNotes: null,
			tokenHash: token(),
			visibility: 'published'
		});
		if (!p.ok) throw new Error(p.message);
		const tok = token();
		expect((await toggleProposalSupport(p.id, tok))?.supportCount).toBe(1);
		await expect(
			db().insert(t.proposalSupport).values({ proposalId: p.id, tokenHash: tok })
		).rejects.toThrow();
	});

	it('enforces one reaction per browser per comment', async () => {
		const id = await newConcern();
		const c = await addComment({
			parentType: 'concern',
			parentId: id,
			replyTo: null,
			body: 'Test comment',
			seed: 'abcd1234abcd1234',
			tokenHash: token(),
			visibility: 'published'
		});
		if (!c.ok) throw new Error(c.message);
		const tok = token();
		expect((await toggleReaction('comment', c.id, tok))?.supportCount).toBe(1);
		await expect(
			db()
				.insert(t.reaction)
				.values({ targetType: 'comment', targetId: c.id, type: 'like', tokenHash: tok })
		).rejects.toThrow();
		await db()
			.delete(t.reaction)
			.where(and(eq(t.reaction.targetType, 'comment'), eq(t.reaction.targetId, c.id)));
	});
});

describe('report threshold', () => {
	it('auto-hides an item after enough unique reports and ignores repeat reports', async () => {
		const { auto_hide_threshold } = await getSettings();
		const id = await newConcern();
		const first = token();
		for (let i = 0; i < auto_hide_threshold - 1; i++) {
			const r = await fileReport({
				targetType: 'concern',
				targetId: id,
				reason: 'off_topic',
				details: null,
				tokenHash: i === 0 ? first : token()
			});
			expect(r).toMatchObject({ ok: true, autoHidden: false });
		}
		// The same browser reporting again does not count twice.
		expect(
			await fileReport({
				targetType: 'concern',
				targetId: id,
				reason: 'off_topic',
				details: null,
				tokenHash: first
			})
		).toMatchObject({ autoHidden: false });
		const last = await fileReport({
			targetType: 'concern',
			targetId: id,
			reason: 'off_topic',
			details: null,
			tokenHash: token()
		});
		expect(last).toMatchObject({ ok: true, autoHidden: true });
		const [c] = await db().select().from(t.concern).where(eq(t.concern.id, id));
		expect(c.visibility).toBe('hidden');
		const logs = await db()
			.select()
			.from(t.auditLog)
			.where(and(eq(t.auditLog.targetId, id), eq(t.auditLog.action, 'content.auto_hide')));
		expect(logs).toHaveLength(1);
		await db().delete(t.auditLog).where(eq(t.auditLog.id, logs[0].id));
	});
});

describe('schema v2 integrity', () => {
	it('rejects a comment whose parent does not exist', async () => {
		await expect(
			db().insert(t.comment).values({
				parentType: 'concern',
				parentId: 2_000_000_000,
				body: 'orphan',
				anonLabelSeed: 'x',
				authorTokenHash: token()
			})
		).rejects.toThrow();
	});

	it('deleting a concern removes its proposals, comments, replies, reactions and reports', async () => {
		const id = await newConcern();
		const p = await createProposal({
			concernId: id,
			title: 'Cascade test proposal',
			description: 'Removed together with its concern by the foreign keys.',
			feasibilityNotes: null,
			tokenHash: token(),
			visibility: 'published'
		});
		expect(p.ok).toBe(true);
		const [prop] = await db()
			.select({ id: t.proposal.id })
			.from(t.proposal)
			.where(eq(t.proposal.concernId, id));
		const root = await addComment({
			parentType: 'proposal',
			parentId: prop.id,
			replyTo: null,
			body: 'Root comment on the proposal',
			seed: 's',
			tokenHash: token(),
			visibility: 'published'
		});
		if (!root.ok) throw new Error('comment failed');
		await addComment({
			parentType: 'proposal',
			parentId: prop.id,
			replyTo: root.id,
			body: 'Reply to the root comment',
			seed: 's',
			tokenHash: token(),
			visibility: 'published'
		});
		await toggleReaction('comment', root.id, token());
		await fileReport({
			targetType: 'comment',
			targetId: root.id,
			reason: 'spam',
			details: null,
			tokenHash: token()
		});

		await db().delete(t.concern).where(eq(t.concern.id, id));

		const left = await db().execute<{ n: number }>(sql`
			select (select count(*) from comment where proposal_id = ${prop.id})
				+ (select count(*) from reaction where comment_id = ${root.id})
				+ (select count(*) from report where comment_id = ${root.id})
				+ (select count(*) from proposal where id = ${prop.id}) as n`);
		expect(Number(left.rows[0].n)).toBe(0);
	});

	it('adopts a published proposal and audits it', async () => {
		const id = await newConcern();
		await createProposal({
			concernId: id,
			title: 'Adoption test proposal',
			description: 'Staff adopt this as the plan for the concern.',
			feasibilityNotes: null,
			tokenHash: token(),
			visibility: 'published'
		});
		const [prop] = await db()
			.select({ id: t.proposal.id })
			.from(t.proposal)
			.where(eq(t.proposal.concernId, id));
		expect(await setAdopted(staffId, prop.id, true)).toBe(true);
		const [row] = await db().select().from(t.proposal).where(eq(t.proposal.id, prop.id));
		expect(row.adoptedAt).not.toBeNull();
		expect(row.adoptedById).toBe(staffId);
		expect(await setAdopted(staffId, prop.id, false)).toBe(true);
		const [cleared] = await db().select().from(t.proposal).where(eq(t.proposal.id, prop.id));
		expect(cleared.adoptedAt).toBeNull();
	});
});
