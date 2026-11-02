<script lang="ts">
	import Discussion from '#lib/components/ui/Discussion.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import ReportForm from '#lib/components/ui/ReportForm.svelte';
	import SupportButton from '#lib/components/ui/SupportButton.svelte';
	import { plural, shortDate } from '#lib/format.ts';
	import { formState } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const p = $derived(data.post);
	const minutes = $derived(Math.max(1, Math.round(p.words / 220)));
	const f = $derived(formState(form));
</script>

<svelte:head>
	<title>{p.title} | Campusphere</title>
	<meta name="description" content={p.excerpt} />
</svelte:head>

<a class="back" href="/blog"><Icon name="back" size={18} />All posts</a>

<article class="art">
	{#if data.posted === 'published'}
		<p class="flash ok mb-6" role="status">Your post is published. Thank you for sharing.</p>
	{:else if data.posted === 'pending' || (p.status === 'pending' && p.isAuthor)}
		<p class="flash ok mb-6" role="status">
			Thanks. A moderator will review this post before it appears. Only you can see it for now.
		</p>
	{:else if p.status !== 'published'}
		<p class="flash bad mb-6" role="status">This post is not visible to the public.</p>
	{/if}
	{#if f?.message && !f.form}<p class="flash bad mb-6" role="alert">{f.message}</p>{/if}

	{#if p.isOfficial}<span class="official">Official post</span>{/if}
	<h1 class="disp">{p.title}</h1>
	<div class="byline">
		<span>Posted by <b>{p.byline}</b></span>
		<time datetime={new Date(p.createdAt).toISOString()}>{shortDate(p.createdAt)}</time>
		<span>{minutes} min read</span>
		{#if p.categoryName}<span>{p.categoryName}</span>{/if}
	</div>

	{#if p.coverImage}
		<img class="cover" src="/media/{p.coverImage}" alt="" />
	{/if}

	<div class="body">
		{#if data.statement}
			{#if data.statement.vision}
				<h2 class="first">Vision</h2>
				<blockquote>{data.statement.vision}</blockquote>
			{/if}
			{#if data.statement.mission}
				<h2>Mission</h2>
				<p>{data.statement.mission}</p>
			{/if}
			<h2>Core values</h2>
			<ul class="vrows">
				{#each data.statement.values as v (v.name)}
					<li class:sv={v.focus}><b>{v.name}</b><span>{v.text}</span></li>
				{/each}
			</ul>
			<!-- Sanitized server-side from the post's remaining Markdown sections. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html data.statement.restHtml}
		{:else}
			<!-- bodyHtml is rendered from Markdown and sanitized server-side (src/lib/server/sanitize.ts). -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html p.bodyHtml}
		{/if}
	</div>

	{#if data.tags.length}
		<p class="tags">
			Tags:
			{#each data.tags as tg, i (tg.slug)}<a href="/blog?tag={tg.slug}">{tg.name}</a>{i <
				data.tags.length - 1
					? ', '
					: ''}{/each}
		</p>
	{/if}

	<div class="react">
		{#if p.status === 'published'}
			<SupportButton
				action="?/react"
				id={p.id}
				supported={p.liked}
				count={p.likeCount}
				verb="Like"
				done="Liked"
				extra={{ targetType: 'post' }}
				label={p.title}
			/>
		{/if}
		<span>{plural(p.commentCount, 'comment')}</span>
		<span class="flex-1"></span>
		{#if data.canEdit}
			<a class="lk" href="/blog/{p.slug}/edit">Edit</a>
			<form method="POST" action="?/deleteOwn">
				<button
					class="lk"
					type="submit"
					onclick={(e) => {
						if (!confirm('Delete this post? This cannot be undone.')) e.preventDefault();
					}}>Delete</button
				>
			</form>
		{:else if !p.isAuthor && !p.isOfficial}
			<ReportForm targetType="post" targetId={p.id} label="Report this post" />
		{/if}
	</div>
	{#if data.canEdit}
		<p class="hint">
			You can edit or delete your post for {data.editWindow} minutes after posting.
		</p>
	{/if}

	<Discussion
		comments={data.comments}
		total={p.commentCount}
		intro={p.commentCount ? 'Comments are anonymous.' : 'No comments yet. Share your thoughts.'}
		placeholder="Share your thoughts"
		allowComments={p.status === 'published'}
	/>
</article>

<style>
	.art {
		max-width: 780px;
		margin: 0 auto;
		padding-top: 6px;
	}
	.official {
		display: inline-block;
		font-size: 14px;
		font-weight: 700;
		color: var(--red-d);
		border-bottom: 2px solid var(--red);
		padding-bottom: 2px;
	}
	h1 {
		font-size: clamp(40px, 5vw, 78px);
		line-height: 0.95;
		margin: 18px 0;
		overflow-wrap: anywhere;
	}
	.byline {
		display: flex;
		gap: 8px 22px;
		color: var(--muted);
		font-size: 15px;
		flex-wrap: wrap;
	}
	.byline b {
		color: var(--ink);
	}
	.cover {
		margin-top: 28px;
		border-radius: 22px;
		width: 100%;
		max-height: 420px;
		object-fit: cover;
		border: 1px solid var(--line);
	}
	.body {
		margin-top: 36px;
		font-family: var(--font-serif);
		font-size: 21px;
		line-height: 1.78;
		color: #33252a;
		overflow-wrap: anywhere;
	}
	.body :global(p) {
		margin: 0 0 1.1em;
	}
	.body :global(h2),
	.body :global(h3) {
		font-family: var(--font-display);
		font-weight: 700;
		letter-spacing: -0.04em;
		font-size: 36px;
		line-height: 1.05;
		margin: 52px 0 14px;
		color: var(--ink);
	}
	.body :global(h3) {
		font-size: 28px;
	}
	.body :global(h2.first) {
		margin-top: 34px;
	}
	.body :global(blockquote) {
		border-left: 4px solid var(--red);
		padding: 4px 0 4px 26px;
		margin: 6px 0 1.1em;
		font-size: 30px;
		line-height: 1.35;
		color: var(--ink);
		font-family: var(--font-display);
		font-weight: 700;
		letter-spacing: -0.03em;
	}
	.body :global(ul),
	.body :global(ol) {
		margin: 0 0 1.1em 1.2em;
		list-style: disc;
	}
	.body :global(ol) {
		list-style: decimal;
	}
	.body :global(a) {
		color: var(--red-d);
		text-decoration: underline;
	}
	.body :global(code) {
		font-size: 0.85em;
		background: var(--tint);
		padding: 1px 6px;
		border-radius: 6px;
	}
	.vrows {
		margin: 10px 0 0 !important;
		border-top: 1px solid var(--line);
		list-style: none !important;
	}
	.vrows li {
		display: grid;
		grid-template-columns: 190px 1fr;
		gap: 20px;
		align-items: baseline;
		padding: 16px 0;
		border-bottom: 1px solid var(--line);
	}
	.vrows b {
		font-family: var(--font-display);
		font-size: 26px;
		letter-spacing: -0.04em;
		color: var(--ink);
	}
	.vrows span {
		font-family: var(--font-sans);
		font-size: 17px;
		color: var(--muted);
		line-height: 1.5;
	}
	.vrows li.sv {
		background: var(--red);
		color: #fff;
		border-radius: 16px;
		border: 0;
		padding: 20px 22px;
		margin: 8px -22px;
	}
	.vrows li.sv b {
		color: #fff;
	}
	.vrows li.sv span {
		color: #fff1ee;
	}
	.tags {
		margin-top: 24px;
		font-size: 15px;
		color: var(--muted);
	}
	.tags a {
		color: var(--red-d);
		font-weight: 600;
	}
	.react {
		margin-top: 44px;
		padding-top: 22px;
		border-top: 1px solid var(--line);
		display: flex;
		align-items: center;
		gap: 16px;
		font-size: 15px;
		color: var(--muted);
		flex-wrap: wrap;
	}
	.hint {
		margin-top: 8px;
		font-size: 14px;
		color: var(--muted);
	}
	@media (max-width: 1100px) {
		.vrows li {
			grid-template-columns: 1fr;
			gap: 4px;
		}
		.vrows li.sv {
			margin: 8px 0;
		}
		.body {
			font-size: 19px;
		}
	}
</style>
