<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Banner from '#lib/components/shell/Banner.svelte';
	import ConcernCard from '#lib/components/ui/ConcernCard.svelte';
	import FormGuard from '#lib/components/ui/FormGuard.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import LinkTabs from '#lib/components/ui/LinkTabs.svelte';
	import Pager from '#lib/components/ui/Pager.svelte';
	import SortSelect from '#lib/components/ui/SortSelect.svelte';
	import { STATUS_LABEL, STATUSES } from '#lib/status.ts';
	import { withParams } from '#lib/format.ts';
	import { formState, val } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const SORT_TEXT = {
		supported: 'Sorted by what the community supports most.',
		newest: 'Newest first.',
		discussed: 'Most discussed first.',
		updated: 'Recently updated first.'
	} as const;

	const tabs = $derived([
		{
			href: withParams(page.url, { status: null }),
			label: 'All',
			count: data.counts.all,
			current: !data.status
		},
		...STATUSES.filter((s) => s !== 'closed' || data.counts.counts.closed > 0).map((s) => ({
			href: withParams(page.url, { status: s }),
			label: STATUS_LABEL[s],
			count: data.counts.counts[s],
			current: data.status === s
		}))
	]);

	let photoName = $state('');
	let submitting = $state(false);
	let resetKey = $state(0);
	const err = $derived(formState(form, 'post'));
</script>

<svelte:head><title>Campus Recommendations | Campusphere</title></svelte:head>

<Banner
	title="Campus Recommendations"
	subtitle="Share an idea to make the campus better. No account, no name."
/>

<form
	class="compose"
	method="POST"
	action="?/post"
	enctype="multipart/form-data"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			resetKey++;
			await update({ reset: false, navigate: false });
		};
	}}
>
	<FormGuard {resetKey} />
	<label for="idea">What should be better on campus?</label>
	<textarea
		id="idea"
		name="idea"
		class="input"
		placeholder="Describe your idea in a sentence or two"
		maxlength="1000"
		required
		aria-invalid={err?.errors?.idea ? 'true' : undefined}
		aria-describedby="idea-note">{val(err, 'idea')}</textarea
	>
	{#if err?.errors?.idea}<p class="err" role="alert">{err.errors.idea}</p>{/if}
	{#if err?.errors?.photo}<p class="err" role="alert">{err.errors.photo}</p>{/if}
	{#if err?.message}<p class="flash bad mt-3" role="alert">{err.message}</p>{/if}
	<div class="row">
		<label class="btn btn-o btn-sm photo">
			<Icon name="img" size={18} />{photoName ? 'Change photo' : 'Add a photo'}
			<input
				type="file"
				name="photo"
				accept="image/jpeg,image/png,image/webp"
				class="sr-only"
				onchange={(e) => (photoName = e.currentTarget.files?.[0]?.name ?? '')}
			/>
		</label>
		{#if photoName}<span class="fname">{photoName}</span>{/if}
		<span class="note" id="idea-note"
			>Please don't include personal details about yourself or others.</span
		>
		<button class="btn btn-p" type="submit" disabled={submitting}>
			{submitting ? 'Posting…' : 'Post anonymously'}
		</button>
	</div>
</form>

<div class="listhead">
	<div>
		<h2 class="disp">Recent recommendations</h2>
		<p>{SORT_TEXT[data.sort]}</p>
	</div>
	<SortSelect
		value={data.sort}
		options={[
			['supported', 'Most supported'],
			['newest', 'Newest'],
			['discussed', 'Most discussed']
		]}
	/>
</div>

<LinkTabs label="Filter by status" items={tabs} />

{#if data.list.items.length}
	<div class="card-grid">
		{#each data.list.items as item (item.id)}
			<ConcernCard {item} />
		{/each}
	</div>
	<Pager page={data.list.page} perPage={data.list.perPage} total={data.list.total} noun="ideas" />
{:else}
	<div class="empty">
		<p>
			{data.status
				? `No recommendations are ${STATUS_LABEL[data.status].toLowerCase()} right now.`
				: 'No recommendations yet. Be the first to share an idea.'}
		</p>
		{#if data.status}<a class="btn btn-o" href={withParams(page.url, { status: null })}
				>Show all recommendations</a
			>{:else}<a class="btn btn-o" href="#idea">Share an idea</a>{/if}
	</div>
{/if}

<style>
	.compose {
		margin-top: 24px;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 22px;
		padding: 28px 30px;
	}
	.compose > label {
		display: block;
		font-weight: 700;
		font-size: 17px;
		margin-bottom: 10px;
	}
	.compose textarea {
		min-height: 96px;
		background: var(--rose);
	}
	.compose textarea:focus {
		background: #fff;
	}
	.row {
		margin-top: 14px;
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}
	.photo {
		cursor: pointer;
	}
	.photo:focus-within {
		outline: 3px solid var(--red);
		outline-offset: 3px;
	}
	.fname {
		font-size: 14px;
		color: var(--ink);
		max-width: 180px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.note {
		flex: 1;
		font-size: 14px;
		color: var(--muted);
		min-width: 200px;
	}
	@media (max-width: 640px) {
		.compose {
			padding: 22px 18px;
		}
		.row .btn-p {
			width: 100%;
		}
	}
</style>
