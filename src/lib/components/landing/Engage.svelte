<script lang="ts">
	import CountUp from '#lib/components/motion/CountUp.svelte';
	import ResolvedBar from '#lib/components/campaigns/ResolvedBar.svelte';
	import Eyebrow from './Eyebrow.svelte';
	import { progressLine, type ArticleRow, type CampaignCardData } from '#lib/campaigns.ts';

	let {
		campaigns,
		stats,
		featured
	}: {
		campaigns: CampaignCardData[];
		stats: { concerns: number; recommendations: number; resolved: number; proposals: number };
		featured: ArticleRow | null;
	} = $props();

	const STATS = $derived([
		['Concerns reported', stats.concerns],
		['Recommendations shared', stats.recommendations],
		['Resolved', stats.resolved],
		['Solutions proposed', stats.proposals]
	] as const);
</script>

<section class="eng" id="engage" aria-labelledby="eng-h">
	<Eyebrow n="03" label="Engage" step="Positive change" />
	<h2 class="disp" id="eng-h">See what changes.</h2>
	<p class="lead">
		Every campaign is a lesson and a record. Follow its progress, read what others learned, and add
		your own.
	</p>

	<div class="grid">
		<div class="panel">
			<h3 class="disp">Campaign progress</h3>
			<p class="sub">Resolved concerns and recommendations, out of everything posted under each.</p>
			<ul class="prog">
				{#each campaigns as c (c.slug)}
					{@const line = progressLine(c.progress)}
					<li>
						<div class="top">
							<a href="/campaigns/{c.slug}">{c.title}</a>
							{#if line}<span>{line}</span>{/if}
						</div>
						<ResolvedBar progress={c.progress} />
					</li>
				{/each}
			</ul>
		</div>

		<div class="side">
			<div class="panel">
				<h3 class="disp">Community contributions</h3>
				<dl class="stats">
					{#each STATS as [label, n] (label)}
						<div>
							<dt>{label}</dt>
							<dd><CountUp to={n} class="disp" /></dd>
						</div>
					{/each}
				</dl>
			</div>

			<div class="panel read">
				<h3 class="disp">Read and write</h3>
				{#if featured}
					<p class="fl">Featured article</p>
					<a class="ft" href="/blog/{featured.slug}">{featured.title}</a>
					{#if featured.excerpt}<p class="ex">{featured.excerpt}</p>{/if}
				{:else}
					<p class="sub">No articles yet. Share what you know about campus life.</p>
				{/if}
				<div class="acts">
					<a class="btn btn-p" href="/blog">Read the blog</a>
					<a class="btn btn-o" href="/blog/new">Write an article</a>
					<a class="btn btn-o" href="/solutions">Join the discussion</a>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.eng {
		background: var(--rose);
		padding: 120px 64px;
		scroll-margin-top: 16px;
	}
	h2 {
		font-size: clamp(36px, 4.6vw, 72px);
		line-height: 1;
	}
	.lead {
		margin-top: 14px;
		font-size: 19px;
		color: var(--muted);
		max-width: 600px;
		line-height: 1.55;
	}
	.grid {
		margin-top: 48px;
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}
	.side {
		display: grid;
		gap: 20px;
	}
	.prog {
		margin-top: 18px;
		list-style: none;
		display: grid;
		gap: 22px;
	}
	.top {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 2px 14px;
		margin-bottom: 8px;
	}
	.top a {
		font-weight: 700;
		font-size: 17px;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		text-decoration: underline;
		text-decoration-color: var(--outline-line);
		text-underline-offset: 3px;
	}
	.top a:hover {
		color: var(--red);
	}
	.top span {
		font-size: 14px;
		color: var(--muted);
	}
	.stats {
		margin-top: 18px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}
	.stats div {
		display: flex;
		flex-direction: column-reverse;
	}
	.stats dt {
		color: var(--muted);
		font-size: 14.5px;
	}
	.stats dd :global(span) {
		font-size: 46px;
		line-height: 1;
		color: var(--red);
	}
	.fl {
		margin-top: 14px;
		font-size: 12.5px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
	}
	.ft {
		display: inline-block;
		margin-top: 4px;
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 22px;
		line-height: 1.2;
		letter-spacing: -0.02em;
	}
	.ft:hover {
		color: var(--red);
	}
	.ex {
		margin-top: 8px;
		color: var(--muted);
		font-size: 15.5px;
		line-height: 1.5;
	}
	.acts {
		margin-top: 20px;
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	@media (max-width: 980px) {
		.eng {
			padding: 80px 16px;
		}
		.grid {
			grid-template-columns: 1fr;
			margin-top: 32px;
		}
		.panel {
			padding: 22px 18px;
		}
	}
</style>
