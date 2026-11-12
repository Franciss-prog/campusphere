<script lang="ts">
	import type { CoreValue } from '#lib/university.ts';
	import { reducedMotion } from './reduced.svelte';

	// 3D cube with one value per face. The list on the left (real buttons) is the accessible
	// control: hover or focus turns the cube. The cube itself is decorative (aria-hidden).
	// It idles with a slow turn only while on screen, and stays still under reduced motion.
	let { values }: { values: CoreValue[] } = $props();

	// Focus value on the front face, the rest around it (prototype order).
	const ordered = $derived.by(() => {
		const focus = values.find((v) => v.focus);
		const rest = values.filter((v) => !v.focus);
		const faces: (CoreValue | undefined)[] = [focus ?? rest.shift(), ...rest].slice(0, 6);
		return faces.filter(Boolean) as CoreValue[];
	});
	// Face index -> target rotation that brings it to the front.
	const TARGETS = [
		{ x: -8, y: 0 },
		{ x: -8, y: -90 },
		{ x: -8, y: -180 },
		{ x: -8, y: 90 },
		{ x: -90, y: 0 },
		{ x: 90, y: 0 }
	];

	let selected = $state<number | null>(null);
	let cube: HTMLDivElement | undefined = $state();
	let stage: HTMLDivElement | undefined = $state();
	const reduce = reducedMotion();

	$effect(() => {
		if (!cube || !stage) return;
		const el = cube;
		const st = stage;
		const cur = { x: -14, y: -25 };
		const tilt = { x: 0, y: 0 };
		const tiltT = { x: 0, y: 0 };
		let raf = 0;
		let visible = false;
		const frame = (t: number) => {
			const sel = selected;
			if (sel !== null) {
				const tg = TARGETS[sel];
				const dy = ((((tg.y - cur.y) % 360) + 540) % 360) - 180;
				cur.y += dy * 0.09;
				cur.x += (tg.x - cur.x) * 0.09;
			} else if (!reduce.value) {
				cur.y += 0.28;
				cur.x += (-16 + Math.sin(t / 1600) * 7 - cur.x) * 0.04;
			}
			tilt.x += (tiltT.x - tilt.x) * 0.08;
			tilt.y += (tiltT.y - tilt.y) * 0.08;
			el.style.transform = `rotateX(${cur.x + tilt.x}deg) rotateY(${cur.y + tilt.y}deg)`;
			if (visible) raf = requestAnimationFrame(frame);
		};
		const io = new IntersectionObserver(([e]) => {
			visible = e.isIntersecting;
			cancelAnimationFrame(raf);
			if (visible) raf = requestAnimationFrame(frame);
		});
		io.observe(st);
		const move = (e: PointerEvent) => {
			if (reduce.value) return;
			const r = st.getBoundingClientRect();
			tiltT.y = ((e.clientX - r.left) / r.width - 0.5) * 18;
			tiltT.x = -((e.clientY - r.top) / r.height - 0.5) * 14;
		};
		const leave = () => {
			tiltT.x = 0;
			tiltT.y = 0;
		};
		st.addEventListener('pointermove', move);
		st.addEventListener('pointerleave', leave);
		return () => {
			io.disconnect();
			cancelAnimationFrame(raf);
			st.removeEventListener('pointermove', move);
			st.removeEventListener('pointerleave', leave);
		};
	});
</script>

<div class="vgrid">
	<div>
		<h2 class="disp">Six values. {ordered[0]?.name ?? 'Service'} sits at the heart.</h2>
		<p class="lead">
			Campusphere goes beyond pointing out problems. It asks everyone to help solve them. Hover or
			focus a value to turn the cube.
		</p>
		<ul class="vlist">
			{#each values as v (v.name)}
				{@const face = ordered.indexOf(v)}
				<li>
					<button
						class="vrow"
						class:active={selected === face}
						type="button"
						aria-pressed={selected === face}
						onpointerenter={() => (selected = face)}
						onpointerleave={() => (selected = null)}
						onfocus={() => (selected = face)}
						onblur={() => (selected = null)}
					>
						<b>{v.name}</b>
						<span>{v.text}</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>
	<div class="stage" bind:this={stage} aria-hidden="true">
		<div class="cube" bind:this={cube} style="transform:rotateX(-14deg) rotateY(-25deg)">
			{#each ordered as v, i (v.name)}
				<div class="face f{i}" class:sv={v.focus}>
					<small>Core value</small>
					<div>
						<b>{v.name}</b>
						<p>{v.text}</p>
					</div>
				</div>
			{/each}
		</div>
		<div class="shadow"></div>
	</div>
</div>

<style>
	.vgrid {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 560px;
		gap: 60px;
		align-items: center;
	}
	h2 {
		font-size: clamp(40px, 4.6vw, 72px);
		line-height: 1;
		max-width: 620px;
	}
	.lead {
		margin-top: 18px;
		font-size: 19px;
		line-height: 1.55;
		color: #e9c7c4;
		max-width: 520px;
	}
	.vlist {
		margin-top: 44px;
		border-top: 1px solid rgba(255, 255, 255, 0.16);
		list-style: none;
	}
	.vrow {
		display: flex;
		width: 100%;
		align-items: baseline;
		justify-content: space-between;
		gap: 20px;
		padding: 20px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.16);
		opacity: 0.6;
		text-align: left;
		color: inherit;
		transition:
			opacity 0.3s,
			padding 0.4s var(--ease);
	}
	.vrow:hover,
	.vrow:focus-visible,
	.vrow.active {
		opacity: 1;
		padding-left: 16px;
	}
	.vrow b {
		font-size: 38px;
		letter-spacing: -0.04em;
		font-family: var(--font-display);
	}
	.vrow span {
		font-size: 15.5px;
		color: #f2d2cf;
		max-width: 280px;
		text-align: right;
	}
	.stage {
		position: relative;
		height: 560px;
		perspective: 1500px;
		display: grid;
		place-items: center;
	}
	.cube {
		position: relative;
		width: 380px;
		height: 380px;
		transform-style: preserve-3d;
		--h: 190px;
		will-change: transform;
	}
	.face {
		position: absolute;
		inset: 0;
		border-radius: 28px;
		padding: 32px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		backface-visibility: hidden;
		background: linear-gradient(150deg, #5b0f16, #2a070b);
		border: 1px solid rgba(255, 255, 255, 0.22);
	}
	.face small {
		font-size: 14px;
		color: #e9c7c4;
	}
	.face b {
		font-size: 50px;
		line-height: 1;
		letter-spacing: -0.05em;
		font-family: var(--font-display);
	}
	.face p {
		margin-top: 10px;
		font-size: 16px;
		line-height: 1.45;
		color: #f2d2cf;
	}
	.face.sv {
		background: linear-gradient(150deg, #f0323a, #b1121b);
		border-color: rgba(255, 255, 255, 0.5);
	}
	.face.sv small,
	.face.sv p {
		color: #fff1ee;
	}
	.f0 {
		transform: translateZ(var(--h));
	}
	.f1 {
		transform: rotateY(90deg) translateZ(var(--h));
	}
	.f2 {
		transform: rotateY(180deg) translateZ(var(--h));
	}
	.f3 {
		transform: rotateY(-90deg) translateZ(var(--h));
	}
	.f4 {
		transform: rotateX(90deg) translateZ(var(--h));
	}
	.f5 {
		transform: rotateX(-90deg) translateZ(var(--h));
	}
	.shadow {
		position: absolute;
		bottom: 20px;
		left: 50%;
		width: 300px;
		height: 40px;
		margin-left: -150px;
		border-radius: 50%;
		background: radial-gradient(ellipse, rgba(0, 0, 0, 0.55), transparent 70%);
		filter: blur(6px);
	}
	@media (max-width: 980px) {
		.vgrid {
			grid-template-columns: 1fr;
		}
		.stage {
			height: 420px;
		}
		.cube {
			width: 280px;
			height: 280px;
			--h: 140px;
		}
		.face b {
			font-size: 36px;
		}
		.vrow {
			flex-direction: column;
			gap: 4px;
		}
		.vrow b {
			font-size: 30px;
		}
		.vrow span {
			text-align: left;
		}
	}
</style>
