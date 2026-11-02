<script lang="ts">
	import { page } from '$app/state';

	// GET form: works without JS (Apply button), auto-submits with JS. Keeps other filters.
	let {
		value,
		options,
		name = 'sort',
		label = 'Sort by'
	}: { value: string; options: [string, string][]; name?: string; label?: string } = $props();

	const uid = $props.id();
	const keep = $derived(
		[...page.url.searchParams.entries()].filter(([k]) => k !== name && k !== 'page')
	);
</script>

<form class="sel" method="GET" data-sveltekit-reset="false">
	{#each keep as [k, v] (k)}<input type="hidden" name={k} value={v} />{/each}
	<label for={uid}>{label}</label>
	<select id={uid} {name} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
		{#each options as [v, l] (v)}<option value={v} selected={v === value}>{l}</option>{/each}
	</select>
	<noscript><button class="btn btn-o btn-sm" type="submit">Apply</button></noscript>
</form>
