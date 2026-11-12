<script lang="ts">
	import Banner from '#lib/components/shell/Banner.svelte';
	import CampaignCard from '#lib/components/campaigns/CampaignCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const FLOW = [
		{
			step: 'Awareness',
			text: 'Learn what each campaign asks of us and the core value behind it.'
		},
		{
			step: 'Participation',
			text: 'Report a concern or share a recommendation as part of a campaign.'
		},
		{
			step: 'Positive change',
			text: 'Follow the counts as items are discussed, acted on, and resolved.'
		}
	] as const;
</script>

<svelte:head>
	<title>Action Campaigns | Campusphere</title>
	<meta
		name="description"
		content="Ethics in action at Batangas State University – Mabini Campus: four campaigns that turn the Red Spartan core values into everyday habits."
	/>
</svelte:head>

<Banner
	title="Action Campaigns"
	subtitle="Ethics in action. Values are what we say; campaigns are what we do, together, every day."
/>

<section class="flow" aria-labelledby="flow-h">
	<h2 class="disp" id="flow-h">Awareness, participation, positive change</h2>
	<ol>
		{#each FLOW as f, i (f.step)}
			<li>
				<span class="n disp" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
				<b>{f.step}</b>
				<span>{f.text}</span>
			</li>
		{/each}
	</ol>
</section>

<section class="sec" aria-labelledby="list-h">
	<h2 class="disp" id="list-h">Current campaigns</h2>
	<p class="l">
		Pick one, try its suggested actions, and tag what you post so progress stays visible.
	</p>
	<div class="grid">
		{#each data.campaigns as c (c.slug)}
			<CampaignCard campaign={c} />
		{/each}
	</div>
	<div class="notice mt-8">
		<b>Who decides</b>
		Campusphere coordinates and keeps progress in the open. University offices review concerns and decide
		on changes to facilities and policy.
	</div>
</section>

<style>
	.flow {
		margin-top: 28px;
	}
	.flow h2 {
		font-size: 30px;
		line-height: 1.1;
	}
	.flow ol {
		margin-top: 18px;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
		list-style: none;
	}
	.flow li {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 22px;
		padding: 22px 24px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.flow .n {
		font-size: 30px;
		color: var(--red);
		line-height: 1;
		margin-bottom: 8px;
	}
	.flow b {
		font-size: 18px;
	}
	.flow li span:last-child {
		color: var(--muted);
		font-size: 15.5px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}
	@media (max-width: 980px) {
		.flow ol,
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
