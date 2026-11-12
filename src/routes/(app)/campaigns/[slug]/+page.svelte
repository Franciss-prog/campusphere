<script lang="ts">
	import Banner from '#lib/components/shell/Banner.svelte';
	import ItemRows from '#lib/components/campaigns/ItemRows.svelte';
	import ResolvedBar from '#lib/components/campaigns/ResolvedBar.svelte';
	import ValueChip from '#lib/components/campaigns/ValueChip.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const c = $derived(data.campaign);
	const p = $derived(data.progress);
	// Prefill only when the campaign tag exists; the plain forms work either way.
	const q = $derived(p.tagExists ? `?campaign=${c.slug}` : '');

	const stats = $derived([
		['Articles', p.articles],
		['Concerns', p.concerns],
		['Recommendations', p.recommendations],
		['Resolved', p.resolved]
	] as const);
</script>

<svelte:head>
	<title>{c.title} | Action Campaigns | Campusphere</title>
	<meta name="description" content={c.summary} />
</svelte:head>

<a class="back" href="/campaigns"><Icon name="back" size={18} />All campaigns</a>
<Banner title={c.title} subtitle={c.summary} />

{#if data.chip}
	<p class="valrow">
		<ValueChip chip={data.chip} /><span
			>This campaign puts the value of {data.chip.name} into practice.</span
		>
	</p>
{/if}

<div class="layout">
	<div>
		<section class="sec" aria-labelledby="acts-h">
			<h2 class="disp" id="acts-h">Suggested actions</h2>
			<p class="l">Small habits anyone on campus can start today.</p>
			<ul class="checks">
				{#each c.actions as a (a)}
					<li><span class="tick" aria-hidden="true"><Icon name="check" size={18} /></span>{a}</li>
				{/each}
			</ul>
		</section>

		<section class="sec" aria-labelledby="latest-h">
			<h2 class="disp" id="latest-h">Latest under this campaign</h2>
			<p class="l">Articles, concerns, and recommendations tagged with this campaign.</p>
			<div class="cols">
				<div>
					<h3 class="disp">Articles</h3>
					<ItemRows
						kind="article"
						items={data.content.articles}
						empty="No articles yet."
						emptyAction={{ href: `/blog/new${q}`, label: 'Write one' }}
					/>
				</div>
				<div>
					<h3 class="disp">Concerns</h3>
					<ItemRows
						kind="concern"
						items={data.content.concerns}
						empty="No concerns yet."
						emptyAction={{ href: `/concerns/new${q}`, label: 'Report one' }}
					/>
				</div>
				<div>
					<h3 class="disp">Recommendations</h3>
					<ItemRows
						kind="concern"
						items={data.content.recommendations}
						empty="No recommendations yet."
						emptyAction={{ href: `/recommendations${q}`, label: 'Share one' }}
					/>
				</div>
			</div>
		</section>
	</div>

	<aside class="side">
		<section class="panel" id="take-part" aria-labelledby="part-h">
			<h2 class="disp" id="part-h">Take part</h2>
			<p class="sub">Everything you post here counts toward this campaign. No account, no names.</p>
			<div class="acts">
				<a class="btn btn-p" href="/concerns/new{q}">Report a concern</a>
				<a class="btn btn-o" href="/recommendations{q}">Share a recommendation</a>
				<a class="btn btn-o" href="/blog/new{q}">Write an article</a>
			</div>
		</section>

		<section class="panel mt-5" aria-labelledby="prog-h">
			<h2 class="disp" id="prog-h">Progress</h2>
			<dl class="nums">
				{#each stats as [label, n] (label)}
					<div>
						<dt>{label}</dt>
						<dd class="disp">{n.toLocaleString('en-US')}</dd>
					</div>
				{/each}
			</dl>
			<div class="mt-4"><ResolvedBar progress={p} /></div>
		</section>
	</aside>
</div>

<style>
	.valrow {
		margin-top: 20px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 14px;
		color: var(--muted);
		font-size: 15.5px;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 360px;
		gap: 40px;
		align-items: start;
	}
	.side {
		margin-top: 56px;
	}
	.checks {
		list-style: none;
		display: grid;
		gap: 12px;
	}
	.checks li {
		display: flex;
		gap: 14px;
		align-items: flex-start;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 18px;
		padding: 16px 20px;
		font-size: 17px;
		line-height: 1.45;
	}
	.tick {
		flex: none;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--tint);
		color: var(--red);
		display: grid;
		place-items: center;
	}
	.cols {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 24px;
	}
	.cols h3 {
		font-size: 20px;
		margin-bottom: 10px;
	}
	.panel h2 {
		font-size: 26px;
		line-height: 1.1;
	}
	.acts {
		margin-top: 18px;
		display: grid;
		gap: 10px;
	}
	.nums {
		margin-top: 16px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}
	.nums div {
		display: flex;
		flex-direction: column-reverse;
	}
	.nums dt {
		font-size: 14px;
		color: var(--muted);
	}
	.nums dd {
		font-size: 34px;
		line-height: 1;
		color: var(--red);
	}
	@media (max-width: 1400px) {
		.cols {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 1100px) {
		.layout {
			grid-template-columns: 1fr;
		}
		.side {
			margin-top: 40px;
		}
	}
</style>
