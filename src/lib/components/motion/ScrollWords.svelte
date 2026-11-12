<script lang="ts">
	// Words light up as the paragraph scrolls into view (opacity only). The full text is real
	// DOM text, so it is readable and selectable; without JS or with reduced motion it is fully lit.
	let { text, class: className = '' }: { text: string; class?: string } = $props();
	const words = $derived(text.trim().split(/\s+/));
	let el: HTMLParagraphElement | undefined = $state();
	let progress = $state(1);

	$effect(() => {
		if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const node = el;
		let frame = 0;
		const clamp = (v: number) => Math.min(1, Math.max(0, v));
		const update = () => {
			const r = node.getBoundingClientRect();
			const vh = innerHeight;
			progress = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.28));
		};
		const onScroll = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(update);
		};
		update();
		addEventListener('scroll', onScroll, { passive: true });
		addEventListener('resize', onScroll);
		return () => {
			cancelAnimationFrame(frame);
			removeEventListener('scroll', onScroll);
			removeEventListener('resize', onScroll);
		};
	});
	const n = $derived(words.length);
	const op = (i: number) =>
		(0.3 + 0.7 * Math.min(1, Math.max(0, progress * (n + 4) - i))).toFixed(2);
</script>

<p class={className} bind:this={el}>
	<!-- eslint-disable-next-line svelte/no-useless-mustaches -- an expression keeps the space; a literal one would be trimmed -->
	{#each words as w, i (i)}<span style="opacity:{op(i)}">{w}</span>{' '}{/each}
</p>

<style>
	span {
		transition: opacity 0.25s linear;
	}
</style>
