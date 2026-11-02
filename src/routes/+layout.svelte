<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link
		rel="preload"
		href="/fonts/texgyreadventor-bold.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
	<meta name="theme-color" content="#D01C23" />
</svelte:head>

{@render children()}
