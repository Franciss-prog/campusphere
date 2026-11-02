<script lang="ts">
	import AppShell from '#lib/components/shell/AppShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

<AppShell mode="staff" role={data.staff.role}>{@render children()}</AppShell>
