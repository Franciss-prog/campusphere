<script lang="ts">
	// Filter tabs as links: state lives in the URL, works without JS, and is shareable.
	// Rendered as a nav with aria-current (not role=tablist), because each tab navigates.
	let {
		label,
		items
	}: { label: string; items: { href: string; label: string; count?: number; current: boolean }[] } =
		$props();
</script>

<nav class="tabs" aria-label={label}>
	{#each items as it (it.href)}
		<a href={it.href} aria-current={it.current ? 'page' : undefined} data-sveltekit-reset="false"
			>{it.label}{#if it.count !== undefined}<span>{it.count}</span>{/if}</a
		>
	{/each}
</nav>
