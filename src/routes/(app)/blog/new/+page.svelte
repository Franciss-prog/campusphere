<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import PostForm from '#lib/components/ui/PostForm.svelte';
	import { formState } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Write a post | Campusphere</title></svelte:head>

<a class="back" href="/blog"><Icon name="back" size={18} />Cancel</a>
<div class="fhead">
	<h1 class="disp">Write a post</h1>
	<p>Share a story, a guide, or something the campus should know. Your name is never shown.</p>
</div>

<div class="wrap">
	<PostForm
		f={formState(form)}
		categories={data.categories}
		tags={data.tags}
		isStaff={data.isStaff}
	/>
	<aside class="side" aria-label="Before you post">
		<div class="notice">
			<b>Keep it useful and kind</b>
			Write about experiences, tips, and ideas. Do not name or describe private individuals. See the
			<a class="underline" href="/guidelines">community guidelines</a>.
		</div>
		<div class="notice">
			<b>Editing</b>
			You can edit or delete your post for a short time after posting, from this browser only.
		</div>
	</aside>
</div>

<style>
	.fhead h1 {
		font-size: clamp(40px, 4.6vw, 68px);
		line-height: 0.96;
	}
	.fhead p {
		margin-top: 12px;
		font-size: 19px;
		color: var(--muted);
		max-width: 620px;
	}
	.wrap {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 340px;
		gap: 40px;
		margin-top: 30px;
		align-items: start;
	}
	.side {
		position: sticky;
		top: 20px;
	}
	@media (max-width: 1100px) {
		.wrap {
			grid-template-columns: 1fr;
		}
		.side {
			position: static;
		}
	}
</style>
