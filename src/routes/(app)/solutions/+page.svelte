<script lang="ts">
	import { page } from '$app/state';
	import Banner from '#lib/components/shell/Banner.svelte';
	import LinkTabs from '#lib/components/ui/LinkTabs.svelte';
	import Pager from '#lib/components/ui/Pager.svelte';
	import SortSelect from '#lib/components/ui/SortSelect.svelte';
	import SupportButton from '#lib/components/ui/SupportButton.svelte';
	import { plural, withParams } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const HEAD = {
		supported: 'Most supported proposals',
		newest: 'Newest proposals',
		discussed: 'Most discussed proposals'
	} as const;

	const tabs = $derived([
		{
			href: withParams(page.url, { category: null }),
			label: 'All',
			count: data.counts.all,
			current: !data.category
		},
		...data.categories
			.filter((c) => (data.counts.bySlug[c.slug] ?? 0) > 0 || c.slug === data.category)
			.map((c) => ({
				href: withParams(page.url, { category: c.slug }),
				label: c.name,
				count: data.counts.bySlug[c.slug] ?? 0,
				current: data.category === c.slug
			}))
	]);
	const markBest = $derived(data.sort === 'supported' && data.list.page === 1);
</script>

<svelte:head><title>Solution Hub | Campusphere</title></svelte:head>

<Banner
	title="Solution Hub"
	subtitle="Proposed fixes from the community. Back the ones that make sense."
/>

<div class="listhead">
	<div>
		<h2 class="disp">{HEAD[data.sort]}</h2>
		<p>Each proposal belongs to a concern. Open the concern to discuss it.</p>
	</div>
	<SortSelect
		value={data.sort}
		options={[
			['supported', 'Most supported'],
			['newest', 'Newest'],
			['discussed', 'Most discussed']
		]}
	/>
</div>

<LinkTabs label="Filter by category" items={tabs} />

{#if data.list.items.length}
	<ol class="mt-[22px]">
		{#each data.list.items as p, i (p.id)}
			{@const best = markBest && i === 0 && p.supportCount > 0}
			<li class="prop" class:best>
				<div>
					<div class="on">
						On <a href="/concerns/{p.concernId}">{p.concernTitle}</a>
					</div>
					{#if p.adopted}<span class="adopted">Adopted by staff</span>{/if}
					{#if best}<span class="bestlbl">Most supported</span>{/if}
					<h3 class="disp">{p.title}</h3>
					<p>{p.description}</p>
					<a class="x" href="/concerns/{p.concernId}#prop-h">{plural(p.commentCount, 'comment')}</a>
				</div>
				<SupportButton
					action="?/supportProposal"
					id={p.id}
					supported={p.supported}
					count={p.supportCount}
					label={p.title}
				/>
			</li>
		{/each}
	</ol>
	<Pager
		page={data.list.page}
		perPage={data.list.perPage}
		total={data.list.total}
		noun="proposals"
	/>
{:else}
	<div class="empty">
		<p>
			No proposals {data.category ? 'in this category ' : ''}yet. Open a concern and suggest a fix.
		</p>
		<a class="btn btn-o" href="/concerns">Browse concerns</a>
	</div>
{/if}

<style>
	ol {
		list-style: none;
	}
	.prop {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 20px;
		align-items: center;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 20px;
		padding: 22px 24px;
		margin-bottom: 14px;
	}
	.prop.best {
		border-color: var(--hover-line);
		box-shadow: inset 4px 0 0 var(--red);
	}
	.on {
		font-size: 14px;
		color: var(--muted);
		margin-bottom: 6px;
	}
	.on a {
		color: var(--red-d);
		font-weight: 700;
	}
	.on a:hover {
		text-decoration: underline;
	}
	.bestlbl {
		display: inline-block;
		font-size: 13px;
		font-weight: 700;
		color: var(--red-d);
		margin-bottom: 4px;
	}
	h3 {
		font-size: 21px;
		line-height: 1.2;
	}
	p {
		margin-top: 6px;
		color: var(--muted);
		font-size: 15.5px;
		max-width: 640px;
	}
	.x {
		display: inline-flex;
		margin-top: 6px;
		min-height: 36px;
		align-items: center;
		font-size: 14px;
		color: var(--muted);
	}
	.x:hover {
		color: var(--red);
	}
	@media (max-width: 640px) {
		.prop {
			grid-template-columns: 1fr;
		}
	}
</style>
