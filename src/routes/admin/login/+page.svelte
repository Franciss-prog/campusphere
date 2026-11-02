<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { formState } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	const f = $derived(formState(form));
	const email = $derived(typeof f?.email === 'string' ? f.email : '');
	let busy = $state(false);
</script>

<svelte:head>
	<title>Staff sign in | Campusphere</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="wrap">
	<form
		class="lg"
		method="POST"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				busy = false;
				await update({ reset: false, navigate: false });
			};
		}}
	>
		<div class="brand disp"><span class="logo"><Icon name="chat" /></span>Campusphere</div>
		<h1 class="disp">Staff sign in</h1>
		<p class="l">For moderators and administrators. Visitors never need to sign in.</p>
		{#if f?.message}<p class="flash bad mb-5" role="alert">{f.message}</p>{/if}
		<div class="f">
			<label for="le">Email</label>
			<input
				id="le"
				class="input"
				name="email"
				type="email"
				autocomplete="username"
				required
				value={email}
			/>
		</div>
		<div class="f">
			<label for="lp">Password</label>
			<input
				id="lp"
				class="input"
				name="password"
				type="password"
				autocomplete="current-password"
				required
			/>
		</div>
		<button class="btn btn-p w-full" type="submit" disabled={busy}
			>{busy ? 'Signing in…' : 'Sign in'}</button
		>
		<a class="back2" href="/">Back to the public site</a>
		<p class="rate">Too many attempts will pause sign in for a few minutes.</p>
	</form>
</main>

<style>
	.wrap {
		min-height: 100vh;
		background: var(--deep);
		display: grid;
		place-items: center;
		padding: 40px 16px;
		position: relative;
		overflow: hidden;
	}
	.wrap::before {
		content: '';
		position: absolute;
		right: -220px;
		top: -220px;
		width: 760px;
		height: 760px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(208, 28, 35, 0.6), transparent 62%);
		pointer-events: none;
	}
	.lg {
		position: relative;
		width: 100%;
		max-width: 460px;
		background: #fff;
		border-radius: 28px;
		padding: 40px 40px 34px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-bottom: 22px;
		font-size: 22px;
	}
	.logo {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--red);
		color: #fff;
		display: grid;
		place-items: center;
	}
	h1 {
		font-size: 40px;
		line-height: 1;
	}
	.l {
		color: var(--muted);
		margin: 10px 0 26px;
	}
	.btn {
		min-height: 50px;
	}
	.back2 {
		display: block;
		text-align: center;
		margin-top: 18px;
		font-weight: 600;
		color: var(--muted);
		font-size: 15px;
		min-height: 44px;
		line-height: 44px;
	}
	.back2:hover {
		color: var(--red);
	}
	.rate {
		margin-top: 6px;
		text-align: center;
		font-size: 13.5px;
		color: var(--faint);
	}
	@media (max-width: 480px) {
		.lg {
			padding: 30px 22px 26px;
		}
	}
</style>
