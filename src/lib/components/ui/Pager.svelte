<script lang="ts">
	import { page as pageState } from '$app/state';
	import { withParams } from '#lib/format.ts';

	let {
		page,
		perPage,
		total,
		noun = 'items'
	}: { page: number; perPage: number; total: number; noun?: string } = $props();

	const pages = $derived(Math.max(1, Math.ceil(total / perPage)));
	const from = $derived(total ? (page - 1) * perPage + 1 : 0);
	const to = $derived(Math.min(total, page * perPage));
	const nums = $derived.by(() => {
		const start = Math.max(1, Math.min(page - 1, pages - 2));
		return Array.from({ length: Math.min(3, pages) }, (_, i) => start + i);
	});
	const href = (p: number) => withParams(pageState.url, { page: p === 1 ? null : p });
</script>

{#if total > 0}
	<div class="pager">
		<span>Showing {from} to {to} of {total} {noun}</span>
		{#if pages > 1}
			<nav aria-label="Pagination">
				{#if page > 1}<a href={href(page - 1)} rel="prev">Previous</a>{:else}<span class="dis"
						>Previous</span
					>{/if}
				{#each nums as p (p)}
					<a href={href(p)} aria-current={p === page ? 'page' : undefined}>
						<span class="sr-only">Page </span>{p}
					</a>
				{/each}
				{#if page < pages}<a href={href(page + 1)} rel="next">Next</a>{:else}<span class="dis"
						>Next</span
					>{/if}
			</nav>
		{/if}
	</div>
{/if}
