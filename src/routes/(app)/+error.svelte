<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head
	><title>{page.status === 404 ? 'Not found' : 'Something went wrong'} | Campusphere</title
	></svelte:head
>

<div class="empty !mt-10">
	<h1 class="disp mb-3 text-4xl text-ink">
		{page.status === 404 ? 'Page not found' : 'Something went wrong'}
	</h1>
	<p>{page.error?.message ?? 'Please try again in a moment.'}</p>
	<a class="btn btn-o" href="/concerns">Go to Campus Concerns</a>
</div>
