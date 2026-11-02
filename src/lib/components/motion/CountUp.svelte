<script lang="ts">
	import SbCountUp from '../svelte-bits/CountUp.svelte';
	import { reducedMotion } from './reduced.svelte';

	let { to, class: className = '' }: { to: number; class?: string } = $props();
	const reduce = reducedMotion();
</script>

<!-- The vendored CountUp renders `to` during SSR, so the number is visible without JS. -->
{#if reduce.value}
	<span class={className}>{to.toLocaleString('en-US')}</span>
{:else}
	<SbCountUp {to} duration={1.2} separator="," class={className} />
{/if}
