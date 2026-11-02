<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	// Right slide-over dialog: focus trap, Escape to close, focus restored to the opener.
	// Rendered open from the server too (no-JS), so it is driven by `open` + an `onclose` handler
	// with a `closeHref` fallback link.
	let {
		open,
		title,
		closeHref,
		onclose,
		children
	}: {
		open: boolean;
		title: string;
		closeHref: string;
		onclose: () => void;
		children: Snippet;
	} = $props();

	let panel: HTMLElement | undefined = $state();
	let opener: Element | null = null;

	const FOCUSABLE =
		'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	$effect(() => {
		if (!open || !panel) return;
		opener = document.activeElement;
		const first =
			panel.querySelector<HTMLElement>('select, input, textarea') ??
			panel.querySelector<HTMLElement>(FOCUSABLE);
		const t = setTimeout(() => first?.focus(), 60);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			clearTimeout(t);
			document.body.style.overflow = prevOverflow;
			if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
		};
	});

	function keydown(e: KeyboardEvent) {
		if (!open || !panel) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
			return;
		}
		if (e.key !== 'Tab') return;
		const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
			(el) => el.offsetParent !== null
		);
		if (!items.length) return;
		const firstEl = items[0];
		const lastEl = items[items.length - 1];
		if (e.shiftKey && document.activeElement === firstEl) {
			e.preventDefault();
			lastEl.focus();
		} else if (!e.shiftKey && document.activeElement === lastEl) {
			e.preventDefault();
			firstEl.focus();
		}
	}
</script>

<svelte:window onkeydown={keydown} />

<div class="ov" class:on={open} aria-hidden="true" onclick={onclose}></div>
<div
	class="slide"
	class:on={open}
	role="dialog"
	aria-modal="true"
	aria-labelledby="slide-title"
	bind:this={panel}
	inert={!open}
>
	<a
		class="x"
		href={closeHref}
		aria-label="Close"
		onclick={(e) => {
			e.preventDefault();
			onclose();
		}}><Icon name="close" size={18} /></a
	>
	<h2 class="disp" id="slide-title">{title}</h2>
	{#if open}{@render children()}{/if}
</div>

<style>
	.ov {
		position: fixed;
		inset: 0;
		background: rgba(30, 15, 17, 0.5);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.3s;
		z-index: 40;
	}
	.ov.on {
		opacity: 1;
		pointer-events: auto;
	}
	.slide {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 500px;
		max-width: 100%;
		background: #fff;
		z-index: 41;
		transform: translateX(102%);
		transition:
			transform 0.45s var(--ease),
			visibility 0s linear 0.45s;
		padding: 30px 34px 40px;
		overflow: auto;
		box-shadow: -30px 0 60px -30px rgba(0, 0, 0, 0.45);
		visibility: hidden;
	}
	.slide.on {
		transform: none;
		visibility: visible;
		transition: transform 0.45s var(--ease);
	}
	.x {
		position: absolute;
		right: 20px;
		top: 20px;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1.5px solid var(--line);
		display: grid;
		place-items: center;
		color: var(--muted);
	}
	.x:hover {
		border-color: var(--red);
		color: var(--red);
	}
	h2 {
		font-size: 30px;
		line-height: 1.05;
		margin: 6px 48px 10px 0;
	}
	@media (max-width: 640px) {
		.slide {
			padding: 24px 18px 32px;
		}
	}
</style>
