<script lang="ts">
	import { enhance } from '$app/forms';
	import Banner from '#lib/components/shell/Banner.svelte';
	import { formState } from '#lib/form-state.ts';
	import { timeAgo } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const f = $derived(formState(form));
	const s = $derived(data.selected);
	const key = (q: { targetType: string; targetId: number }) => `${q.targetType}:${q.targetId}`;

	/** Splits text into plain and highlighted parts (links and word-filter hits). No HTML injection. */
	function segments(text: string, words: string[]): { t: string; mark: boolean }[] {
		const parts = [
			'(?:https?:\\/\\/|www\\.)\\S+',
			...words.filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
		];
		const re = new RegExp(`(${parts.join('|')})`, 'gi');
		// With one capture group, split() puts matches at odd indexes.
		return text
			.split(re)
			.map((x, i) => ({ t: x, mark: i % 2 === 1 }))
			.filter((x) => x.t !== '');
	}
	const label = (type: string) =>
		({ concern: 'Concern', proposal: 'Solution proposal', comment: 'Comment', post: 'Blog post' })[
			type
		] ?? type;
</script>

<svelte:head><title>Moderation | Campusphere staff</title></svelte:head>

<Banner
	variant="staff"
	title="Moderation"
	subtitle="Review flagged content. Every action is logged."
/>

{#if f?.message}
	<p class="flash mt-5 {f.ok ? 'ok' : 'bad'}" role="status">{f.message}</p>
{/if}

<div class="split">
	<nav class="q" aria-label="Flagged content">
		<header>
			<h2>Flagged content</h2>
			<span>{data.queue.length} need review</span>
		</header>
		{#each data.queue as q (key(q))}
			<a
				class="qi"
				href="?item={key(q)}"
				aria-current={s && key(s) === key(q) ? 'true' : undefined}
			>
				<div class="k">
					<span>{label(q.targetType)}{q.isSensitive ? ', sensitive' : ''}</span>
					<b
						>{q.reports
							? `${q.reports} ${q.reports === 1 ? 'report' : 'reports'}`
							: 'Held for review'}</b
					>
				</div>
				<p>{q.title}</p>
				<small>{q.reports ? 'Reported' : 'Posted'} {timeAgo(q.lastReportedAt).toLowerCase()}</small>
			</a>
		{:else}
			<p class="none">Nothing to review. The queue is clear.</p>
		{/each}
	</nav>

	<div class="dt">
		{#if s}
			<div class="k">
				<span>{s.context}</span>
				<span>Posted anonymously</span>
				<span
					>Now: {s.visibility === 'published'
						? 'Public'
						: s.visibility === 'hidden'
							? 'Hidden'
							: 'Waiting for review'}</span
				>
				{#if s.contextHref}<a
						class="lk !min-h-0"
						href={s.contextHref}
						target="_blank"
						rel="noopener">Open in context</a
					>{/if}
			</div>
			<h3 class="disp">{s.title}</h3>
			<blockquote class="quote">
				{#each segments(s.body, data.settings.word_filter) as seg, i (i)}{#if seg.mark}<mark
							>{seg.t}</mark
						>{:else}{seg.t}{/if}{/each}
			</blockquote>
			{#if s.isSensitive}
				<p class="notice mt-4">
					<b>Marked as sensitive</b>This may involve safety or harassment. Check whether it should
					go to the proper campus office. Do not publish names of private individuals.
				</p>
			{/if}
			{#if s.reasons.length}
				<div class="reasons">
					<h4>Why it was reported</h4>
					<ul>
						{#each s.reasons as r (r.reason)}<li>
								{r.reason}<span>{r.n} {r.n === 1 ? 'report' : 'reports'}</span>
							</li>{/each}
					</ul>
				</div>
			{/if}

			<div class="acts">
				{#if s.visibility === 'pending'}
					<form method="POST" action="?/approve" use:enhance>
						<input type="hidden" name="targetType" value={s.targetType} /><input
							type="hidden"
							name="targetId"
							value={s.targetId}
						/>
						<button class="btn btn-p" type="submit">Approve and publish</button>
					</form>
				{/if}
				{#if s.visibility !== 'hidden'}
					<form method="POST" action="?/hide" use:enhance>
						<input type="hidden" name="targetType" value={s.targetType} /><input
							type="hidden"
							name="targetId"
							value={s.targetId}
						/>
						<button class={s.visibility === 'pending' ? 'btn btn-o' : 'btn btn-p'} type="submit"
							>Hide content</button
						>
					</form>
				{:else}
					<form method="POST" action="?/restore" use:enhance>
						<input type="hidden" name="targetType" value={s.targetType} /><input
							type="hidden"
							name="targetId"
							value={s.targetId}
						/>
						<button class="btn btn-p" type="submit">Restore content</button>
					</form>
				{/if}
				{#if s.reports > 0}
					<form method="POST" action="?/dismiss" use:enhance>
						<input type="hidden" name="targetType" value={s.targetType} /><input
							type="hidden"
							name="targetId"
							value={s.targetId}
						/>
						<button class="btn btn-o" type="submit">Dismiss reports</button>
					</form>
				{/if}
			</div>

			{#if s.targetType !== 'post'}
				<details class="red">
					<summary class="btn btn-o btn-sm">Redact names</summary>
					<form method="POST" action="?/redact" use:enhance class="mt-3">
						<input type="hidden" name="targetType" value={s.targetType} /><input
							type="hidden"
							name="targetId"
							value={s.targetId}
						/>
						<label for="phrase" class="mb-2 block font-bold">Name or phrase to remove</label>
						<div class="flex flex-wrap gap-2">
							<input
								id="phrase"
								name="phrase"
								class="input max-w-sm"
								required
								placeholder="Copy it exactly as written"
							/>
							<button class="btn btn-d" type="submit">Remove it</button>
						</div>
						<p class="audit">
							It is replaced with "[name removed]". The removed text is not saved in the log.
						</p>
					</form>
				</details>
			{/if}
			<p class="audit">
				Hiding content removes it from the public site right away. You can restore it later. Actions
				are saved to the audit log.
			</p>
		{:else}
			<p class="none">
				{data.queue.length
					? 'Select an item to review it.'
					: 'When people report content, it shows up here.'}
			</p>
		{/if}
	</div>
</div>

<details class="panel settings mt-6">
	<summary class="disp">Moderation settings</summary>
	{#if data.isAdmin}
		<form method="POST" action="?/settings" use:enhance class="mt-5 grid gap-5">
			<label class="fld"
				><span>New content</span>
				<select name="moderation_mode" class="control">
					<option value="post" selected={data.settings.moderation_mode === 'post'}
						>Publish immediately, moderate after</option
					>
					<option value="pre" selected={data.settings.moderation_mode === 'pre'}
						>Hold everything for review first</option
					>
				</select>
			</label>
			<label class="fld"
				><span>Auto-hide after this many unique reports</span>
				<input
					class="control"
					type="number"
					name="auto_hide_threshold"
					min="1"
					max="50"
					value={data.settings.auto_hide_threshold}
				/>
			</label>
			<label class="fld"
				><span>Links allowed before holding for review</span>
				<input
					class="control"
					type="number"
					name="max_links"
					min="0"
					max="20"
					value={data.settings.max_links}
				/>
			</label>
			<label class="fld"
				><span>Minutes authors can edit or delete their post</span>
				<input
					class="control"
					type="number"
					name="edit_window_minutes"
					min="0"
					max="1440"
					value={data.settings.edit_window_minutes}
				/>
			</label>
			<label class="fld"
				><span>Words that send content to review (one per line)</span>
				<textarea class="input" name="word_filter" rows="4"
					>{data.settings.word_filter.join('\n')}</textarea
				>
			</label>
			<div><button class="btn btn-p" type="submit">Save settings</button></div>
		</form>
	{:else}
		<p class="mt-3 text-muted-foreground">
			New content is {data.settings.moderation_mode === 'post'
				? 'published immediately'
				: 'held for review'}, and items are hidden automatically after {data.settings
				.auto_hide_threshold} unique reports. Only administrators can change this.
		</p>
	{/if}
</details>

<style>
	.split {
		margin-top: 24px;
		display: grid;
		grid-template-columns: 400px minmax(0, 1fr);
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 22px;
		overflow: hidden;
		min-height: 560px;
	}
	.q {
		border-right: 1px solid var(--line);
		max-height: 760px;
		overflow-y: auto;
	}
	.q header {
		padding: 20px 22px;
		border-bottom: 1px solid var(--line);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.q h2 {
		font-size: 18px;
		font-weight: 700;
	}
	.q header span {
		font-size: 14px;
		color: var(--muted);
	}
	.qi {
		display: block;
		padding: 18px 22px;
		border-bottom: 1px solid var(--line2);
		transition: background 0.2s;
	}
	.qi:hover {
		background: var(--rose);
	}
	.qi[aria-current='true'] {
		background: var(--rose);
		box-shadow: inset 4px 0 0 var(--red);
	}
	.qi .k {
		font-size: 13px;
		color: var(--faint);
		display: flex;
		justify-content: space-between;
	}
	.qi .k b {
		color: var(--red);
	}
	.qi p {
		margin-top: 5px;
		font-size: 15.5px;
		font-weight: 600;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}
	.qi small {
		display: block;
		margin-top: 5px;
		font-size: 13.5px;
		color: var(--muted);
	}
	.none {
		padding: 22px;
		color: var(--muted);
	}
	.dt {
		padding: 30px 34px;
		min-width: 0;
	}
	.dt .k {
		font-size: 14px;
		color: var(--muted);
		display: flex;
		gap: 6px 18px;
		flex-wrap: wrap;
		align-items: center;
	}
	.dt h3 {
		font-size: 30px;
		line-height: 1.1;
		margin: 12px 0 14px;
		overflow-wrap: anywhere;
	}
	.quote {
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 18px 20px;
		background: var(--rose);
		font-size: 16.5px;
		line-height: 1.6;
		white-space: pre-line;
		overflow-wrap: anywhere;
	}
	.quote mark {
		background: #ffd7d3;
		color: var(--red-d);
		border-radius: 4px;
		padding: 0 3px;
	}
	.reasons {
		margin-top: 22px;
	}
	.reasons h4 {
		font-size: 15px;
		color: var(--muted);
		font-weight: 600;
		margin-bottom: 10px;
	}
	.reasons li {
		list-style: none;
		display: flex;
		justify-content: space-between;
		padding: 10px 0;
		border-bottom: 1px solid var(--line2);
		font-size: 15.5px;
	}
	.reasons li span {
		color: var(--muted);
	}
	.acts {
		margin-top: 28px;
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}
	.red {
		margin-top: 14px;
	}
	.red > summary {
		list-style: none;
	}
	.red > summary::-webkit-details-marker {
		display: none;
	}
	.audit {
		margin-top: 20px;
		font-size: 14px;
		color: var(--muted);
	}
	.settings summary::before {
		content: '+';
		font-family: var(--font-sans);
		font-weight: 500;
		color: var(--red);
		margin-right: 12px;
	}
	.settings[open] summary::before {
		content: '\2212';
	}
	.settings summary {
		list-style: none;
		cursor: pointer;
		font-size: 22px;
		min-height: 44px;
		display: flex;
		align-items: center;
	}
	.fld {
		display: grid;
		grid-template-columns: 320px 1fr;
		gap: 16px;
		align-items: center;
		font-weight: 600;
	}
	.fld .control {
		max-width: 360px;
	}
	@media (max-width: 1100px) {
		.split {
			grid-template-columns: 1fr;
		}
		.q {
			border-right: 0;
			border-bottom: 1px solid var(--line);
			max-height: 360px;
		}
		.dt {
			padding: 22px 18px;
		}
		.fld {
			grid-template-columns: 1fr;
			gap: 6px;
		}
	}
</style>
