<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Banner from '#lib/components/shell/Banner.svelte';
	import LinkTabs from '#lib/components/ui/LinkTabs.svelte';
	import SortSelect from '#lib/components/ui/SortSelect.svelte';
	import { shortDate, withParams } from '#lib/format.ts';
	import { formState, stay } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const f = $derived(formState(form));
	const tabs = $derived(
		(
			[
				['post', 'Blog posts'],
				['proposal', 'Proposals'],
				['comment', 'Comments']
			] as const
		).map(([k, label]) => ({
			href: withParams(page.url, { type: k }),
			label,
			current: data.type === k
		}))
	);
	const VIS_LABEL: Record<string, string> = {
		published: 'Public',
		pending: 'Waiting for review',
		hidden: 'Hidden'
	};
</script>

<svelte:head><title>Content | Campusphere staff</title></svelte:head>

<Banner
	variant="staff"
	title="Content"
	subtitle="Posts, proposals, and comments. Hide or restore anything; every action is logged."
/>

{#if f?.message}<p class="flash mt-5 {f.ok ? 'ok' : 'bad'}" role="status">{f.message}</p>{/if}

<div class="mt-6 flex flex-wrap items-end justify-between gap-4">
	<LinkTabs label="Content type" items={tabs} />
	<SortSelect
		name="vis"
		label="Show"
		value={data.vis}
		options={[
			['all', 'Everything'],
			['published', 'Public'],
			['pending', 'Waiting for review'],
			['hidden', 'Hidden']
		]}
	/>
</div>

<div class="tblwrap">
	<table class="t">
		<caption class="sr-only">Content</caption>
		<thead>
			<tr
				><th scope="col">Item</th><th scope="col">Visibility</th><th scope="col" class="num"
					>Open reports</th
				><th scope="col">Posted</th><th scope="col"><span class="sr-only">Action</span></th></tr
			>
		</thead>
		<tbody>
			{#each data.rows as r (r.id)}
				<tr>
					<td
						><b><a href={r.href} target="_blank" rel="noopener">{r.title}</a></b><small
							>{r.context}</small
						></td
					>
					<td>{VIS_LABEL[r.visibility]}</td>
					<td class="num">{r.reports}</td>
					<td>{shortDate(r.createdAt)}</td>
					<td class="num">
						<form
							method="POST"
							action={r.visibility === 'hidden' ? '?/restore' : '?/hide'}
							use:enhance={stay}
						>
							<input type="hidden" name="targetType" value={data.type} />
							<input type="hidden" name="targetId" value={r.id} />
							<button class="lk" type="submit"
								>{r.visibility === 'hidden' ? 'Restore' : 'Hide'}<span class="sr-only"
									>: {r.title}</span
								></button
							>
						</form>
					</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="text-muted-foreground">Nothing here.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.t td b a:hover {
		color: var(--red);
	}
	.t td small {
		display: block;
	}
</style>
