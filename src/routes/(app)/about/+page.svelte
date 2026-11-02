<script lang="ts">
	import Banner from '#lib/components/shell/Banner.svelte';
	import { CYCLE, OFFICES } from '#lib/content/site.ts';
	import { KEPT, NOT_COLLECTED } from '#lib/content/privacy.ts';
</script>

<svelte:head><title>How Campusphere works | Campusphere</title></svelte:head>

<Banner
	title="How Campusphere works"
	subtitle="An anonymous place for the campus community to turn concerns into improvements."
/>

<div class="abt">
	<h2 class="disp">From a concern to a fix</h2>
	<p class="l">Five steps, the same every time.</p>
	<ol class="hsteps">
		{#each CYCLE as s, i (s.title)}
			<li><i aria-hidden="true">{i + 1}</i><b class="disp">{s.title}</b><span>{s.text}</span></li>
		{/each}
	</ol>

	<h2 class="disp">Built on service</h2>
	<p class="l">
		A better campus is not built by one person. It is built by a community willing to contribute.
		Campusphere is not a complaint box: it asks everyone to help find the fix. Read the university's
		<a class="underline" href="/blog">vision, mission, and core values</a>: Patriotism, Service,
		Integrity, Resilience, Excellence, and Faith.
	</p>

	<h2 class="disp">Your privacy</h2>
	<p class="l">Anonymous does not mean unmoderated. Here is exactly what we do and do not keep.</p>
	<div class="two">
		<section class="panel">
			<h3 class="disp">What we do not collect</h3>
			<ul>
				{#each NOT_COLLECTED as x (x)}<li>{x}</li>{/each}
			</ul>
		</section>
		<section class="panel">
			<h3 class="disp">What we do keep</h3>
			<ul>
				{#each KEPT.slice(0, 3) as x (x)}<li>{x}</li>{/each}
			</ul>
			<a class="lk" href="/privacy">Read the full privacy statement</a>
		</section>
	</div>
	<div class="notice mt-5">
		<b>No technical guarantee of anonymity</b>
		Anonymous participation does not guarantee absolute technical anonymity. Please do not share personal
		details in anything you post.
	</div>

	<h2 class="disp">What Campusphere can and cannot do</h2>
	<div class="notice mt-5">
		<b>We coordinate. Offices decide.</b>
		Campusphere does not authorize changes to university policy, facilities, or services. Concerns that
		need action are reviewed and coordinated with the appropriate university offices. Coordinating office:
		<i>{OFFICES.coordination.name}</i>. Contact: <i>{OFFICES.coordination.contact}</i>.
	</div>
	<div class="notice">
		<b>Urgent or serious?</b>
		For emergencies, harassment, or safety, contact the proper campus office directly, not through Campusphere.
		Office: <i>{OFFICES.urgent.name}</i>. Contact: <i>{OFFICES.urgent.contact}</i>.
	</div>

	<p class="mt-10 flex flex-wrap gap-3">
		<a class="btn btn-p" href="/concerns/new">Report a concern</a>
		<a class="btn btn-o" href="/guidelines">Read the community guidelines</a>
	</p>
</div>

<style>
	.abt {
		max-width: 1180px;
	}
	h2 {
		font-size: clamp(32px, 3.4vw, 50px);
		line-height: 1;
		margin: 64px 0 10px;
	}
	.l {
		color: var(--muted);
		font-size: 18px;
		max-width: 680px;
	}
	.hsteps {
		margin-top: 30px;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 18px;
		list-style: none;
	}
	.hsteps li {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 20px;
		padding: 22px 20px;
	}
	.hsteps b {
		display: block;
		font-size: 22px;
		margin-bottom: 8px;
	}
	.hsteps span {
		font-size: 15.5px;
		color: var(--muted);
		line-height: 1.5;
		display: block;
	}
	.hsteps i {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: var(--red);
		color: #fff;
		font-style: normal;
		font-weight: 800;
		margin-bottom: 14px;
	}
	.two {
		margin-top: 28px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}
	.two h3 {
		margin-bottom: 8px;
	}
	.two li {
		list-style: none;
		padding: 11px 0;
		border-bottom: 1px solid var(--line2);
		font-size: 16px;
	}
	.two li:last-child {
		border-bottom: 0;
	}
	@media (max-width: 1100px) {
		.hsteps {
			grid-template-columns: 1fr 1fr;
		}
		.two {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 520px) {
		.hsteps {
			grid-template-columns: 1fr;
		}
	}
</style>
