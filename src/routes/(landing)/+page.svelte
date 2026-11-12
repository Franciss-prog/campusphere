<script lang="ts">
	import AnimatedHeading from '#lib/components/motion/AnimatedHeading.svelte';
	import CoreValuesCube from '#lib/components/motion/CoreValuesCube.svelte';
	import Magnetic from '#lib/components/motion/Magnetic.svelte';
	import ScrollWords from '#lib/components/motion/ScrollWords.svelte';
	import { reducedMotion } from '#lib/components/motion/reduced.svelte.ts';
	import { spotlight } from '#lib/components/motion/spotlight.ts';
	import CampaignCard from '#lib/components/campaigns/CampaignCard.svelte';
	import Engage from '#lib/components/landing/Engage.svelte';
	import Eyebrow from '#lib/components/landing/Eyebrow.svelte';
	import LatestFeed from '#lib/components/landing/LatestFeed.svelte';
	import Objectives from '#lib/components/landing/Objectives.svelte';
	import ParticipatePaths from '#lib/components/landing/ParticipatePaths.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { CAMPAIGNS, CYCLE } from '#lib/content/site.ts';
	import type { CampaignProgress } from '#lib/campaigns.ts';
	import { plural } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const reduce = reducedMotion();

	// The page follows one flow: Awareness → Participation → Positive change.
	const FLOW = [
		{ id: 'discover', label: 'Discover', step: 'Awareness' },
		{ id: 'participate', label: 'Participate', step: 'Participation' },
		{ id: 'engage', label: 'Engage', step: 'Positive change' }
	] as const;
	const LINKS = [
		...FLOW.map((f) => [`#${f.id}`, f.label] as const),
		['/campaigns', 'Campaigns'] as const
	];

	// ---- Draggable notes (decorative; pointer only, hidden from assistive tech) ----
	function draggable(node: HTMLElement) {
		let sx = 0,
			sy = 0,
			ox = 0,
			oy = 0,
			dragging = false;
		const down = (e: PointerEvent) => {
			dragging = true;
			node.setPointerCapture(e.pointerId);
			node.classList.add('drag');
			sx = e.clientX;
			sy = e.clientY;
			ox = parseFloat(node.dataset.dx || '0');
			oy = parseFloat(node.dataset.dy || '0');
		};
		const move = (e: PointerEvent) => {
			if (!dragging) return;
			const dx = ox + e.clientX - sx;
			const dy = oy + e.clientY - sy;
			node.dataset.dx = String(dx);
			node.dataset.dy = String(dy);
			node.style.setProperty('--dx', `${dx}px`);
			node.style.setProperty('--dy', `${dy}px`);
		};
		const up = () => {
			dragging = false;
			node.classList.remove('drag');
		};
		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', up);
		node.addEventListener('pointercancel', up);
		return {
			destroy() {
				node.removeEventListener('pointerdown', down);
				node.removeEventListener('pointermove', move);
				node.removeEventListener('pointerup', up);
				node.removeEventListener('pointercancel', up);
			}
		};
	}

	// ---- Steps progress line ----
	let srow: HTMLElement | undefined = $state();
	let progress = $state(1);
	$effect(() => {
		if (!srow || reduce.value) {
			progress = 1;
			return;
		}
		const el = srow;
		let frame = 0;
		const update = () => {
			const r = el.getBoundingClientRect();
			progress = Math.min(1, Math.max(0, (innerHeight * 0.8 - r.top) / (innerHeight * 0.5)));
		};
		const on = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(update);
		};
		update();
		addEventListener('scroll', on, { passive: true });
		addEventListener('resize', on);
		return () => {
			cancelAnimationFrame(frame);
			removeEventListener('scroll', on);
			removeEventListener('resize', on);
		};
	});

	// Hero stickers: one pinned note per campaign (decorative; the cards below hold the links).
	const STICKERS = [
		{ x: 'calc(100% - 570px)', y: '150px', r: '-3deg', d: '0s', s: '1.3s' },
		{ x: 'calc(100% - 300px)', y: '124px', r: '3deg', d: '1.2s', s: '1.5s' },
		{ x: 'calc(100% - 550px)', y: '420px', r: '2deg', d: '.6s', s: '1.7s' },
		{ x: 'calc(100% - 290px)', y: '400px', r: '-2.5deg', d: '2s', s: '1.9s' }
	];

	// Marquee: every campaign's suggested actions, so the band reads as a call to act.
	const ACTIONS = CAMPAIGNS.flatMap((c) => c.actions.map((a) => a.replace(/\.$/, '')));
	const marquee = [...ACTIONS, ...ACTIONS];

	function stickerMeta(p: CampaignProgress): string {
		const n = p.total + p.articles;
		if (!n) return 'Be the first to join';
		return plural(n, 'contribution') + (p.resolved ? ` · ${p.resolved} resolved` : '');
	}
</script>

<svelte:head>
	<title>Campusphere: ethics in action at Mabini Campus</title>
	<meta
		name="description"
		content="Ethics in action for Batangas State University – Mabini Campus. Learn the values, join a campus campaign, report a concern or share an idea, and see what changes. No account, no names."
	/>
</svelte:head>

<a class="skip" href="#main">Skip to content</a>

<header class="hero on-dark" data-landing use:spotlight>
	<nav aria-label="Main">
		<a class="brand disp" href="/"
			><span class="logo"><Icon name="chat" size={21} /></span>Campusphere</a
		>
		<ul class="links">
			{#each LINKS as [href, label] (href)}
				<li>
					<a {href}
						><span class="sr-only">{label}</span><span class="roll" aria-hidden="true"
							><span>({label})</span><span>({label})</span></span
						></a
					>
				</li>
			{/each}
		</ul>
		<Magnetic><a class="hbtn w sm" href="/concerns/new">Report a concern</a></Magnetic>
	</nav>

	<div class="hcopy" id="main">
		<p class="badge"><Icon name="target" size={16} />Ethics in Action Campaign</p>
		<AnimatedHeading
			class="disp h1"
			lines={['A better', 'campus starts', 'with you.']}
			indents={['0', '2.5vw', '0.6vw']}
		/>
		<p class="tagline disp">
			Connect. Share. Collaborate. <span class="u">Improve.</span>
		</p>
		<p class="sub">
			A platform for every Red Spartan to voice concerns, suggest solutions, and help build a
			better, more responsible campus community. No account, no names.
		</p>
		<div class="cta-row">
			<Magnetic
				><a class="hbtn w" href="/campaigns">Take action<Icon name="arrow" size={18} /></a
				></Magnetic
			>
			<Magnetic
				><a class="hbtn l" href="#discover">Learn more<Icon name="down" size={18} /></a></Magnetic
			>
		</div>
		<nav class="ribbon" aria-label="How Campusphere works">
			<ol>
				{#each FLOW as f, i (f.id)}
					<li>
						<a href="#{f.id}"
							><span class="rn disp" aria-hidden="true">0{i + 1}</span><span class="rt"
								><b>{f.label}</b><small>{f.step}</small></span
							></a
						>
					</li>
				{/each}
			</ol>
		</nav>
	</div>

	<div class="notes" aria-hidden="true">
		{#each data.campaigns as c, i (c.slug)}
			{@const pos = STICKERS[i % STICKERS.length]}
			<div
				class="sticker"
				style="--x:{pos.x};--y:{pos.y};--r:{pos.r};--d:{pos.d};--s:{pos.s};--sw:250px"
				use:draggable
			>
				<div class="in">
					<i class="pin"></i>
					<div class="shead">
						<span class="sic"><Icon name={c.icon} size={20} /></span>
						{#if c.chip}<span class="sval" class:focus={c.chip.focus}>{c.chip.name}</span>{/if}
					</div>
					<h4 class="disp">{c.title}</h4>
					<p>{c.actions[0]}</p>
					<div class="meta">
						<span>{stickerMeta(c.progress)}</span>
					</div>
				</div>
			</div>
		{/each}
		<div class="hint">Drag the campaigns around</div>
	</div>

	<div class="marq" aria-hidden="true">
		<div class="track">
			{#each marquee as m, i (i)}
				<span
					>{m}<svg viewBox="0 0 24 24"
						><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" /></svg
					></span
				>
			{/each}
		</div>
	</div>
</header>

<main>
	<!-- ===== 01 Discover · Awareness ===== -->
	<section class="vm" id="discover" aria-labelledby="vm-h">
		<Eyebrow n="01" label="Discover" step="Awareness" />
		<h2 id="vm-h" class="sr-only">Vision and mission</h2>
		{#if data.statement?.vision || data.statement?.mission}
			{#if data.statement.vision}
				<div class="row">
					<div class="tag disp">Vision</div>
					<div>
						<div class="intro">
							From the <a href={data.pinnedSlug ? `/blog/${data.pinnedSlug}` : '/blog'}
								>Campus Blog</a
							>: what our university stands for.
						</div>
						<ScrollWords class="vis disp" text={data.statement.vision} />
					</div>
				</div>
			{/if}
			{#if data.statement.mission}
				<div class="row">
					<div class="tag disp">Mission</div>
					<ScrollWords class="mis serif" text={data.statement.mission} />
				</div>
			{/if}
		{:else}
			<div class="panel fb">
				<p>The university's vision and mission will appear here once they are published.</p>
				<a class="btn btn-o" href="/about">How Campusphere works</a>
			</div>
		{/if}
	</section>

	<section class="vals on-dark" aria-labelledby="vals-h">
		{#if data.statement?.values.length}
			<CoreValuesCube
				values={data.statement.values}
				title="Red Spartan Core Values"
				headingId="vals-h"
			/>
		{:else}
			<h2 class="disp" id="vals-h">Red Spartan Core Values</h2>
			<div class="panel fb">
				<p>The core values will appear here once they are published.</p>
				<a class="btn btn-o" href="/about">How Campusphere works</a>
			</div>
		{/if}
	</section>

	<section class="camps" id="campaigns" aria-labelledby="camps-h">
		<h2 class="disp" id="camps-h">Values are what we say. Campaigns are what we do.</h2>
		<p class="lead">
			Four Action Campaigns turn the core values into everyday habits. Try the suggested actions,
			then report or recommend under a campaign so its progress shows.
		</p>
		<div class="cgrid">
			{#each data.campaigns as c (c.slug)}
				<CampaignCard campaign={c} />
			{/each}
		</div>
		<p class="more"><a class="btn btn-o" href="/campaigns">See all campaigns</a></p>
	</section>

	<Objectives />

	<LatestFeed posts={data.latest.posts} concerns={data.latest.concerns} />

	<!-- ===== 02 Participate · Participation ===== -->
	<ParticipatePaths campaigns={data.campaigns} />

	<section class="steps" aria-labelledby="steps-h">
		<h2 class="disp" id="steps-h">From a complaint to a fix, in the open.</h2>
		<p class="lead">
			Every concern and recommendation follows the same path, and everyone can see where it stands.
		</p>
		<ol class="srow" bind:this={srow} style="--p:{progress}">
			{#each CYCLE as s, i (s.title)}
				<li class="step" class:on={progress >= i / (CYCLE.length - 1) - 0.02}>
					<div class="n" aria-hidden="true">{i + 1}</div>
					<b>{s.title}</b><span>{s.text}</span>
				</li>
			{/each}
		</ol>
		<p class="more"><a class="lk" href="/about">Read how Campusphere works</a></p>
	</section>

	<!-- ===== 03 Engage · Positive change ===== -->
	<Engage campaigns={data.campaigns} stats={data.stats} featured={data.featured} />

	<section class="end on-dark" use:spotlight aria-labelledby="end-h">
		<h2 class="disp" id="end-h">Your campus is listening.</h2>
		<div class="row">
			<p>No account. No names. Say what needs to change and let the community help fix it.</p>
			<div class="btns">
				<Magnetic><a class="hbtn w big" href="/concerns/new">Report a concern</a></Magnetic>
				<Magnetic><a class="hbtn l big" href="/recommendations">Share a recommendation</a></Magnetic
				>
			</div>
		</div>
		<footer>
			<nav aria-label="Footer" class="fnav">
				<a href="/campaigns">Action Campaigns</a>
				<a href="/recommendations">Recommendations</a>
				<a href="/blog">Blog</a>
				<a href="/concerns">Concerns</a>
				<a href="/solutions">Solution Hub</a>
				<a href="/tracker">Impact Tracker</a>
				<a href="/about">About</a>
				<a href="/guidelines">Guidelines</a>
				<a href="/privacy">Privacy</a>
				<a href="/admin/login">Staff sign in</a>
			</nav>
			<div class="fl">
				<span>Campusphere – Connect. Share. Collaborate. Improve.</span><span
					>Batangas State University – Mabini Campus</span
				>
			</div>
		</footer>
	</section>
</main>

<style>
	:global(body) {
		overflow-x: hidden;
	}
	/* Smooth anchor scrolling on this page only, and only when motion is welcome. */
	@media (prefers-reduced-motion: no-preference) {
		:global(html:has([data-landing])) {
			scroll-behavior: smooth;
		}
	}
	#discover,
	#campaigns {
		scroll-margin-top: 16px;
	}
	.skip {
		position: absolute;
		left: -9999px;
		z-index: 100;
		background: #fff;
		color: var(--ink);
		padding: 10px 16px;
		border-radius: 999px;
		font-weight: 700;
		top: 8px;
	}
	.skip:focus {
		left: 16px;
	}
	.on-dark :global(:focus-visible) {
		outline-color: #fff;
		outline-offset: 4px;
	}

	/* ---------- HERO ---------- */
	.hero {
		position: relative;
		min-height: max(760px, 100vh);
		background: var(--red);
		color: #fff6f3;
		overflow: hidden;
		--mx: 70%;
		--my: 30%;
	}
	.hero::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			520px circle at var(--mx) var(--my),
			rgba(255, 255, 255, 0.26),
			transparent 62%
		);
	}
	.hero::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.35;
		background-image: radial-gradient(rgba(255, 255, 255, 0.5) 1.2px, transparent 1.6px);
		background-size: 34px 34px;
		mask-image: radial-gradient(420px circle at var(--mx) var(--my), #000, transparent 70%);
	}
	nav[aria-label='Main'] {
		position: absolute;
		z-index: 5;
		left: 0;
		right: 0;
		top: 0;
		height: 96px;
		padding: 0 64px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 26px;
	}
	.logo {
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background: #fff6f3;
		color: var(--red);
		display: grid;
		place-items: center;
		transition: transform 0.5s var(--ease);
	}
	.brand:hover .logo {
		transform: rotate(-14deg) scale(1.08);
	}
	.links {
		display: flex;
		gap: 40px;
		font-size: 16px;
		font-weight: 500;
		list-style: none;
	}
	.links a {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
	}
	.roll {
		display: inline-block;
		overflow: hidden;
		height: 1.3em;
		line-height: 1.3em;
	}
	.roll span {
		display: block;
		transition: transform 0.5s cubic-bezier(0.2, 0.85, 0.2, 1);
	}
	a:hover .roll span,
	a:focus-visible .roll span {
		transform: translateY(-100%);
	}
	.hbtn {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 16px 30px;
		border-radius: 999px;
		font-weight: 700;
		font-size: 17px;
		white-space: nowrap;
		transition:
			background 0.3s,
			color 0.3s;
	}
	.hbtn.w {
		background: #fff6f3;
		color: var(--red-d);
	}
	.hbtn.w:hover {
		background: #fff;
	}
	.hbtn.l {
		border: 2px solid rgba(255, 246, 243, 0.7);
		color: #fff6f3;
	}
	.hbtn.l:hover {
		background: rgba(255, 246, 243, 0.14);
	}
	.hbtn.sm {
		padding: 12px 22px;
		font-size: 15px;
	}
	.hbtn.big {
		font-size: 20px;
		padding: 22px 40px;
	}
	.hcopy {
		position: relative;
		z-index: 3;
		padding: 136px 64px 130px;
		max-width: 980px;
	}
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 26px;
		padding: 8px 16px 8px 12px;
		border-radius: 999px;
		background: rgba(52, 8, 12, 0.24);
		border: 1px solid rgba(255, 246, 243, 0.35);
		font-size: 14.5px;
		font-weight: 700;
		color: #fff6f3;
		opacity: 0;
		animation: fade 0.9s ease forwards 0.2s;
	}
	.tagline {
		margin-top: 30px;
		font-size: clamp(20px, 1.9vw, 28px);
		letter-spacing: -0.02em;
		color: #fff6f3;
		opacity: 0;
		animation: fade 0.9s ease forwards 1.3s;
	}
	.tagline .u {
		background: linear-gradient(#fff6f3, #fff6f3) no-repeat 0 100% / 100% 3px;
		padding-bottom: 2px;
	}
	.ribbon {
		margin-top: 34px;
		opacity: 0;
		animation: fade 0.9s ease forwards 1.9s;
	}
	.ribbon ol {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		list-style: none;
	}
	.ribbon li {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.ribbon li + li::before {
		content: '';
		width: 22px;
		height: 2px;
		background: rgba(255, 246, 243, 0.55);
	}
	.ribbon a {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: 52px;
		padding: 6px 16px 6px 6px;
		border-radius: 999px;
		background: rgba(52, 8, 12, 0.22);
		border: 1px solid rgba(255, 246, 243, 0.3);
		color: #fff6f3;
		transition: background 0.25s;
	}
	.ribbon a:hover {
		background: rgba(52, 8, 12, 0.4);
	}
	.rn {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: #fff6f3;
		color: var(--red-d);
		display: grid;
		place-items: center;
		font-size: 14px;
	}
	.rt {
		display: flex;
		flex-direction: column;
		line-height: 1.15;
	}
	.rt b {
		font-size: 15.5px;
	}
	.rt small {
		font-size: 13px;
		color: #fff1ee;
	}
	.hcopy :global(.h1) {
		font-size: clamp(46px, 6.4vw, 112px);
		line-height: 0.92;
		color: #fff6f3;
		letter-spacing: -0.045em;
	}
	.sub {
		margin-top: 18px;
		max-width: 520px;
		font-size: 21px;
		line-height: 1.55;
		color: #fff1ee;
		opacity: 0;
		animation: fade 0.9s ease forwards 1.5s;
	}
	.cta-row {
		margin-top: 30px;
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
		opacity: 0;
		animation: fade 0.9s ease forwards 1.7s;
	}
	@keyframes fade {
		to {
			opacity: 1;
		}
	}
	.sticker {
		position: absolute;
		z-index: 4;
		left: var(--x);
		top: var(--y);
		width: var(--sw, 270px);
		transform: translate(var(--dx, 0px), var(--dy, 0px)) rotate(var(--r, 0deg));
		cursor: grab;
		touch-action: none;
		user-select: none;
		transition: transform 0.25s var(--ease);
		opacity: 0;
		animation: fade 0.8s ease forwards;
		animation-delay: var(--s, 1.2s);
	}
	.sticker:global(.drag) {
		cursor: grabbing;
		transition: none;
		z-index: 9;
	}
	.sticker .in {
		background: #fff;
		color: var(--ink);
		border-radius: 18px;
		padding: 20px 20px 16px;
		box-shadow: 0 26px 40px -22px rgba(60, 5, 8, 0.75);
		animation: float 6s ease-in-out infinite;
		animation-delay: var(--d, 0s);
		position: relative;
	}
	.sticker:global(.drag) .in {
		animation-play-state: paused;
	}
	@keyframes float {
		50% {
			transform: translateY(-12px);
		}
	}
	.pin {
		position: absolute;
		top: -8px;
		left: 50%;
		margin-left: -10px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #ff9a9a, #d01c23 45%, #7a0c12);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.4);
	}
	.sticker h4 {
		font-size: 18px;
		line-height: 1.25;
		margin: 11px 0 4px;
		letter-spacing: -0.02em;
	}
	.shead {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.sic {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: var(--tint);
		color: var(--red);
		display: grid;
		place-items: center;
	}
	.sval {
		font-size: 12.5px;
		font-weight: 700;
		padding: 4px 11px;
		border-radius: 999px;
		border: 1px solid var(--line);
		color: var(--red-d);
	}
	.sval.focus {
		background: var(--red);
		border-color: var(--red);
		color: #fff;
	}
	.sticker p {
		font-size: 14px;
		line-height: 1.45;
		color: var(--muted);
	}
	.sticker .meta {
		margin-top: 11px;
		display: flex;
		gap: 14px;
		font-size: 13px;
		color: var(--muted);
	}
	.hint {
		position: absolute;
		z-index: 3;
		right: 64px;
		bottom: 106px;
		font-size: 14px;
		color: #fff1ee;
		opacity: 0;
		animation: fade 1s ease forwards 2.6s;
	}
	.marq {
		position: absolute;
		z-index: 3;
		left: 0;
		right: 0;
		bottom: 0;
		height: 72px;
		background: var(--red-d);
		overflow: hidden;
		display: flex;
		align-items: center;
		border-top: 1px solid rgba(255, 255, 255, 0.18);
	}
	.track {
		display: flex;
		flex: none;
		white-space: nowrap;
		animation: marq 38s linear infinite;
	}
	.marq:hover .track {
		animation-play-state: paused;
	}
	.track span {
		display: inline-flex;
		align-items: center;
		gap: 22px;
		padding-right: 22px;
		font-size: 19px;
		font-weight: 600;
		color: #fff1ee;
	}
	.track svg {
		width: 18px;
		height: 18px;
		color: #ff8f8f;
		fill: currentColor;
	}
	@keyframes marq {
		to {
			transform: translateX(-50%);
		}
	}

	/* ---------- VISION / MISSION ---------- */
	.vm {
		padding: 130px 64px 140px;
		background: var(--rose);
	}
	.vm .row {
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
		gap: 40px;
	}
	.vm .row + .row {
		margin-top: 120px;
	}
	.tag {
		font-size: 18px;
		color: var(--red);
		padding-top: 16px;
	}
	.vm :global(.vis) {
		font-size: clamp(40px, 5.6vw, 88px);
		line-height: 1.04;
		max-width: 1180px;
		letter-spacing: -0.045em;
	}
	.vm :global(.mis) {
		font-size: clamp(24px, 2.5vw, 38px);
		line-height: 1.5;
		max-width: 1000px;
	}
	.intro {
		font-size: 18px;
		color: var(--muted);
		margin-bottom: 34px;
		max-width: 480px;
	}
	.intro a {
		color: var(--red-d);
		font-weight: 600;
		text-decoration: underline;
	}

	.fb {
		max-width: 620px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 16px;
		color: var(--ink);
		font-size: 17px;
	}
	.fb a:focus-visible {
		outline-color: var(--red);
	}

	/* ---------- VALUES ---------- */
	.vals {
		background: var(--deep);
		color: #fff6f3;
		padding: 140px 64px;
		position: relative;
		overflow: hidden;
	}
	.vals::before {
		content: '';
		position: absolute;
		right: -200px;
		top: 50%;
		width: 900px;
		height: 900px;
		margin-top: -450px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(208, 28, 35, 0.55), transparent 62%);
		pointer-events: none;
	}

	.vals > h2 {
		position: relative;
		font-size: clamp(40px, 4.6vw, 72px);
		line-height: 1;
		margin-bottom: 28px;
	}
	.vals > .fb {
		position: relative;
	}

	/* ---------- CAMPAIGNS ---------- */
	.camps {
		padding: 120px 64px;
		background: #fff;
	}
	.camps h2 {
		font-size: clamp(36px, 4.6vw, 72px);
		line-height: 1;
		max-width: 980px;
	}
	.camps .lead {
		margin-top: 16px;
		font-size: 19px;
		color: var(--muted);
		max-width: 640px;
		line-height: 1.55;
	}
	.cgrid {
		margin-top: 48px;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}

	/* ---------- STEPS ---------- */
	.steps {
		padding: 120px 64px;
		background: #fff;
		border-top: 1px solid var(--line2);
	}
	.steps h2 {
		font-size: clamp(40px, 4.6vw, 72px);
		line-height: 1;
		max-width: 760px;
	}
	.steps .lead {
		margin-top: 16px;
		font-size: 19px;
		color: var(--muted);
		max-width: 520px;
		line-height: 1.55;
	}
	.srow {
		position: relative;
		margin-top: 70px;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 28px;
		list-style: none;
	}
	.srow::before,
	.srow::after {
		content: '';
		position: absolute;
		left: 0;
		top: 28px;
		height: 4px;
		border-radius: 2px;
	}
	.srow::before {
		right: 0;
		background: #f0dad7;
	}
	.srow::after {
		background: var(--red);
		width: calc(var(--p) * 100%);
	}
	.step {
		position: relative;
		z-index: 1;
	}
	.step .n {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: #fff;
		border: 3px solid #e5cac7;
		display: grid;
		place-items: center;
		font-weight: 800;
		font-size: 22px;
		color: #b08d8a;
		transition: all 0.5s var(--ease);
		font-family: var(--font-display);
	}
	.step.on .n {
		background: var(--red);
		border-color: var(--red);
		color: #fff;
		transform: scale(1.12) rotate(-6deg);
	}
	.step b {
		display: block;
		margin-top: 22px;
		font-size: 26px;
		letter-spacing: -0.03em;
		font-family: var(--font-display);
		color: #9a7c79;
		transition: color 0.4s;
	}
	.step span {
		display: block;
		margin-top: 8px;
		font-size: 16.5px;
		line-height: 1.5;
		color: #9a7c79;
		max-width: 250px;
		transition: color 0.4s;
	}
	.step.on b {
		color: var(--ink);
	}
	.step.on span {
		color: var(--muted);
	}
	.more {
		margin-top: 40px;
	}

	/* ---------- END ---------- */
	.end {
		position: relative;
		background: var(--red);
		color: #fff6f3;
		padding: 160px 64px 40px;
		overflow: hidden;
		--mx: 50%;
		--my: 40%;
	}
	.end::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			520px circle at var(--mx) var(--my),
			rgba(255, 255, 255, 0.24),
			transparent 62%
		);
	}
	.end h2 {
		position: relative;
		font-size: clamp(60px, 10.5vw, 168px);
		line-height: 0.9;
		max-width: 1300px;
		letter-spacing: -0.045em;
	}
	.end .row {
		position: relative;
		margin-top: 60px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 30px;
	}
	.end .btns {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
	}
	.end p {
		font-size: 21px;
		color: #fff1ee;
		max-width: 480px;
		line-height: 1.5;
	}
	footer {
		position: relative;
		margin-top: 130px;
		padding-top: 28px;
		border-top: 1px solid rgba(255, 255, 255, 0.25);
		font-size: 15px;
		color: #fff1ee;
	}
	.fnav {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 24px;
		margin-bottom: 18px;
	}
	.fnav a {
		color: #fff6f3;
		font-weight: 600;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.fnav a:hover {
		text-decoration: underline;
	}
	.fl {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	/* ---------- Responsive ---------- */
	@media (max-width: 1240px) {
		.notes {
			display: none;
		}
	}
	@media (max-width: 980px) {
		nav[aria-label='Main'] {
			padding: 0 16px;
			height: 80px;
		}
		.brand {
			font-size: 21px;
		}
		.links {
			display: none;
		}
		.hcopy {
			padding: 120px 16px 120px;
		}
		.sub {
			font-size: 18px;
			margin-top: 28px;
		}
		.vm,
		.vals,
		.camps,
		.steps,
		.end {
			padding-left: 16px;
			padding-right: 16px;
		}
		.camps {
			padding-top: 80px;
			padding-bottom: 80px;
		}
		.cgrid {
			grid-template-columns: 1fr;
			margin-top: 32px;
		}
		.hbtn.big {
			font-size: 17px;
			padding: 18px 28px;
		}
		.vm {
			padding-top: 100px;
			padding-bottom: 100px;
		}
		.vm .row {
			grid-template-columns: 1fr;
			gap: 6px;
		}
		.vm .row + .row {
			margin-top: 70px;
		}
		.vals,
		.steps {
			padding-top: 80px;
			padding-bottom: 80px;
		}
		.srow {
			grid-template-columns: 1fr;
			gap: 30px;
			margin-top: 60px;
		}
		.srow::before,
		.srow::after {
			display: none;
		}
		.end {
			padding-top: 100px;
		}
		.end .row {
			flex-direction: column;
			align-items: flex-start;
		}
		footer {
			margin-top: 80px;
		}
		.marq {
			height: 60px;
		}
		.track span {
			font-size: 16px;
		}
	}
	@media (max-width: 640px) {
		.ribbon ol {
			flex-direction: column;
			align-items: flex-start;
		}
		.ribbon li + li::before {
			display: none;
		}
	}
	@media (max-width: 480px) {
		/* The hero CTA sits right below; keep the bar to the brand only. */
		nav[aria-label='Main'] .hbtn.sm {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.badge,
		.tagline,
		.sub,
		.cta-row,
		.ribbon,
		.sticker,
		.hint {
			animation: none;
			opacity: 1;
		}
		.sticker .in,
		.track {
			animation: none;
		}
		.track {
			flex-wrap: wrap;
		}
	}
</style>
