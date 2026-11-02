<script lang="ts">
	import Banner from '#lib/components/shell/Banner.svelte';
	import { KEPT, NOT_COLLECTED } from '#lib/content/privacy.ts';
	import { OFFICES, PLACEHOLDER } from '#lib/content/site.ts';
</script>

<svelte:head><title>Privacy | Campusphere</title></svelte:head>

<Banner
	title="Privacy"
	subtitle="An honest account of what Campusphere collects, and what it does not."
/>

<article class="doc">
	<div class="notice mt-8">
		<b>Anonymous, but not untraceable</b>
		Campusphere is designed so that ordinary users are not identified. But no website can promise absolute
		technical anonymity: your network provider, the campus network, your device, or what you write can
		still reveal who you are. Do not include personal details about yourself or others.
	</div>

	<h2 class="disp">What we do not collect</h2>
	<ul>
		{#each NOT_COLLECTED as x (x)}<li>{x}</li>{/each}
	</ul>

	<h2 class="disp">What we keep, and why</h2>
	<ul>
		{#each KEPT as x (x)}<li>{x}</li>{/each}
	</ul>

	<h2 class="disp">How spam limits work</h2>
	<p>
		To stop flooding, the server counts how often a browser and a network address post. It never
		stores the address itself. It stores a keyed hash (HMAC) of the address mixed with the current
		date, so the value changes every day and cannot be matched across days or reversed. These
		counters are deleted after about two days.
	</p>

	<h2 class="disp">Your anonymous token</h2>
	<p>
		The first time you post, support, or report, your browser receives a random token in an httpOnly
		cookie (scripts cannot read it). The server keeps only a keyed hash of the token next to what
		you post. This lets you edit or delete your own post for a short time and prevents double
		support. Comment names such as "Anonymous Pelican" come from the token and the thread, so the
		same name does not follow you across threads. Clearing your cookies gives you a new token.
	</p>

	<h2 class="disp">Bot checks</h2>
	<p>
		Forms may show a Cloudflare Turnstile check to block automated spam. Cloudflare processes that
		check under its own privacy policy. Campusphere does not send your network address to it.
	</p>

	<h2 class="disp">Photos</h2>
	<p>
		Uploaded photos are re-encoded on the server. This removes EXIF data, including GPS location and
		camera details. Do not upload photos that show people's faces or personal information.
	</p>

	<h2 class="disp">Moderation and staff</h2>
	<p>
		Moderators and administrators can hide content, remove names, and see reports. They cannot see
		who posted anything, because that information is not stored. Every staff action is logged.
	</p>

	<h2 class="disp">Questions or removal requests</h2>
	<p>
		Use the Report link on any item. For data protection questions, contact: <i
			>{OFFICES.coordination.contact}</i
		>. Data protection officer: <i>{PLACEHOLDER}</i>.
	</p>
</article>

<style>
	.doc {
		max-width: 780px;
	}
	h2 {
		font-size: 30px;
		line-height: 1.1;
		margin: 48px 0 12px;
	}
	p,
	li {
		font-size: 17px;
		line-height: 1.65;
		color: #3a2a2c;
	}
	ul {
		list-style: disc;
		margin-left: 1.2em;
		display: grid;
		gap: 8px;
	}
</style>
