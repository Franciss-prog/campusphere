<script lang="ts">
	import { resolvedCaption, type CampaignProgress } from '#lib/campaigns.ts';

	// Resolved vs total. The caption carries the meaning; the bar is a visual aid only.
	let { progress }: { progress: CampaignProgress } = $props();
	const pct = $derived(progress.total ? Math.round((progress.resolved / progress.total) * 100) : 0);
</script>

<div class="rb">
	{#if progress.total}
		<div class="bar" aria-hidden="true"><i style="width:{pct}%"></i></div>
	{/if}
	<p class="cap">{resolvedCaption(progress)}</p>
</div>

<style>
	.bar {
		height: 10px;
		border-radius: 999px;
		background: var(--line2);
		overflow: hidden;
	}
	.bar i {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--s-res);
	}
	.cap {
		margin-top: 6px;
		font-size: 14px;
		color: var(--muted);
	}
</style>
