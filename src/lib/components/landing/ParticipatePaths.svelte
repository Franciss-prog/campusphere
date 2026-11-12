<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import Eyebrow from './Eyebrow.svelte';
	import { PARTICIPATE, PERSONAL_DETAILS_WARNING } from '#lib/content/site.ts';
	import type { CampaignCardData } from '#lib/campaigns.ts';

	// Two pinned-note cards (concern vs recommendation) on the deep band. The example pair is the
	// same problem seen twice: a concern names it, a recommendation offers the fix.
	let { campaigns }: { campaigns: CampaignCardData[] } = $props();
</script>

<section class="pp on-dark" id="participate" aria-labelledby="pp-h">
	<Eyebrow n="02" label="Participate" step="Participation" dark />
	<h2 class="disp" id="pp-h">Say what needs to change.</h2>
	<p class="lead">Two ways in. Both are anonymous and take about a minute.</p>

	<div class="pair">
		{#each PARTICIPATE as p, i (p.key)}
			<article class="note" style="--r:{i ? 1.4 : -1.4}deg" aria-labelledby="pp-{p.key}">
				<i class="pin" aria-hidden="true"></i>
				<span class="ic" aria-hidden="true"><Icon name={p.icon} size={24} /></span>
				<h3 class="disp" id="pp-{p.key}">{p.title}</h3>
				<p class="purpose">{p.purpose}</p>
				<div class="ex">
					<span class="exl">For example</span>
					<p>{p.example}</p>
				</div>
				<div class="acts">
					<a class="btn btn-p" href={p.primary.href}>{p.primary.label}</a>
					<a class="lk" href={p.secondary.href}>{p.secondary.label}</a>
				</div>
			</article>
		{/each}
	</div>

	<p class="connector">
		<span>A concern names the problem. A recommendation offers the fix.</span>
	</p>

	<div class="camps">
		<p id="pp-camps">Part of a campaign?</p>
		<ul aria-labelledby="pp-camps">
			{#each campaigns as c (c.slug)}
				<li>
					<a
						class="chip"
						href={c.progress.tagExists
							? `/concerns/new?campaign=${c.slug}`
							: `/campaigns/${c.slug}`}>{c.title}</a
					>
				</li>
			{/each}
		</ul>
	</div>

	<p class="safe"><b>No account. No names.</b> {PERSONAL_DETAILS_WARNING}</p>
</section>

<style>
	.pp {
		position: relative;
		background: var(--deep);
		color: #fff6f3;
		padding: 120px 64px;
		scroll-margin-top: 16px;
		overflow: hidden;
	}
	h2 {
		font-size: clamp(36px, 4.6vw, 72px);
		line-height: 1;
		max-width: 820px;
	}
	.lead {
		margin-top: 14px;
		font-size: 19px;
		color: #f1c9c5;
		max-width: 560px;
	}
	.pair {
		margin-top: 56px;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 36px;
		max-width: 1180px;
	}
	.note {
		position: relative;
		background: #fff;
		color: var(--ink);
		border-radius: 22px;
		padding: 36px 32px 28px;
		box-shadow: 0 30px 50px -30px rgba(0, 0, 0, 0.7);
		display: flex;
		flex-direction: column;
		transition: transform 0.4s var(--ease);
	}
	/* Focus rings inside the white notes stay red (the band's rings are white). */
	.note a:focus-visible {
		outline-color: var(--red);
	}
	.pin {
		position: absolute;
		top: -9px;
		left: 50%;
		margin-left: -10px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #ff9a9a, #d01c23 45%, #7a0c12);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
	}
	.ic {
		width: 48px;
		height: 48px;
		border-radius: 14px;
		background: var(--tint);
		color: var(--red);
		display: grid;
		place-items: center;
	}
	h3 {
		margin-top: 18px;
		font-size: clamp(26px, 2.4vw, 34px);
		line-height: 1.05;
		letter-spacing: -0.03em;
	}
	.purpose {
		margin-top: 8px;
		font-size: 17px;
		color: var(--muted);
		line-height: 1.5;
	}
	.ex {
		margin-top: 20px;
		background: var(--rose);
		border: 1px dashed var(--outline-line);
		border-radius: 14px;
		padding: 14px 16px;
	}
	.exl {
		display: block;
		font-size: 12.5px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
	}
	.ex p {
		margin-top: 4px;
		font-family: var(--font-serif);
		font-size: 17px;
		line-height: 1.45;
	}
	.acts {
		margin-top: auto;
		padding-top: 22px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 18px;
	}
	.connector {
		margin-top: 40px;
		max-width: 1180px;
		display: flex;
		align-items: center;
		gap: 18px;
		font-size: 18px;
		font-weight: 600;
		color: #fff6f3;
		text-align: center;
	}
	.connector::before,
	.connector::after {
		content: '';
		flex: 1;
		height: 1px;
		background: rgba(255, 246, 243, 0.3);
	}
	.camps {
		margin-top: 36px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 16px;
	}
	.camps p {
		font-weight: 700;
		font-size: 16px;
	}
	.camps ul {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		list-style: none;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 18px;
		border-radius: 999px;
		border: 1.5px solid rgba(255, 246, 243, 0.55);
		font-weight: 600;
		font-size: 15px;
		color: #fff6f3;
		transition:
			background 0.25s,
			color 0.25s;
	}
	.chip:hover {
		background: #fff6f3;
		color: var(--red-d);
	}
	.safe {
		margin-top: 28px;
		font-size: 15.5px;
		color: #f1c9c5;
	}
	.safe b {
		color: #fff6f3;
	}
	@media (min-width: 981px) and (prefers-reduced-motion: no-preference) {
		.note {
			transform: rotate(var(--r));
		}
		.note:hover,
		.note:focus-within {
			transform: rotate(0deg) translateY(-6px);
		}
	}
	@media (max-width: 980px) {
		.pp {
			padding: 80px 16px;
		}
		.pair {
			grid-template-columns: 1fr;
			gap: 28px;
			margin-top: 40px;
		}
		.note {
			padding: 30px 22px 22px;
		}
		.connector {
			font-size: 16px;
		}
	}
</style>
