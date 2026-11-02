<script lang="ts">
	import Banner from '#lib/components/shell/Banner.svelte';
	import { OFFICES } from '#lib/content/site.ts';

	const RULES = [
		[
			'Describe problems, not people',
			'Write about the issue: the leak, the line, the process. Do not name, describe, or target private individuals. Moderators remove names.'
		],
		[
			'Keep it respectful',
			'No harassment, insults, threats, or hateful language. Disagree with ideas, not with the people behind them.'
		],
		[
			'Be honest and specific',
			'Say what happens, where, and when. Accurate reports get fixed faster.'
		],
		[
			'Help find the fix',
			'Support good proposals, add context, and suggest solutions. That is the point of Campusphere.'
		],
		[
			'No spam or ads',
			'Posts with many links or unrelated promotions are held for review or removed.'
		],
		[
			'Protect privacy',
			"Do not post personal details, ID numbers, or photos that show people's faces."
		],
		[
			'Use the right channel for emergencies',
			'Safety issues, harassment, and emergencies go to the proper campus office directly.'
		]
	] as const;
</script>

<svelte:head><title>Community guidelines | Campusphere</title></svelte:head>

<Banner
	title="Community guidelines"
	subtitle="Seven rules that keep Campusphere useful, safe, and kind."
/>

<ol class="rules">
	{#each RULES as [title, text], i (title)}
		<li>
			<i aria-hidden="true">{i + 1}</i>
			<div>
				<h2 class="disp">{title}</h2>
				<p>{text}</p>
			</div>
		</li>
	{/each}
</ol>

<div class="notice mt-8 max-w-[780px]">
	<b>What happens when rules are broken</b>
	Anyone can report content. Items with several reports are hidden automatically until a moderator reviews
	them. Moderators can hide content or remove names, and every action is logged.
</div>
<div class="notice max-w-[780px]">
	<b>Urgent or serious?</b>
	Office: <i>{OFFICES.urgent.name}</i>. Contact: <i>{OFFICES.urgent.contact}</i>.
</div>

<style>
	.rules {
		list-style: none;
		margin-top: 30px;
		max-width: 780px;
	}
	.rules li {
		display: grid;
		grid-template-columns: 44px 1fr;
		gap: 18px;
		padding: 22px 0;
		border-bottom: 1px solid var(--line);
	}
	.rules i {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: var(--red);
		color: #fff;
		font-style: normal;
		font-weight: 800;
	}
	h2 {
		font-size: 24px;
		line-height: 1.15;
	}
	p {
		margin-top: 6px;
		color: var(--muted);
		font-size: 16.5px;
	}
</style>
