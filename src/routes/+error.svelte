<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head
	><title>{page.status === 404 ? 'Not found' : 'Something went wrong'} | Campusphere</title
	></svelte:head
>

<main class="grid min-h-screen place-items-center bg-rose p-6">
	<div class="max-w-md text-center">
		<h1 class="disp text-5xl">{page.status === 404 ? 'Page not found' : 'Something went wrong'}</h1>
		<p class="mt-4 text-muted-foreground">
			{page.error?.message ?? 'Please try again in a moment.'}
		</p>
		<a class="btn btn-p mt-6" href="/">Back to Campusphere</a>
	</div>
</main>
