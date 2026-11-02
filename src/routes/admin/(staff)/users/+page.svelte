<script lang="ts">
	import { enhance } from '$app/forms';
	import Banner from '#lib/components/shell/Banner.svelte';
	import { formState } from '#lib/form-state.ts';
	import { timeAgo } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const f = $derived(formState(form));
</script>

<svelte:head><title>Moderators | Campusphere staff</title></svelte:head>

<Banner
	variant="staff"
	title="Moderators"
	subtitle="Only administrators can add or remove staff accounts."
/>

{#if f?.message}<p class="flash mt-5 {f.ok ? 'ok' : 'bad'}" role="status">{f.message}</p>{/if}
{#if typeof f?.temp === 'string'}
	<div class="notice mt-4" role="status">
		<b>Temporary password for {f.invited}</b>
		<code class="tmp">{f.temp}</code>
		Share it privately (not by email in plain text if you can avoid it). It is shown only once. Ask them
		to change it under Account after signing in.
	</div>
{/if}

<form class="toolbar" method="POST" action="?/invite" use:enhance>
	<label
		>Email<input
			class="control w-[300px] max-w-full"
			type="email"
			name="email"
			placeholder="name@example.com"
			required
		/></label
	>
	<label
		>Role
		<select class="control" name="role">
			<option value="MODERATOR">Moderator</option>
			<option value="ADMIN">Administrator</option>
		</select>
	</label>
	<button class="btn btn-p" type="submit">Create account</button>
</form>

<div class="tblwrap">
	<table class="t">
		<caption class="sr-only">Staff accounts</caption>
		<thead
			><tr
				><th scope="col">Account</th><th scope="col">Role</th><th scope="col">Last sign in</th><th
					scope="col"><span class="sr-only">Action</span></th
				></tr
			></thead
		>
		<tbody>
			{#each data.staff as s (s.id)}
				<tr>
					<td
						><b>{s.email}</b>{#if s.id === data.meId}<small>You</small>{/if}</td
					>
					<td>
						{#if s.id === data.meId}
							{s.role === 'ADMIN' ? 'Administrator' : 'Moderator'}
						{:else}
							<form method="POST" action="?/role" use:enhance class="flex items-center gap-2">
								<input type="hidden" name="id" value={s.id} />
								<label class="sr-only" for="role-{s.id}">Role for {s.email}</label>
								<select
									id="role-{s.id}"
									class="control"
									name="role"
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
								>
									<option value="MODERATOR" selected={s.role === 'MODERATOR'}>Moderator</option>
									<option value="ADMIN" selected={s.role === 'ADMIN'}>Administrator</option>
								</select>
								<noscript><button class="lk" type="submit">Save</button></noscript>
							</form>
						{/if}
					</td>
					<td>{s.lastLoginAt ? timeAgo(s.lastLoginAt) : 'Never'}</td>
					<td class="num">
						{#if s.id !== data.meId}
							<form method="POST" action="?/remove" use:enhance>
								<input type="hidden" name="id" value={s.id} />
								<button
									class="lk"
									type="submit"
									onclick={(e) => {
										if (!confirm(`Remove ${s.email}? They will be signed out immediately.`))
											e.preventDefault();
									}}>Remove<span class="sr-only"> {s.email}</span></button
								>
							</form>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.t td small {
		display: block;
	}
	.tmp {
		display: block;
		margin: 8px 0;
		font-size: 18px;
		font-weight: 700;
		background: var(--tint);
		padding: 8px 12px;
		border-radius: 10px;
		user-select: all;
		overflow-wrap: anywhere;
	}
</style>
