<script lang="ts">
	import { page } from '$app/state';
	import * as pub from '$app/env/public';

	// Hidden anti-spam fields for anonymous forms: honeypot, signed render time, and Turnstile
	// (only when a site key is configured). Field names must match src/lib/server/safety-core.ts.
	let { resetKey = 0 }: { resetKey?: number } = $props();

	const siteKey = pub.TURNSTILE_SITE_KEY;
	let box: HTMLDivElement | undefined = $state();
	let widgetId: string | undefined;

	type Turnstile = {
		render: (el: HTMLElement, opts: Record<string, unknown>) => string;
		reset: (id: string) => void;
		remove: (id: string) => void;
	};

	function loadScript(): Promise<Turnstile> {
		const w = window as unknown as { turnstile?: Turnstile };
		if (w.turnstile) return Promise.resolve(w.turnstile);
		return new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			s.async = true;
			s.onload = () => (w.turnstile ? resolve(w.turnstile) : reject());
			s.onerror = reject;
			document.head.append(s);
		});
	}

	$effect(() => {
		if (!siteKey || !box) return;
		let ts: Turnstile | undefined;
		loadScript()
			.then((t) => {
				ts = t;
				if (box) widgetId = t.render(box, { sitekey: siteKey, theme: 'light', size: 'flexible' });
			})
			.catch(() => {});
		return () => {
			if (ts && widgetId) ts.remove(widgetId);
		};
	});

	// After each submission the token is spent; get a fresh one.
	$effect(() => {
		void resetKey;
		const w = window as unknown as { turnstile?: Turnstile };
		if (resetKey && widgetId) w.turnstile?.reset(widgetId);
	});
</script>

<div class="hp" aria-hidden="true">
	<label
		>Leave this field empty <input
			type="text"
			name="website"
			tabindex="-1"
			autocomplete="off"
		/></label
	>
</div>
<input type="hidden" name="_ts" value={page.data.stamp ?? ''} />
{#if siteKey}
	<div class="ts" bind:this={box}></div>
{/if}

<style>
	.hp {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	.ts {
		margin: 4px 0 18px;
		min-height: 65px;
	}
</style>
