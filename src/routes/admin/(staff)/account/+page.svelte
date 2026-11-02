<script lang="ts">
	import { enhance } from '$app/forms';
	import Banner from '#lib/components/shell/Banner.svelte';
	import { formState, stay } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const pw = $derived(formState(form, 'password'));
	const pr = $derived(formState(form, 'profile'));
</script>

<svelte:head><title>Account | Campusphere staff</title></svelte:head>

<Banner variant="staff" title="Account" subtitle="Signed in as {data.email}." />

{#if data.mustChangePassword}
	<p class="notice mt-6 max-w-[560px]" role="status">
		You signed in with a temporary password. Choose your own password to continue.
	</p>
{/if}

<form class="form-card mt-6 max-w-[560px]" method="POST" action="?/password" use:enhance={stay}>
	<h2 class="mb-4 text-lg font-semibold text-ink">Password</h2>
	{#if pw?.message}<p class="flash mb-5 {pw.ok ? 'ok' : 'bad'}" role="status">{pw.message}</p>{/if}
	<div class="f">
		<label for="cur">{data.mustChangePassword ? 'Temporary password' : 'Current password'}</label
		><input
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

{#if !data.mustChangePassword}
	<form class="form-card mt-6 max-w-[560px]" method="POST" action="?/profile" use:enhance={stay}>
		<h2 class="mb-4 text-lg font-semibold text-ink">Name</h2>
		{#if pr?.message}<p class="flash mb-5 {pr.ok ? 'ok' : 'bad'}" role="status">
				{pr.message}
			</p>{/if}
		<div class="f">
			<label for="dn"
				>Display name <span class="hint"
					>Shown to other staff in the admin area only. Never shown publicly.</span
				></label
			><input
				id="dn"
				class="input"
				name="displayName"
				maxlength="60"
				autocomplete="name"
				value={data.displayName ?? ''}
			/>
		</div>
		<button class="btn btn-o" type="submit">Save name</button>
	</form>
{/if}
