<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from './Icon.svelte';

	// Progressive enhancement: a real POST form; with JS the count updates optimistically.
	let {
		action,
		id,
		supported,
		count,
		verb = 'Support',
		done = 'Supported',
		field = 'id',
		size = 'sm',
		label,
		extra = {}
	}: {
		action: string;
		id: number;
		supported: boolean;
		count: number;
		verb?: string;
		done?: string;
		field?: string;
		/** `text`: a quiet text toggle (comment "Helpful"). */
		size?: 'sm' | 'lg' | 'text';
		/** Additional hidden fields. */
		extra?: Record<string, string>;
		/** Accessible name context, e.g. the item title. */
		label?: string;
	} = $props();

	// Writable deriveds: follow server data, but can be overridden optimistically.
	let on = $derived(supported);
	let n = $derived(count);
	let busy = $state(false);
</script>

<form
	method="POST"
	{action}
	class={size === 'lg' ? 'flex w-full' : 'inline-flex'}
	use:enhance={() => {
		const prev = { on, n };
		on = !on;
		n = Math.max(0, n + (on ? 1 : -1));
		busy = true;
		return async ({ result, update }) => {
			busy = false;
			if (result.type === 'success' && result.data && 'supportCount' in result.data) {
				on = Boolean(result.data.supported);
				n = Number(result.data.supportCount);
			} else if (result.type !== 'success') {
				on = prev.on;
				n = prev.n;
				await update({ reset: false, refreshAll: false, navigate: false });
			}
		};
	}}
>
	<input type="hidden" name={field} value={id} />
	{#each Object.entries(extra) as [k, v] (k)}<input type="hidden" name={k} value={v} />{/each}
	<button
		class={size === 'lg'
			? 'btn w-full ' + (on ? 'btn-o' : 'btn-p')
			: size === 'text'
				? 'txt'
				: 'sup'}
		type="submit"
		aria-pressed={on}
		disabled={busy}
		aria-label={label && size !== 'lg' ? `${on ? done : verb} ${n}: ${label}` : undefined}
	>
		{#if size === 'sm'}<Icon name="up" size={17} />{/if}
		{#if size === 'lg'}
			{on ? 'You support this' : 'Support this concern'}
		{:else if size === 'text'}
			{on ? done : verb}{n ? ` (${n})` : ''}
		{:else}
			<span>{on ? done : verb} {n}</span>
		{/if}
	</button>
</form>

<style>
	.txt {
		min-height: 44px;
		font-size: 14px;
		font-weight: 600;
		color: var(--muted);
	}
	.txt:hover,
	.txt[aria-pressed='true'] {
		color: var(--red-d);
	}
</style>
