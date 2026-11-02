<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { timeAgo } from '#lib/format.ts';
	import FormGuard from './FormGuard.svelte';
	import ReportForm from './ReportForm.svelte';
	import SupportButton from './SupportButton.svelte';

	type C = {
		id: number;
		body: string;
		name: string;
		color: string;
		createdAt: Date;
		mine: boolean;
		pending: boolean;
		helpful: number;
		helpedByMe: boolean;
		replies: C[];
	};

	let {
		comments,
		total,
		heading = 'Discussion',
		intro,
		placeholder = 'Add details or share what you know',
		thread,
		allowComments = true,
		compact = false
	}: {
		comments: C[];
		total: number;
		heading?: string;
		intro?: string;
		placeholder?: string;
		/** Extra hidden fields to target a nested thread (e.g. a proposal). */
		thread?: { type: 'proposal'; id: number };
		allowComments?: boolean;
		/** Nested use (e.g. under a proposal): smaller heading, no section spacing. */
		compact?: boolean;
	} = $props();

	const uid = $props.id();
	let body = $state('');
	let replyTo = $state<{ id: number; name: string } | null>(null);
	let message = $state<{ ok: boolean; text: string } | null>(null);
	let error = $state<string | null>(null);
	let resetKey = $state(0);
	let textarea: HTMLTextAreaElement | undefined = $state();

	async function reply(c: C) {
		replyTo = { id: c.id, name: c.name };
		await tick();
		textarea?.focus();
	}
</script>

<section class={compact ? 'compact' : 'sec'} aria-labelledby="{uid}-h">
	{#if compact}
		<h4 class="sr-only" id="{uid}-h">{heading}</h4>
	{:else}
		<h2 class="disp" id="{uid}-h">{heading}</h2>
	{/if}
	<p class="l">
		{intro ??
			(total === 0
				? 'No comments yet. Start the conversation.'
				: `${total} ${total === 1 ? 'comment' : 'comments'}, all anonymous. Names are never shown.`)}
	</p>

	{#if comments.length}
		<ol class="cm">
			{#each comments as c (c.id)}
				{@render one(c, false)}
				{#each c.replies as r (r.id)}
					{@render one(r, true)}
				{/each}
			{/each}
		</ol>
	{/if}

	{#if allowComments}
		<form
			class="cbox"
			method="POST"
			action="?/comment"
			use:enhance={() =>
				async ({ result, update }) => {
					if (result.type === 'success') {
						message = { ok: true, text: String(result.data?.message ?? 'Posted.') };
						error = null;
						body = '';
						replyTo = null;
						await update({ reset: false });
					} else if (result.type === 'failure') {
						const d = result.data as
							{ errors?: Record<string, string>; message?: string } | undefined;
						error = d?.errors?.body ?? d?.message ?? 'Your comment was not posted.';
						message = null;
					} else {
						await update();
					}
					resetKey++;
				}}
		>
			<FormGuard {resetKey} />
			{#if thread}
				<input type="hidden" name="thread" value={thread.type} />
				<input type="hidden" name="threadId" value={thread.id} />
			{/if}
			{#if replyTo}
				<input type="hidden" name="replyTo" value={replyTo.id} />
				<p class="replying">
					Replying to {replyTo.name}
					<button type="button" class="lk" onclick={() => (replyTo = null)}>Cancel reply</button>
				</p>
			{/if}
			<label for="{uid}-c">Add a comment</label>
			<textarea
				id="{uid}-c"
				name="body"
				bind:value={body}
				bind:this={textarea}
				{placeholder}
				maxlength="2000"
				required
				aria-invalid={error ? 'true' : undefined}
				aria-describedby="{uid}-n"
				class="input"></textarea>
			{#if error}<p class="err" role="alert">{error}</p>{/if}
			{#if message}<p class="flash ok mt-3" role="status">{message.text}</p>{/if}
			<div class="row">
				<span id="{uid}-n"
					>You will appear as a random anonymous name. Please don't include personal details.</span
				>
				<button class="btn btn-p" type="submit">Post comment</button>
			</div>
		</form>
	{/if}
</section>

{#snippet one(c: C, isReply: boolean)}
	<li class="c" class:r={isReply}>
		<div class="w">
			<span class="av" style="--c1:{c.color}" aria-hidden="true">A</span>
			<b>{c.name}</b>
			<time datetime={new Date(c.createdAt).toISOString()}>{timeAgo(c.createdAt)}</time>
			{#if c.mine}<span class="you">You</span>{/if}
		</div>
		<p>{c.body}</p>
		{#if c.pending}<p class="pend">Waiting for a moderator. Only you can see this.</p>{/if}
		<div class="a">
			{#if !c.pending}
				<SupportButton
					action="?/react"
					id={c.id}
					supported={c.helpedByMe}
					count={c.helpful}
					verb="Helpful"
					done="Marked helpful"
					size="text"
					extra={{ targetType: 'comment' }}
				/>
			{/if}
			{#if allowComments && !isReply}
				<button type="button" onclick={() => reply(c)}>Reply</button>
			{/if}
			{#if !c.mine}<ReportForm targetType="comment" targetId={c.id} />{/if}
		</div>
	</li>
{/snippet}

<style>
	.compact .l {
		color: var(--muted);
		font-size: 14.5px;
		margin-bottom: 10px;
	}
	.compact .cbox textarea {
		min-height: 70px;
	}
	.cm {
		list-style: none;
		border-top: 1px solid var(--line);
	}
	.c {
		padding: 20px 0 8px;
		border-bottom: 1px solid var(--line);
	}
	.c.r {
		margin-left: 46px;
	}
	.w {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 14px;
		color: var(--faint);
		flex-wrap: wrap;
	}
	.w b {
		color: var(--ink);
		font-size: 15px;
	}
	.av {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 14px;
		color: #fff;
		background: var(--c1, #c0392b);
	}
	.you {
		font-size: 12.5px;
		font-weight: 700;
		color: var(--red-d);
	}
	.c > p {
		margin: 8px 0 0 46px;
		font-size: 16.5px;
		max-width: 640px;
		white-space: pre-line;
		overflow-wrap: anywhere;
	}
	.c > p.pend {
		font-size: 14px;
		color: var(--muted);
		font-style: italic;
	}
	.a {
		margin: 2px 0 0 46px;
		display: flex;
		gap: 18px;
		font-size: 14px;
		font-weight: 600;
		color: var(--muted);
		flex-wrap: wrap;
	}
	.a > button {
		min-height: 44px;
	}
	.a > button:hover {
		color: var(--red);
	}
	.cbox {
		margin-top: 22px;
	}
	.cbox label {
		display: block;
		font-weight: 700;
		margin-bottom: 8px;
	}
	.cbox textarea {
		min-height: 92px;
	}
	.row {
		margin-top: 12px;
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}
	.row span {
		font-size: 14px;
		color: var(--muted);
		flex: 1;
		min-width: 220px;
	}
	.replying {
		font-size: 14px;
		color: var(--muted);
		margin-bottom: 8px;
		display: flex;
		gap: 12px;
		align-items: center;
	}
	@media (max-width: 640px) {
		.c.r {
			margin-left: 24px;
		}
	}
</style>
