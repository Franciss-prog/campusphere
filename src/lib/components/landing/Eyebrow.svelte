<script lang="ts">
	// "01 Discover · Awareness": marks where a section sits in the Awareness → Participation →
	// Positive change flow.
	let {
		n,
		label,
		step,
		dark = false
	}: { n: string; label: string; step: string; dark?: boolean } = $props();
</script>

<p class="eb disp" class:dark>
	<span class="n">{n}</span><span>{label}</span><span class="dot" aria-hidden="true">·</span><span
		class="step">{step}</span
	>
</p>

<style>
	.eb {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 10px;
		font-size: 17px;
		color: var(--red);
		margin-bottom: 18px;
	}
	.n {
		display: inline-grid;
		place-items: center;
		min-width: 38px;
		height: 26px;
		padding: 0 8px;
		border-radius: 999px;
		background: var(--red);
		color: #fff;
		font-size: 13px;
		align-self: center;
	}
	.step {
		color: var(--muted);
	}
	.dark {
		color: #fff6f3;
	}
	.dark .n {
		background: #fff6f3;
		color: var(--red-d);
	}
	.dark .step {
		color: #f1c9c5;
	}
</style>
