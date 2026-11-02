<script lang="ts">
	import { page } from '$app/state';
	import Icon from '#lib/components/ui/Icon.svelte';
	import LinkTabs from '#lib/components/ui/LinkTabs.svelte';
	import StatusPill from '#lib/components/ui/StatusPill.svelte';
	import { withParams } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const total = $derived(data.counts.concern + data.counts.post + data.counts.proposal);
	const tabs = $derived(
		(
			[
				['all', 'All', total],
				['concern', 'Concerns and ideas', data.counts.concern],
				['post', 'Blog posts', data.counts.post],
				['proposal', 'Proposals', data.counts.proposal]
			] as const
		).map(([k, label, count]) => ({
			href: withParams(page.url, { type: k === 'all' ? null : k }),
			label,
			count,
			current: data.type === k
		}))
	);
</script>

<svelte:head><title>{data.q ? `Search: ${data.q}` : 'Search'} | Campusphere</title></svelte:head>

<h1 class="disp head">Search</h1>

<form class="sbox" method="GET" role="search">
	<label for="sq" class="sr-only">Search concerns, ideas, and posts</label>
	<Icon name="search" size={20} />
	<input
		id="sq"
		class="input"
		type="search"
		name="q"
		value={data.q}
		placeholder="Search concerns, ideas, and posts"
	/>
	{#if data.type !== 'all'}<input type="hidden" name="type" value={data.type} />{/if}
	<button class="btn btn-p" type="submit">Search</button>
</form>

{#if data.limited}
	<p class="flash bad mt-6" role="alert">Too many searches. Please wait a minute.</p>
{:else if data.q}
	<LinkTabs label="Filter results" items={tabs} />
	<p class="sr-only" role="status">{data.hits.length} results for {data.q}</p>
	{#if data.hits.length}
		<ol class="res">
			{#each data.hits as h (h.type + h.id)}
				<li>
					<div class="meta">
						{#if h.type === 'concern'}<StatusPill status={h.status} />{/if}
						<span>{h.meta}</span>
					</div>
					<h2 class="disp"><a href={h.href}>{h.title}</a></h2>
					<p>{h.snippet}</p>
				</li>
			{/each}
		</ol>
	{:else}
		<div class="empty">
			<p>Nothing matches "{data.q}". Try fewer or different words.</p>
			<a class="btn btn-o" href="/concerns/new">Report a new concern</a>
		</div>
	{/if}
{:else}
	<p class="mt-6 text-muted-foreground">
		Type a few words, such as "wifi", "library", or "enrollment".
	</p>
{/if}

<style>
	.head {
		font-size: clamp(40px, 4.6vw, 64px);
		line-height: 1;
		margin: 10px 0 20px;
	}
	.sbox {
		position: relative;
		display: flex;
		gap: 12px;
		max-width: 760px;
		color: var(--muted);
	}
	.sbox :global(svg) {
		position: absolute;
		left: 16px;
		top: 50%;
		margin-top: -10px;
	}
	.sbox .input {
		padding-left: 46px;
		border-radius: 999px;
	}
	.res {
		list-style: none;
		margin-top: 10px;
	}
	.res li {
		padding: 22px 0;
		border-bottom: 1px solid var(--line);
		max-width: 860px;
	}
	.meta {
		display: flex;
		gap: 12px;
		align-items: center;
		font-size: 14px;
		color: var(--muted);
	}
	.res h2 {
		font-size: 24px;
		line-height: 1.2;
		margin-top: 10px;
	}
	.res h2 a:hover {
		color: var(--red);
	}
	.res p {
		margin-top: 6px;
		color: var(--muted);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
