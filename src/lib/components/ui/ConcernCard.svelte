<script lang="ts">
	import { timeAgo, plural } from '#lib/format.ts';
	import type { ConcernStatus } from '#lib/status.ts';
	import StatusPill from './StatusPill.svelte';
	import SupportButton from './SupportButton.svelte';

	let {
		item
	}: {
		item: {
			id: number;
			title: string;
			description: string;
			status: ConcernStatus;
			categoryName: string | null;
			supportCount: number;
			commentCount: number;
			image: string | null;
			createdAt: Date;
			supported: boolean;
		};
	} = $props();
</script>

<article class="card">
	{#if item.image}
		<img class="ph" src="/media/{item.image}" alt="" loading="lazy" width="400" height="150" />
	{/if}
	<div class="b">
		<div class="t"><StatusPill status={item.status} /><span>{item.categoryName ?? ''}</span></div>
		<h3 class="disp"><a href="/concerns/{item.id}" class="stretch">{item.title}</a></h3>
		<p>{item.description}</p>
		<div class="m">
			<time datetime={new Date(item.createdAt).toISOString()}>{timeAgo(item.createdAt)}</time>
			<span>{plural(item.commentCount, 'comment')}</span>
			<span class="sp">
				<SupportButton
					action="?/support"
					id={item.id}
					supported={item.supported}
					count={item.supportCount}
					label={item.title}
				/>
			</span>
		</div>
	</div>
</article>

<style>
	.ph {
		height: 150px;
		width: 100%;
		object-fit: cover;
		background: #fbe3df;
		border-bottom: 1px solid var(--line);
	}
	.b {
		padding: 22px 22px 20px;
		display: flex;
		flex-direction: column;
		flex: 1;
	}
	.t {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		font-size: 13.5px;
		color: var(--muted);
	}
	h3 {
		font-size: 22px;
		line-height: 1.18;
		margin: 14px 0 8px;
	}
	/* Whole card is clickable via the title link; buttons sit above it. */
	.stretch::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 0;
	}
	.stretch:focus-visible {
		outline: none;
	}
	.stretch:focus-visible::after {
		outline: 3px solid var(--red);
		outline-offset: -3px;
		border-radius: 22px;
	}
	p {
		font-size: 15.5px;
		color: var(--muted);
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.m {
		margin-top: auto;
		padding-top: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		font-size: 14px;
		color: var(--muted);
		flex-wrap: wrap;
	}
	.sp {
		margin-left: auto;
		position: relative;
		z-index: 1;
	}
</style>
