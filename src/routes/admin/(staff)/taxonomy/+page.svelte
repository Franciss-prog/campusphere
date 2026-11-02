<script lang="ts">
	import { enhance } from '$app/forms';
	import Banner from '#lib/components/shell/Banner.svelte';
	import { formState } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const f = $derived(formState(form));
	const groups = $derived([
		{
			type: 'concern' as const,
			title: 'Concern categories',
			sub: 'Shown on the report form and in filters.',
			noun: 'concern'
		},
		{
			type: 'blog' as const,
			title: 'Blog categories',
			sub: 'Shown when writing a post and as blog tabs.',
			noun: 'post'
		}
	]);
	// Which row has an open inline editor: `${kind}:${id}:${mode}`
	let open = $state<string | null>(null);
	const toggle = (k: string) => (open = open === k ? null : k);
	const opts = { reset: true, navigate: false };
</script>

<svelte:head><title>Categories and tags | Campusphere staff</title></svelte:head>

<Banner
	variant="staff"
	title="Categories and tags"
	subtitle="Keep the lists short and clear so people can find the right place."
/>

{#if f?.message}<p class="flash mt-5 {f.ok ? 'ok' : 'bad'}" role="status">{f.message}</p>{/if}

<div class="tx2">
	{#each groups as g (g.type)}
		{@const cats = data.cats.filter((c) => c.type === g.type)}
		<section class="panel">
			<h2 class="disp h3">{g.title}</h2>
			<p class="sub">{g.sub}</p>
			<ul class="mt-3">
				{#each cats as c (c.id)}
					<li class="rowi">
						<div class="flex items-center justify-between gap-3">
							<span
								>{c.name}<br /><small>{c.items} {c.items === 1 ? g.noun : g.noun + 's'}</small
								></span
							>
							<span class="ac">
								<button
									class="lk"
									type="button"
									aria-expanded={open === `c:${c.id}:r`}
									onclick={() => toggle(`c:${c.id}:r`)}
									>Rename<span class="sr-only"> {c.name}</span></button
								>
								{#if !c.isFallback}
									<button
										class="lk"
										type="button"
										aria-expanded={open === `c:${c.id}:d`}
										onclick={() => toggle(`c:${c.id}:d`)}
										>Delete<span class="sr-only"> {c.name}</span></button
									>
								{/if}
							</span>
						</div>
						{#if open === `c:${c.id}:r`}
							<form
								class="inl"
								method="POST"
								action="?/renameCategory"
								use:enhance={() =>
									async ({ update }) => {
										await update(opts);
										open = null;
									}}
							>
								<input type="hidden" name="id" value={c.id} />
								<label class="sr-only" for="rn-{c.id}">New name for {c.name}</label>
								<input
									id="rn-{c.id}"
									class="control"
									name="name"
									value={c.name}
									required
									maxlength="40"
								/>
								<button class="btn btn-o btn-sm" type="submit">Save name</button>
							</form>
						{:else if open === `c:${c.id}:d`}
							<form
								class="inl"
								method="POST"
								action="?/deleteCategory"
								use:enhance={() =>
									async ({ update }) => {
										await update(opts);
									}}
							>
								<input type="hidden" name="id" value={c.id} />
								<label for="dc-{c.id}"
									>Type <b>{c.name}</b> to delete it. Its {c.items} items move to Other.</label
								>
								<input id="dc-{c.id}" class="control" name="confirm" required autocomplete="off" />
								<button class="btn btn-d btn-sm" type="submit">Delete category</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
			<form
				class="addrow"
				method="POST"
				action="?/addCategory"
				use:enhance={() =>
					async ({ update }) =>
						update(opts)}
			>
				<input type="hidden" name="type" value={g.type} />
				<label class="sr-only" for="add-{g.type}">New category name</label>
				<input
					id="add-{g.type}"
					class="control flex-1"
					name="name"
					placeholder="New category name"
					required
					maxlength="40"
				/>
				<button class="btn btn-p" type="submit">Add category</button>
			</form>
			<p class="sub mt-3">Deleting a category moves its items to Other. Other cannot be deleted.</p>
		</section>
	{/each}

	<section class="panel">
		<h2 class="disp h3">Tags</h2>
		<p class="sub">Labels people can add to posts and concerns.</p>
		<ul class="mt-3">
			{#each data.tags as tg (tg.id)}
				<li class="rowi">
					<div class="flex items-center justify-between gap-3">
						<span>{tg.name}<br /><small>{tg.items} {tg.items === 1 ? 'item' : 'items'}</small></span
						>
						<span class="ac">
							<button
								class="lk"
								type="button"
								aria-expanded={open === `t:${tg.id}:r`}
								onclick={() => toggle(`t:${tg.id}:r`)}
								>Rename<span class="sr-only"> {tg.name}</span></button
							>
							<button
								class="lk"
								type="button"
								aria-expanded={open === `t:${tg.id}:m`}
								onclick={() => toggle(`t:${tg.id}:m`)}
								>Merge<span class="sr-only"> {tg.name}</span></button
							>
							<button
								class="lk"
								type="button"
								aria-expanded={open === `t:${tg.id}:d`}
								onclick={() => toggle(`t:${tg.id}:d`)}
								>Delete<span class="sr-only"> {tg.name}</span></button
							>
						</span>
					</div>
					{#if open === `t:${tg.id}:r`}
						<form
							class="inl"
							method="POST"
							action="?/renameTag"
							use:enhance={() =>
								async ({ update }) => {
									await update(opts);
									open = null;
								}}
						>
							<input type="hidden" name="id" value={tg.id} />
							<label class="sr-only" for="rt-{tg.id}">New name for {tg.name}</label>
							<input
								id="rt-{tg.id}"
								class="control"
								name="name"
								value={tg.name}
								required
								maxlength="40"
							/>
							<button class="btn btn-o btn-sm" type="submit">Save name</button>
						</form>
					{:else if open === `t:${tg.id}:m`}
						<form
							class="inl"
							method="POST"
							action="?/mergeTag"
							use:enhance={() =>
								async ({ update }) => {
									await update(opts);
									open = null;
								}}
						>
							<input type="hidden" name="id" value={tg.id} />
							<label for="mt-{tg.id}">Merge {tg.name} into</label>
							<select id="mt-{tg.id}" class="control" name="into" required>
								{#each data.tags.filter((x) => x.id !== tg.id) as o (o.id)}<option value={o.id}
										>{o.name}</option
									>{/each}
							</select>
							<button class="btn btn-o btn-sm" type="submit">Merge tags</button>
						</form>
					{:else if open === `t:${tg.id}:d`}
						<form
							class="inl"
							method="POST"
							action="?/deleteTag"
							use:enhance={() =>
								async ({ update }) => {
									await update(opts);
								}}
						>
							<input type="hidden" name="id" value={tg.id} />
							<label for="dt-{tg.id}"
								>Type <b>{tg.name}</b> to delete it from {tg.items} items.</label
							>
							<input id="dt-{tg.id}" class="control" name="confirm" required autocomplete="off" />
							<button class="btn btn-d btn-sm" type="submit">Delete tag</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
		<form
			class="addrow"
			method="POST"
			action="?/addTag"
			use:enhance={() =>
				async ({ update }) =>
					update(opts)}
		>
			<label class="sr-only" for="add-tag">New tag</label>
			<input
				id="add-tag"
				class="control flex-1"
				name="name"
				placeholder="New tag"
				required
				maxlength="40"
			/>
			<button class="btn btn-p" type="submit">Add tag</button>
		</form>
	</section>
</div>

<style>
	.tx2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		margin-top: 24px;
		align-items: start;
	}
	.h3 {
		font-size: 24px;
		line-height: 1.1;
	}
	ul {
		list-style: none;
	}
	.rowi {
		padding: 10px 0;
		border-top: 1px solid var(--line2);
		font-size: 16px;
	}
	.rowi small {
		color: var(--muted);
	}
	.ac {
		display: flex;
		gap: 16px;
	}
	.inl {
		margin: 8px 0 6px;
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		align-items: center;
		font-size: 14.5px;
	}
	.inl label {
		flex: 1 1 100%;
	}
	.addrow {
		margin-top: 16px;
		display: flex;
		gap: 10px;
	}
	@media (max-width: 1100px) {
		.tx2 {
			grid-template-columns: 1fr;
		}
		.addrow {
			flex-wrap: wrap;
		}
	}
</style>
