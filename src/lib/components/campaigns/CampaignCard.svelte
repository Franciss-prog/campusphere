<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import ValueChip from './ValueChip.svelte';
	import { progressLine, type CampaignCardData } from '#lib/campaigns.ts';

	// Several actions per card, so no whole-card link: explicit links with 44px targets.
	let { campaign: c }: { campaign: CampaignCardData } = $props();

	const line = $derived(progressLine(c.progress));
	// Prefill links only make sense when the campaign's tag exists; otherwise use the plain forms.
	const q = $derived(c.progress.tagExists ? `?campaign=${c.slug}` : '');
	const hid = $derived(`camp-${c.slug}`);
</script>

<article class="card camp" aria-labelledby={hid}>
	{#if c.chip}<div class="chiprow"><ValueChip chip={c.chip} /></div>{/if}
	<h3 class="disp" id={hid}>{c.title}</h3>
	<p class="sum">{c.summary}</p>
	<p class="lbl">Suggested actions</p>
	<ul class="acts">
		{#each c.actions as a (a)}
			<li><Icon name="check" size={18} />{a}</li>
		{/each}
	</ul>
	{#if line}<p class="prog">{line}</p>{/if}
	<div class="cta">
		<a class="btn btn-p" href="/campaigns/{c.slug}"
			>Join this campaign<span class="sr-only">: {c.title}</span></a
		>
		<span class="or">
			<a class="lk" href="/concerns/new{q}"
				>Report a concern<span class="sr-only"> for {c.title}</span></a
			>
			<a class="lk" href="/recommendations{q}"
				>Recommend a fix<span class="sr-only"> for {c.title}</span></a
			>
		</span>
	</div>
</article>

<style>
	.camp {
		padding: 30px 30px 26px;
		overflow: visible;
	}
	.chiprow {
		margin-bottom: 16px;
	}
	h3 {
		font-size: clamp(24px, 2.3vw, 32px);
		line-height: 1.05;
		letter-spacing: -0.03em;
	}
	.sum {
		margin-top: 10px;
		color: var(--muted);
		font-size: 16.5px;
		line-height: 1.55;
	}
	.lbl {
		margin-top: 20px;
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
	}
	.acts {
		margin-top: 8px;
		display: grid;
		gap: 8px;
		list-style: none;
	}
	.acts li {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		font-size: 15.5px;
		line-height: 1.45;
	}
	.acts :global(.icon) {
		color: var(--red);
		margin-top: 2px;
	}
	.prog {
		margin-top: 18px;
		padding-top: 14px;
		border-top: 1px solid var(--line2);
		font-size: 14.5px;
		font-weight: 600;
		color: var(--ink);
	}
	.cta {
		margin-top: auto;
		padding-top: 20px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 18px;
	}
	.or {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0 16px;
	}
	.lk {
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: var(--outline-line);
	}
	@media (max-width: 640px) {
		.camp {
			padding: 24px 20px 20px;
		}
	}
</style>
