<script lang="ts">
	import { OBJECTIVES } from '#lib/content/site.ts';
</script>

<section class="obj" aria-labelledby="obj-h">
	<h2 class="disp" id="obj-h">Campaign objectives</h2>
	<p class="lead">Six goals behind every report, idea, and article on Campusphere.</p>
	<ol>
		{#each OBJECTIVES as o, i (o.title)}
			<li class="panel">
				<span class="n disp" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
				<h3 class="disp">{o.title}</h3>
				<p>{o.text}</p>
			</li>
		{/each}
	</ol>
</section>

<style>
	.obj {
		background: var(--rose);
		padding: 110px 64px;
	}
	h2 {
		font-size: clamp(36px, 4.2vw, 64px);
		line-height: 1;
		max-width: 760px;
	}
	.lead {
		margin-top: 14px;
		font-size: 19px;
		color: var(--muted);
		max-width: 560px;
		line-height: 1.55;
	}
	ol {
		margin-top: 48px;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
		list-style: none;
	}
	li {
		transition:
			transform 0.4s var(--ease),
			border-color 0.25s;
	}
	li:hover {
		transform: translateY(-4px);
		border-color: var(--hover-line);
	}
	.n {
		display: block;
		font-size: 56px;
		line-height: 1;
		color: var(--red);
		letter-spacing: -0.04em;
	}
	h3 {
		margin-top: 18px;
		font-size: 22px;
		line-height: 1.15;
	}
	li p {
		margin-top: 8px;
		color: var(--muted);
		font-size: 16px;
		line-height: 1.55;
	}
	@media (max-width: 980px) {
		.obj {
			padding: 80px 16px;
		}
		ol {
			grid-template-columns: 1fr;
			margin-top: 32px;
		}
	}
</style>
