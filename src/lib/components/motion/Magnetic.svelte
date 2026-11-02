<script lang="ts">
	import type { Snippet } from 'svelte';
	import { browser } from '$app/env';
	import Magnet from '../svelte-bits/Magnet.svelte';
	import { reducedMotion } from './reduced.svelte';

	let { children, strength = 3.2 }: { children: Snippet; strength?: number } = $props();

	const reduce = reducedMotion();
	const coarse = $derived(browser ? !matchMedia('(pointer: fine)').matches : true);
</script>

<Magnet padding={40} magnetStrength={strength} disabled={reduce.value || coarse}>
	{@render children()}
</Magnet>
