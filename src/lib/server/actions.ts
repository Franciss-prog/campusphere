// Reusable form-action bodies shared by several pages (support toggles, comments, reports,
// proposals). Each validates input, applies the safety guard, and returns plain data or fail().
import { fail, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { threadSeed } from './anon.ts';
import { checkbox, intId, optionalText, parseForm, text } from './forms.ts';
import { guardClick, guardSubmission } from './safety.ts';
import { toggleConcernSupport } from './services/concerns.ts';
import { addComment, isDuplicateComment, type ParentType } from './services/comments.ts';
import { fileReport, REPORT_REASONS } from './services/moderation.ts';
import { createProposal, toggleProposalSupport } from './services/proposals.ts';
import { toggleReaction } from './services/posts.ts';
import { cleanText } from './sanitize.ts';
import { db, t } from './db/index.ts';
import { and, eq, sql } from 'drizzle-orm';

export async function supportConcernAction(event: RequestEvent) {
	const form = await event.request.formData();
	const id = intId.safeParse(form.get('id'));
	if (!id.success) return fail(400, { message: 'Invalid request.' });
	const g = await guardClick(event, 'react');
	if (!g.ok) return g.response;
	const r = await toggleConcernSupport(id.data, g.tokenHash);
	if (!r) return fail(404, { message: 'This concern is no longer available.' });
	return { supported: r.supported, supportCount: r.supportCount };
}

export async function supportProposalAction(event: RequestEvent) {
	const form = await event.request.formData();
	const id = intId.safeParse(form.get('id'));
	if (!id.success) return fail(400, { message: 'Invalid request.' });
	const g = await guardClick(event, 'react');
	if (!g.ok) return g.response;
	const r = await toggleProposalSupport(id.data, g.tokenHash);
	if (!r) return fail(404, { message: 'This proposal is no longer available.' });
	return { supported: r.supported, supportCount: r.supportCount };
}

/** Like on a post, "Helpful" on a comment. */
export async function reactAction(event: RequestEvent) {
	const form = await event.request.formData();
	const id = intId.safeParse(form.get('id'));
	const type = z.enum(['post', 'comment']).safeParse(form.get('targetType'));
	if (!id.success || !type.success) return fail(400, { message: 'Invalid request.' });
	const g = await guardClick(event, 'react');
	if (!g.ok) return g.response;
	const r = await toggleReaction(type.data, id.data, g.tokenHash);
	if (!r) return fail(404, { message: 'This is no longer available.' });
	return r;
}

const commentSchema = z.object({
	body: text('Your comment', 2, 2000),
	replyTo: z.coerce.number().int().positive().optional().catch(undefined),
	thread: z.enum(['concern', 'proposal', 'post']).optional(),
	threadId: z.coerce.number().int().positive().optional()
});

/**
 * Adds a comment. The thread defaults to the page's own item; a form may target a proposal on
 * the same page by sending `thread=proposal&threadId=…` (validated to belong to `allowProposalsOf`).
 */
export async function commentAction(
	event: RequestEvent,
	parentType: ParentType,
	parentId: number,
	allowProposalsOf?: number
) {
	const form = await event.request.formData();
	const parsed = parseForm(commentSchema, form);
	if (!parsed.ok)
		return fail(400, { form: 'comment', errors: parsed.errors, values: parsed.values });
	let pType = parentType;
	let pId = parentId;
	if (parsed.data.thread === 'proposal' && parsed.data.threadId && allowProposalsOf) {
		const [p] = await db()
			.select({ id: t.proposal.id })
			.from(t.proposal)
			.where(
				and(eq(t.proposal.id, parsed.data.threadId), eq(t.proposal.concernId, allowProposalsOf))
			);
		if (!p) return fail(404, { message: 'This proposal is no longer available.' });
		pType = 'proposal';
		pId = p.id;
	}
	const body = cleanText(parsed.data.body);
	const g = await guardSubmission(event, form, {
		bucket: 'comment',
		text: body,
		values: { body }
	});
	if (!g.ok) return g.response;
	if (await isDuplicateComment(g.tokenHash, pType, pId, body)) {
		return fail(400, {
			form: 'comment',
			message: 'You already posted this comment.',
			values: { body }
		});
	}
	const r = await addComment({
		parentType: pType,
		parentId: pId,
		replyTo: parsed.data.replyTo ?? null,
		body,
		seed: threadSeed(g.token, `${pType}:${pId}`),
		tokenHash: g.tokenHash,
		visibility: g.visibility
	});
	if (!r.ok) return fail(400, { form: 'comment', message: r.message, values: { body } });
	return {
		form: 'comment',
		ok: true,
		message:
			g.visibility === 'published'
				? 'Your comment is posted.'
				: 'Thanks. Your comment will appear after a moderator reviews it.'
	};
}

const reportSchema = z.object({
	targetType: z.enum(['post', 'concern', 'proposal', 'comment']),
	targetId: intId,
	reason: z.enum(REPORT_REASONS, { error: 'Choose a reason.' }),
	details: optionalText('Details', 500)
});

export async function reportAction(event: RequestEvent) {
	const form = await event.request.formData();
	const parsed = parseForm(reportSchema, form);
	if (!parsed.ok) {
		return fail(400, {
			form: 'report',
			message: Object.values(parsed.errors)[0] ?? 'Invalid report.'
		});
	}
	const g = await guardClick(event, 'report');
	if (!g.ok) return g.response;
	const r = await fileReport({ ...parsed.data, tokenHash: g.tokenHash });
	if (!r.ok) return fail(404, { form: 'report', message: r.message });
	return {
		form: 'report',
		ok: true,
		message: 'Thanks for the report. A moderator will review it.'
	};
}

const proposalSchema = z.object({
	title: text('Title', 8, 120),
	description: text('Description', 20, 2000),
	feasibilityNotes: optionalText('Feasibility notes', 1000),
	agree: checkbox
});

export async function proposeAction(event: RequestEvent, concernId: number) {
	const form = await event.request.formData();
	const parsed = parseForm(proposalSchema, form);
	if (!parsed.ok)
		return fail(400, { form: 'propose', errors: parsed.errors, values: parsed.values });
	const d = parsed.data;
	const title = cleanText(d.title);
	const description = cleanText(d.description);
	const g = await guardSubmission(event, form, {
		bucket: 'proposal',
		text: `${title}\n${description}\n${d.feasibilityNotes ?? ''}`,
		values: parsed.data
	});
	if (!g.ok) return g.response;
	const [dup] = await db()
		.select({ id: t.proposal.id })
		.from(t.proposal)
		.where(
			and(
				eq(t.proposal.concernId, concernId),
				sql`lower(${t.proposal.title}) = lower(${title})`,
				sql`${t.proposal.createdAt} > now() - interval '1 day'`
			)
		);
	if (dup) {
		return fail(400, {
			form: 'propose',
			message: 'A proposal with this title was just posted. Support it instead.',
			values: parsed.data
		});
	}
	const r = await createProposal({
		concernId,
		title,
		description,
		feasibilityNotes: d.feasibilityNotes ? cleanText(d.feasibilityNotes) : null,
		tokenHash: g.tokenHash,
		visibility: g.visibility
	});
	if (!r.ok) return fail(400, { form: 'propose', message: r.message, values: parsed.data });
	return {
		form: 'propose',
		ok: true,
		message:
			g.visibility === 'published'
				? 'Your proposal is posted.'
				: 'Thanks. Your proposal will appear after a moderator reviews it.'
	};
}
