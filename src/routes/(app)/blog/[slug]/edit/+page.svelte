<script lang="ts">
	import Icon from '#lib/components/ui/Icon.svelte';
	import PostForm from '#lib/components/ui/PostForm.svelte';
	import { formState } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Edit your post | Campusphere</title></svelte:head>

<a class="back" href="/blog/{data.slug}"><Icon name="back" size={18} />Back to the post</a>
<h1 class="disp mb-8 text-[clamp(36px,4vw,56px)] leading-none">Edit your post</h1>
<div class="max-w-[780px]">
	<PostForm
		f={formState(form)}
		categories={data.categories}
		initial={data.initial}
		mode="edit"
		cancelHref="/blog/{data.slug}"
	/>
</div>
