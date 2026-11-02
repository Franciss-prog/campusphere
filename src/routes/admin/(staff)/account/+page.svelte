<script lang="ts">
	import { enhance } from '$app/forms';
	import Banner from '#lib/components/shell/Banner.svelte';
	import { formState } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const f = $derived(formState(form));
</script>

<svelte:head><title>Account | Campusphere staff</title></svelte:head>

<Banner variant="staff" title="Account" subtitle="Signed in as {data.email}." />

<form class="form-card mt-6 max-w-[560px]" method="POST" use:enhance>
	{#if f?.message}<p class="flash mb-5 {f.ok ? 'ok' : 'bad'}" role="status">{f.message}</p>{/if}
	<div class="f">
		<label for="cur">Current password</label><input
			id="cur"
			class="input"
			type="password"
			name="current"
			autocomplete="current-password"
			required
		/>
	</div>
	<div class="f">
		<label for="nw">New password <span class="hint">At least 12 characters.</span></label><input
			id="nw"
			class="input"
			type="password"
			name="next"
			autocomplete="new-password"
			minlength="12"
			required
		/>
	</div>
	<div class="f">
		<label for="cf">Repeat new password</label><input
			id="cf"
			class="input"
			type="password"
			name="confirm"
			autocomplete="new-password"
			minlength="12"
			required
		/>
	</div>
	<button class="btn btn-p" type="submit">Change password</button>
</form>
