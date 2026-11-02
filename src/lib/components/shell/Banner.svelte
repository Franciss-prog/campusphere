<script lang="ts">
	import type { Snippet } from 'svelte';
	import { spotlight } from '../motion/spotlight';

	let {
		title,
		subtitle,
		variant = 'public',
		action
	}: {
		title: string;
		subtitle?: string;
		/** `public`: red with cursor spotlight + dot grid. `staff`: deep, slim, no effects. */
		variant?: 'public' | 'staff';
		action?: Snippet;
	} = $props();
</script>

{#if variant === 'public'}
	<header class="banner on-dark" use:spotlight>
		<h1 class="disp">{title}</h1>
		{#if subtitle}<p>{subtitle}</p>{/if}
		{#if action}<div class="act">{@render action()}</div>{/if}
	</header>
{:else}
	<header class="banner staff on-dark">
		<h1 class="disp">{title}</h1>
		{#if subtitle}<p>{subtitle}</p>{/if}
		{#if action}<div class="act">{@render action()}</div>{/if}
	</header>
{/if}

<style>
	.banner {
		position: relative;
		overflow: hidden;
		border-radius: 28px;
		background: var(--red);
		color: #fff7f5;
		padding: 44px 52px 46px;
		--mx: 78%;
		--my: 20%;
	}
	.banner:not(.staff)::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			420px circle at var(--mx) var(--my),
			rgba(255, 255, 255, 0.24),
			transparent 62%
		);
	}
	.banner:not(.staff)::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.4;
		background-image: radial-gradient(rgba(255, 255, 255, 0.55) 1.2px, transparent 1.6px);
		background-size: 30px 30px;
		mask-image: radial-gradient(360px circle at var(--mx) var(--my), #000, transparent 70%);
	}
	.banner > :global(*) {
		position: relative;
		z-index: 1;
	}
	h1 {
		font-size: clamp(32px, 6.2vw, 92px);
		line-height: 0.92;
		overflow-wrap: anywhere;
	}
	p {
		margin-top: 16px;
		font-size: 19px;
		color: #fff1ee;
		max-width: 860px;
	}
	.act {
		margin-top: 26px;
	}
	.staff {
		background: var(--deep2);
		padding: 34px 44px;
	}
	.staff h1 {
		font-size: clamp(40px, 5vw, 60px);
	}
	@media (max-width: 1100px) {
		.banner {
			padding: 32px 24px;
		}
		p {
			font-size: 17px;
		}
	}
</style>
