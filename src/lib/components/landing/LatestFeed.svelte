<script lang="ts">
	import ItemRows from '#lib/components/campaigns/ItemRows.svelte';
	import type { ArticleRow, ConcernRow } from '#lib/campaigns.ts';

	// Read-only feed: the landing page has no support action, so rows are plain links.
	let { posts, concerns }: { posts: ArticleRow[]; concerns: ConcernRow[] } = $props();
</script>

<section class="feed" aria-labelledby="feed-h">
	<h2 class="disp" id="feed-h">Latest from campus</h2>
	<p class="lead">What people are writing about and reporting this week.</p>
	<div class="cols">
		<div>
			<h3 class="disp">Latest articles</h3>
			<ItemRows
				kind="article"
				items={posts}
				empty="No articles yet."
				emptyAction={{ href: '/blog/new', label: 'Write the first one' }}
			/>
			{#if posts.length}<a class="lk" href="/blog">Read all articles</a>{/if}
		</div>
		<div>
			<h3 class="disp">Latest concerns</h3>
			<ItemRows
				kind="concern"
				items={concerns}
				empty="No concerns yet."
				emptyAction={{ href: '/concerns/new', label: 'Report a concern' }}
			/>
			{#if concerns.length}<a class="lk" href="/concerns">See all concerns</a>{/if}
		</div>
	</div>
</section>

<style>
	.feed {
		background: #fff;
		padding: 110px 64px;
	}
	h2 {
		font-size: clamp(36px, 4.2vw, 64px);
		line-height: 1;
	}
	.lead {
		margin-top: 14px;
		font-size: 19px;
		color: var(--muted);
		max-width: 560px;
	}
	.cols {
		margin-top: 44px;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 48px;
	}
	h3 {
		font-size: 22px;
		margin-bottom: 12px;
	}
	.lk {
		margin-top: 10px;
	}
	@media (max-width: 980px) {
		.feed {
			padding: 80px 16px;
		}
		.cols {
			grid-template-columns: 1fr;
			gap: 40px;
			margin-top: 32px;
		}
	}
</style>
