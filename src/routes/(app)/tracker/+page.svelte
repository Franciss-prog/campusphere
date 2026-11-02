<script lang="ts">
	import Banner from '#lib/components/shell/Banner.svelte';
	import CountUp from '#lib/components/motion/CountUp.svelte';
	import SortSelect from '#lib/components/ui/SortSelect.svelte';
	import { BOARD_STATUSES, STATUS_LABEL, STATUSES } from '#lib/status.ts';
	import { plural } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const strip = STATUSES.filter((s) => s !== 'closed');
	const catName = $derived(data.categories.find((c) => c.slug === data.category)?.name);
</script>

<svelte:head><title>Impact Tracker | Campusphere</title></svelte:head>

<Banner
	title="Impact Tracker"
	subtitle="See every concern and where it stands, from first report to resolved."
/>

<h2 class="sr-only">Concerns per status</h2>
<ul class="sumrow">
	{#each strip as s (s)}
		<li data-s={s}>
			<CountUp to={data.counts.counts[s]} class="disp n" />
			<span>{STATUS_LABEL[s]}</span>
		</li>
	{/each}
</ul>
{#if data.counts.counts.closed > 0}
	<p class="closed">
		{plural(data.counts.counts.closed, 'concern')} closed as not feasible, each with a public explanation.
		<a class="lk" href="/concerns?status=closed{data.category ? `&category=${data.category}` : ''}"
			>See why</a
		>
	</p>
{/if}

<div class="boardbar">
	<h2 class="disp">Concerns by stage{catName ? `: ${catName}` : ''}</h2>
	<SortSelect
		name="category"
		label="Category"
		value={data.category ?? ''}
		options={[
			['', 'All categories'],
			...data.categories.map((c) => [c.slug, c.name] as [string, string])
		]}
	/>
</div>

{#if data.counts.all === 0}
	<div class="empty">
		<p>No concerns here yet.</p>
		<a class="btn btn-o" href="/concerns/new">Report a concern</a>
	</div>
{:else}
	<div class="board" role="list" aria-label="Board of concerns by stage">
		{#each BOARD_STATUSES as s (s)}
			{@const cards = data.cards.filter((c) => c.status === s)}
			<section class="col" data-s={s} role="listitem" aria-labelledby="col-{s}">
				<header>
					<h3 id="col-{s}"><span class="dot"></span>{STATUS_LABEL[s]}</h3>
					<em>{data.counts.counts[s]}</em>
				</header>
				{#each cards as c (c.id)}
					<a class="kc" href="/concerns/{c.id}">
						{#if c.categoryName}<span class="cat">{c.categoryName}</span>{/if}
						<b>{c.title}</b>
						<small
							><span>{plural(c.commentCount, 'comment')}</span><span
								>{plural(c.supportCount, 'support')}</span
							></small
						>
					</a>
				{:else}
					<p class="none">Nothing at this stage.</p>
				{/each}
				{#if data.counts.counts[s] > cards.length}
					<a
						class="more"
						href="/concerns?status={s}{data.category ? `&category=${data.category}` : ''}"
						>See all {data.counts.counts[s]}</a
					>
				{/if}
			</section>
		{/each}
	</div>
	<p class="hint">
		Columns show the most supported concerns first. Resolved shows the most recent first. Newly
		submitted concerns appear on <a class="lk" href="/concerns?status=submitted">Campus Concerns</a
		>.
	</p>
{/if}

<style>
	.sumrow {
		margin-top: 24px;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 22px;
		overflow: hidden;
		list-style: none;
	}
	.sumrow li {
		padding: 20px 22px;
		border-left: 1px solid var(--line);
	}
	.sumrow li:first-child {
		border-left: 0;
	}
	.sumrow :global(.n) {
		display: block;
		font-size: 40px;
		line-height: 1;
	}
	.sumrow span {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
		font-size: 14px;
		color: var(--muted);
	}
	.sumrow span::before {
		content: '';
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--c);
		flex: none;
	}
	.closed {
		margin-top: 12px;
		font-size: 14.5px;
		color: var(--muted);
	}
	.boardbar {
		margin-top: 30px;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 20px;
		flex-wrap: wrap;
	}
	.boardbar h2 {
		font-size: 30px;
	}
	.board {
		margin-top: 18px;
		display: grid;
		grid-template-columns: repeat(5, minmax(200px, 1fr));
		gap: 16px;
		overflow-x: auto;
		padding-bottom: 10px;
	}
	.col {
		background: var(--tint);
		border-radius: 22px;
		padding: 14px;
		min-height: 420px;
	}
	.col header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 8px 14px;
	}
	.col h3 {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 15.5px;
		font-weight: 700;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--c);
	}
	.col em {
		font-style: normal;
		font-weight: 600;
		color: var(--muted);
		font-size: 14px;
	}
	.kc {
		display: block;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 16px;
		margin-bottom: 10px;
		transition:
			transform 0.35s var(--ease),
			border-color 0.25s;
	}
	.kc:hover {
		transform: translateY(-3px);
		border-color: var(--hover-line);
	}
	.kc b {
		display: block;
		font-size: 16.5px;
		line-height: 1.25;
	}
	.kc small {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		margin-top: 12px;
		font-size: 13px;
		color: var(--muted);
	}
	.cat {
		display: block;
		font-size: 12.5px;
		color: var(--faint);
		margin-bottom: 6px;
	}
	.none {
		font-size: 14px;
		color: var(--muted);
		padding: 8px;
	}
	.more {
		display: block;
		text-align: center;
		font-weight: 700;
		font-size: 14px;
		color: var(--red-d);
		padding: 10px;
	}
	.hint {
		margin-top: 14px;
		font-size: 14px;
		color: var(--muted);
	}
	@media (max-width: 1100px) {
		.sumrow {
			grid-template-columns: repeat(2, 1fr);
		}
		.sumrow li {
			border-top: 1px solid var(--line);
		}
		.sumrow li:nth-child(odd) {
			border-left: 0;
		}
		.sumrow li:nth-child(-n + 2) {
			border-top: 0;
		}
	}
</style>
