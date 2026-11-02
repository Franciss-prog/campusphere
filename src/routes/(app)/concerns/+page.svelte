<script lang="ts">
	import { goto } from '$app/navigation';
	import Banner from '#lib/components/shell/Banner.svelte';
	import Pager from '#lib/components/ui/Pager.svelte';
	import StatusPill from '#lib/components/ui/StatusPill.svelte';
	import { STATUS_LABEL, STATUSES } from '#lib/status.ts';
	import { shortDate } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const f = $derived(data.filter);
	const filtered = $derived(!!(f.q || f.status || f.category || f.tag));

	// With JS, selects apply immediately; without JS the "Apply filters" button submits the GET form.
	function apply(e: Event) {
		const form = (e.currentTarget as HTMLElement).closest('form');
		if (form) form.requestSubmit();
	}
</script>

<svelte:head><title>Campus Concerns | Campusphere</title></svelte:head>

<Banner
	title="Campus Concerns"
	subtitle="Every concern, its status, and the community behind it. Open one to join the discussion."
>
	{#snippet action()}<a class="btn btn-w" href="/concerns/new">Report a concern</a>{/snippet}
</Banner>

<form
	class="toolbar"
	method="GET"
	role="search"
	aria-label="Filter concerns"
	data-sveltekit-reset="false"
>
	<label
		>Search concerns
		<input
			class="control q"
			type="search"
			name="q"
			value={f.q ?? ''}
			placeholder="Search by title or location"
		/>
	</label>
	<label
		>Status
		<select class="control" name="status" onchange={apply}>
			<option value="">All statuses</option>
			{#each STATUSES as s (s)}<option value={s} selected={f.status === s}>{STATUS_LABEL[s]}</option
				>{/each}
		</select>
	</label>
	<label
		>Category
		<select class="control" name="category" onchange={apply}>
			<option value="">All categories</option>
			{#each data.categories as c (c.id)}<option value={c.slug} selected={f.category === c.slug}
					>{c.name}</option
				>{/each}
		</select>
	</label>
	{#if f.tag}<input type="hidden" name="tag" value={f.tag} />{/if}
	<span class="flex-1"></span>
	<label
		>Sort by
		<select class="control" name="sort" onchange={apply}>
			<option value="supported" selected={f.sort === 'supported'}>Most supported</option>
			<option value="newest" selected={f.sort === 'newest'}>Newest</option>
			<option value="updated" selected={f.sort === 'updated'}>Recently updated</option>
			<option value="discussed" selected={f.sort === 'discussed'}>Most discussed</option>
		</select>
	</label>
	<noscript><button class="btn btn-o btn-sm" type="submit">Apply filters</button></noscript>
</form>

{#if f.tag}
	<p class="mt-4 text-[15px] text-muted-foreground">
		Tagged <b class="text-ink">{f.tag}</b>.
		<a class="lk" href="/concerns">Clear tag</a>
	</p>
{/if}

{#if data.list.items.length}
	<div class="tblwrap">
		<table class="t">
			<caption class="sr-only">Concerns, {data.list.total} results</caption>
			<thead>
				<tr>
					<th scope="col">Concern</th>
					<th scope="col">Category</th>
					<th scope="col">Status</th>
					<th scope="col" class="num">Supports</th>
					<th scope="col">Last update</th>
					<th scope="col"><span class="sr-only">Open</span></th>
				</tr>
			</thead>
			<tbody>
				{#each data.list.items as c (c.id)}
					<tr class="click" onclick={() => goto(`/concerns/${c.id}`)}>
						<td>
							<b>{c.title}</b>
							{#if c.location}<small>{c.location}</small>{/if}
						</td>
						<td>{c.categoryName ?? ''}</td>
						<td><StatusPill status={c.status} /></td>
						<td class="num">{c.supportCount}</td>
						<td
							><time datetime={new Date(c.statusChangedAt).toISOString()}
								>{shortDate(c.statusChangedAt)}</time
							></td
						>
						<td class="num"
							><a class="go" href="/concerns/{c.id}">Open<span class="sr-only">: {c.title}</span></a
							></td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<Pager
		page={data.list.page}
		perPage={data.list.perPage}
		total={data.list.total}
		noun="concerns"
	/>
{:else}
	<div class="empty">
		<p>{filtered ? 'No concerns match these filters.' : 'No concerns have been reported yet.'}</p>
		{#if filtered}<a class="btn btn-o" href="/concerns">Clear filters</a>{:else}<a
				class="btn btn-o"
				href="/concerns/new">Report a concern</a
			>{/if}
	</div>
{/if}

<style>
	.q {
		min-width: 300px;
	}
	.click {
		cursor: pointer;
		transition: background 0.2s;
	}
	.click:hover {
		background: var(--rose);
	}
	.go {
		color: var(--red);
		font-weight: 700;
		font-size: 14.5px;
		white-space: nowrap;
		display: inline-flex;
		min-height: 44px;
		align-items: center;
	}
	.t td small {
		display: block;
	}
	@media (max-width: 1100px) {
		.q {
			min-width: 0;
			width: 100%;
		}
		.toolbar label:first-child {
			flex: 1 1 100%;
		}
	}
</style>
