<script lang="ts">
	// Letter-by-letter reveal, once on load (CSS only). Screen readers get the plain text via
	// aria-label; the animated letters are aria-hidden. Reduced motion: shown immediately.
	let {
		lines,
		class: className = '',
		indents = []
	}: { lines: string[]; class?: string; indents?: string[] } = $props();

	const chars = $derived.by(() => {
		let i = 0;
		return lines.map((l) => [...l].map((c) => ({ c: c === ' ' ? ' ' : c, i: i++ })));
	});
</script>

<h1 class={className} aria-label={lines.join(' ')}>
	{#each chars as line, li (li)}
		<span class="line" style:padding-left={indents[li] ?? '0'} aria-hidden="true"
			>{#each line as ch (ch.i)}<span class="ch" style="--i:{ch.i}">{ch.c}</span>{/each}</span
		>
	{/each}
</h1>

<style>
	.line {
		display: block;
		overflow: hidden;
		padding-bottom: 0.14em;
		margin-bottom: -0.14em;
	}
	.ch {
		display: inline-block;
		transform: translateY(112%);
		animation: up 0.95s var(--ease) forwards;
		animation-delay: calc(var(--i) * 42ms + 250ms);
	}
	@keyframes up {
		to {
			transform: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ch {
			animation: none;
			transform: none;
		}
	}
</style>
