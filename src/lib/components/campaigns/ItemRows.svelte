<script lang="ts">
	import StatusPill from '#lib/components/ui/StatusPill.svelte';
	import { timeAgo } from '#lib/format.ts';
	import type { ArticleRow, ConcernRow } from '#lib/campaigns.ts';

	// Compact link rows for feeds: read-only (no support buttons or forms).
	type Props = {
		empty: string;
		emptyAction?: { href: string; label: string };
	} & ({ kind: 'article'; items: ArticleRow[] } | { kind: 'concern'; items: ConcernRow[] });
	let props: Props = $props();
</script>

{#if props.items.length}
	<ul class="rows">
		{#if props.kind === 'article'}
			{#each props.items as a (a.slug)}
				<li>
					<a href="/blog/{a.slug}">
						<b>{a.title}</b>
						<span class="meta"
							>{[a.categoryName, a.byline, timeAgo(a.createdAt)].filter(Boolean).join(' · ')}</span
						>
					</a>
				</li>
			{/each}
		{:else}
			{#each props.items as c (c.id)}
				<li>
					<a href="/concerns/{c.id}">
						<b>{c.title}</b>
						<span class="meta"
							><StatusPill status={c.status} /><span
								>{[c.categoryName, timeAgo(c.createdAt)].filter(Boolean).join(' · ')}</span
							></span
						>
					</a>
				</li>
			{/each}
		{/if}
	</ul>
{:else}
	<div class="empty">
		<p>{props.empty}</p>
		{#if props.emptyAction}<a class="btn btn-o" href={props.emptyAction.href}
				>{props.emptyAction.label}</a
			>{/if}
	</div>
{/if}

<style>
	.rows {
		list-style: none;
		border-top: 1px solid var(--line);
	}
	.rows li {
		border-bottom: 1px solid var(--line);
	}
	.rows a {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-height: 44px;
		padding: 14px 4px;
	}
	.rows b {
		font-size: 16.5px;
		line-height: 1.35;
		transition: color 0.2s;
	}
	.rows a:hover b {
		color: var(--red);
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 12px;
		font-size: 14px;
		color: var(--muted);
	}
	.empty {
		margin-top: 0;
		padding: 26px 20px;
	}
</style>
