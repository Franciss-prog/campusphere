<script lang="ts">
	import { enhance } from '$app/forms';
	import FormGuard from './FormGuard.svelte';
	import Icon from './Icon.svelte';
	import { PERSONAL_DETAILS_WARNING } from '#lib/content/site.ts';
	import { val, type FormState } from '#lib/form-state.ts';

	let {
		f,
		categories,
		tags = [],
		initial = {},
		mode = 'new',
		isStaff = false,
		cancelHref = '/blog',
		checkedTags = []
	}: {
		f: FormState | null;
		categories: { id: number; name: string }[];
		tags?: { id: number; name: string }[];
		initial?: { title?: string; body?: string; category?: string };
		mode?: 'new' | 'edit';
		isStaff?: boolean;
		cancelHref?: string;
		/** Tag ids checked initially (for example a campaign from `?campaign=`). */
		checkedTags?: number[];
	} = $props();

	const v = (k: 'title' | 'body' | 'category') => val(f, k) || initial[k] || '';
	const err = (k: string) => f?.errors?.[k];
	let submitting = $state(false);
	let resetKey = $state(0);
	let photoName = $state('');
</script>

<form
	class="form-card"
	method="POST"
	enctype="multipart/form-data"
	novalidate
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			resetKey++;
			await update({ reset: false, navigate: false });
		};
	}}
>
	{#if mode === 'new'}<FormGuard {resetKey} />{/if}
	{#if f?.message}<p class="flash bad mb-6" role="alert">{f.message}</p>{/if}

	<div class="f">
		<label for="pt">Title</label>
		<input
			id="pt"
			name="title"
			class="input"
			maxlength="120"
			required
			value={v('title')}
			placeholder="For example, The best places to study on campus"
			aria-invalid={err('title') ? 'true' : undefined}
			aria-describedby={err('title') ? 'pt-e' : undefined}
		/>
		{#if err('title')}<span class="err" id="pt-e">{err('title')}</span>{/if}
	</div>

	<div class="f">
		<label for="pc">Category</label>
		<select
			id="pc"
			name="category"
			class="input"
			required
			aria-invalid={err('category') ? 'true' : undefined}
		>
			<option value="">Choose a category</option>
			{#each categories as c (c.id)}
				<option value={c.id} selected={v('category') === String(c.id)}>{c.name}</option>
			{/each}
		</select>
		{#if err('category')}<span class="err">{err('category')}</span>{/if}
	</div>

	<div class="f">
		<label for="pb"
			>Your post <span class="hint">Markdown works: ## heading, **bold**, - list</span></label
		>
		<textarea
			id="pb"
			name="body"
			class="input tall"
			maxlength="20000"
			required
			placeholder="Write your story, guide, or update"
			aria-invalid={err('body') ? 'true' : undefined}
			aria-describedby={err('body') ? 'pb-e' : undefined}>{v('body')}</textarea
		>
		{#if err('body')}<span class="err" id="pb-e">{err('body')}</span>{/if}
	</div>

	{#if mode === 'new'}
		<details class="more" open={!!err('photo') || checkedTags.length > 0}>
			<summary>Add more details (optional)</summary>
			<div class="mt-5">
				<div class="f">
					<span class="lb" id="cv-l">Cover photo</span>
					<label class="btn btn-o btn-sm cursor-pointer">
						<Icon name="img" size={18} />{photoName ? 'Change photo' : 'Add a photo'}
						<input
							type="file"
							name="photo"
							accept="image/jpeg,image/png,image/webp"
							class="sr-only"
							aria-labelledby="cv-l"
							onchange={(e) => (photoName = e.currentTarget.files?.[0]?.name ?? '')}
						/>
					</label>
					{#if photoName}<span class="ml-3 text-sm">{photoName}</span>{/if}
					{#if err('photo')}<span class="err">{err('photo')}</span>{/if}
					<span class="cnt text-left"
						>JPG, PNG, or WebP, up to 5 MB. Location data is removed automatically.</span
					>
				</div>
				{#if tags.length}
					<fieldset class="f border-0">
						<legend class="lb">Tags</legend>
						<div class="flex flex-wrap gap-2">
							{#each tags as tg (tg.id)}
								<label class="tg"
									><input
										type="checkbox"
										name="tags"
										value={tg.id}
										checked={checkedTags.includes(tg.id)}
									/>
									{tg.name}</label
								>
							{/each}
						</div>
					</fieldset>
				{/if}
			</div>
		</details>
		{#if isStaff}
			<div class="f">
				<label class="chk">
					<input type="checkbox" name="official" />
					<span
						><b>Publish as an official post</b><small
							>Shown with the "Official" label. Staff only.</small
						></span
					>
				</label>
			</div>
		{/if}
	{/if}

	<div class="fact">
		<span>{PERSONAL_DETAILS_WARNING}</span>
		<a class="btn btn-o" href={cancelHref}>Cancel</a>
		<button class="btn btn-p" type="submit" disabled={submitting}>
			{submitting ? 'Saving…' : mode === 'new' ? 'Post anonymously' : 'Save changes'}
		</button>
	</div>
</form>

<style>
	textarea.tall {
		min-height: 320px;
	}
	.tg {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		border: 1.5px solid var(--line);
		border-radius: 999px;
		padding: 8px 14px;
		font-size: 14.5px;
		cursor: pointer;
		min-height: 44px;
	}
	.tg input {
		accent-color: var(--red);
	}
	.fact {
		display: flex;
		gap: 12px;
		align-items: center;
		margin-top: 8px;
		flex-wrap: wrap;
	}
	.fact span {
		flex: 1;
		font-size: 14px;
		color: var(--muted);
		min-width: 200px;
	}
</style>
