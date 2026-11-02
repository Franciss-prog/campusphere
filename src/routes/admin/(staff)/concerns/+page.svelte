<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Banner from '#lib/components/shell/Banner.svelte';
	import SlideOver from '#lib/components/ui/SlideOver.svelte';
	import StatusPill from '#lib/components/ui/StatusPill.svelte';
	import { noteRequired, STATUS_LABEL, STATUSES, type ConcernStatus } from '#lib/status.ts';
	import { shortDate, withParams } from '#lib/format.ts';
	import { formState } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const f = $derived(formState(form));
	const sel = $derived(data.selected);
	let next = $derived<ConcernStatus>(sel?.status ?? 'submitted');
	let saving = $state(false);
	let flash = $state<string | null>(null);

	const openHref = (id: number) => withParams(page.url, { update: id, page: null });
	const closeHref = $derived(withParams(page.url, { update: null, page: null }));
	function close() {
		goto(closeHref, { replace: true, reset: false });
	}
</script>

<svelte:head><title>Concerns | Campusphere staff</title></svelte:head>

<Banner
	variant="staff"
	title="Concerns"
	subtitle="Update the status. Every change is public and logged."
/>

{#if flash}<p class="flash ok mt-5" role="status">{flash}</p>{/if}
{#if !data.canChange}
	<p class="notice mt-5"><b>View only</b>Only administrators can change a concern's status.</p>
{/if}

<form class="toolbar" method="GET">
	<label
		>Search concerns<input
			class="control w-[300px] max-w-full"
			type="search"
			name="q"
			value={data.q ?? ''}
			placeholder="Search by title"
		/></label
	>
	<label
		>Status
		<select class="control" name="status" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
			<option value="">All statuses</option>
			<option value="stale" selected={data.status === 'stale'}>Needs update</option>
			{#each STATUSES as s (s)}<option value={s} selected={data.status === s}
					>{STATUS_LABEL[s]}</option
				>{/each}
		</select>
	</label>
	<noscript><button class="btn btn-o btn-sm" type="submit">Apply</button></noscript>
</form>

<div class="tblwrap">
	<table class="t">
		<caption class="sr-only">Concerns</caption>
		<thead>
			<tr>
				<th scope="col">Concern</th>
				<th scope="col">Status</th>
				<th scope="col">Last update</th>
				<th scope="col" class="num">Supports</th>
				<th scope="col"><span class="sr-only">Action</span></th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as c (c.id)}
				<tr>
					<td>
						<b><a href="/concerns/{c.id}" target="_blank" rel="noopener">{c.title}</a></b>
						<small
							>{c.categoryName ?? 'No category'}{c.kind === 'recommendation'
								? ', recommendation'
								: ''}{c.visibility !== 'published'
								? `, ${c.visibility === 'hidden' ? 'hidden' : 'waiting for review'}`
								: ''}{c.isSensitive ? ', sensitive' : ''}</small
						>
					</td>
					<td><StatusPill status={c.status} /></td>
					<td
						>{shortDate(c.statusChangedAt)}{#if c.needsUpdate}<small class="stale"
								>needs update</small
							>{/if}</td
					>
					<td class="num">{c.supportCount}</td>
					<td class="num">
						{#if data.canChange}
							<a
								class="btn btn-o btn-sm"
								href={openHref(c.id)}
								data-sveltekit-reset="false"
								data-sveltekit-replacestate>Update status<span class="sr-only">: {c.title}</span></a
							>
						{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="text-muted-foreground">No concerns match.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<SlideOver open={!!sel && data.canChange} title={sel?.title ?? ''} {closeHref} onclose={close}>
	{#if sel}
		<div class="meta">
			<span>{sel.categoryName ?? ''}</span><span>Now</span><StatusPill status={sel.status} />
		</div>
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					saving = false;
					if (result.type === 'success') {
						flash = String(result.data?.message ?? 'Saved.');
						await goto(closeHref, { replace: true, reset: false, refreshAll: true });
					} else {
						await update({ reset: false });
					}
				};
			}}
		>
			<input type="hidden" name="id" value={sel.id} />
			{#if f?.message && !f.ok}<p class="flash bad mb-5" role="alert">{f.message}</p>{/if}
			<div class="f">
				<label for="ns">New status</label>
				<select id="ns" name="status" class="input" bind:value={next}>
					{#each STATUSES as s (s)}<option value={s}>{STATUS_LABEL[s]}</option>{/each}
				</select>
			</div>
			<div class="f">
				<label for="np"
					>Public note <span class="hint" id="nph"
						>{noteRequired(next)
							? 'Required for Closed / Not Feasible. Explain why.'
							: 'Optional. Everyone will see this.'}</span
					></label
				>
				<textarea
					id="np"
					name="note"
					class="input short"
					maxlength="1000"
					required={noteRequired(next)}
					aria-describedby="nph"
					placeholder="What is happening and what comes next?"
					>{typeof f?.note === 'string' ? f.note : ''}</textarea
				>
			</div>
			<div class="flex gap-3">
				<button class="btn btn-p" type="submit" disabled={saving}
					>{saving ? 'Saving…' : 'Save status'}</button
				>
				<a
					class="btn btn-o"
					href={closeHref}
					onclick={(e) => {
						e.preventDefault();
						close();
					}}>Cancel</a
				>
			</div>
		</form>
		<h3 class="hh">History</h3>
		<ul class="hist">
			{#each sel.history as h (h.id)}
				<li>{STATUS_LABEL[h.status]}<span>{shortDate(h.createdAt)}</span></li>
			{/each}
		</ul>
	{/if}
</SlideOver>

<style>
	.stale {
		display: block;
		color: var(--red-d) !important;
		font-weight: 700;
	}
	.t td b a:hover {
		color: var(--red);
	}
	.meta {
		color: var(--muted);
		font-size: 15px;
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 24px;
	}
	textarea.short {
		min-height: 90px;
	}
	.hh {
		font-size: 15px;
		font-weight: 600;
		color: var(--muted);
		margin: 30px 0 8px;
	}
	.hist {
		list-style: none;
	}
	.hist li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 0;
		border-top: 1px solid var(--line2);
		font-size: 15px;
	}
	.hist span {
		color: var(--faint);
		font-size: 13.5px;
	}
</style>
