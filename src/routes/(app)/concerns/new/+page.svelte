<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import FormGuard from '#lib/components/ui/FormGuard.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import { OFFICES, PERSONAL_DETAILS_WARNING } from '#lib/content/site.ts';
	import { formState, val } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const f = $derived(formState(form));
	const err = (k: string) => f?.errors?.[k];

	// Initial value only (no-JS re-render after a failed submit); then the input owns it.
	let title = $state(untrack(() => val(formState(form), 'title')));
	let similar = $state<{ id: number; title: string; meta: string }[]>([]);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let ctrl: AbortController | undefined;
	let submitting = $state(false);
	let resetKey = $state(0);
	let photoName = $state('');

	function lookup() {
		clearTimeout(timer);
		const q = title.trim();
		if (q.length < 6) {
			similar = [];
			return;
		}
		timer = setTimeout(async () => {
			ctrl?.abort();
			ctrl = new AbortController();
			try {
				const res = await fetch(`/api/similar?title=${encodeURIComponent(q)}`, {
					signal: ctrl.signal
				});
				if (res.ok) similar = (await res.json()).items;
			} catch {
				/* aborted or offline: the hint is optional */
			}
		}, 350);
	}
</script>

<svelte:head><title>Report a concern | Campusphere</title></svelte:head>

<a class="back" href="/concerns"><Icon name="back" size={18} />Cancel</a>
<div class="fhead">
	<h1 class="disp">Report a concern</h1>
	<p>Tell us what is not working. Nobody will see who you are, and others can help find a fix.</p>
</div>

<div class="fwrap">
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
		<FormGuard {resetKey} />
		{#if f?.message}<p class="flash bad mb-6" role="alert">{f.message}</p>{/if}
		{#if data.campaign}
			<p class="flash ok mb-6">
				Part of the <a class="underline" href="/campaigns/{data.campaign.slug}"
					>{data.campaign.title}</a
				> campaign. You can change this under "Add more details".
			</p>
		{/if}

		<div class="f">
			<label for="ct">Title</label>
			<input
				id="ct"
				name="title"
				class="input"
				type="text"
				maxlength="100"
				required
				autocomplete="off"
				placeholder="For example, Leaking roof in the main building"
				bind:value={title}
				oninput={lookup}
				aria-invalid={err('title') ? 'true' : undefined}
				aria-describedby="ct-cnt{err('title') ? ' ct-err' : ''}"
			/>
			{#if err('title')}<span class="err" id="ct-err">{err('title')}</span>{/if}
			<span class="cnt" id="ct-cnt">{title.length} / 100</span>
			<div aria-live="polite">
				{#if similar.length}
					<div class="sim">
						<b>Similar concerns already posted</b>
						{#each similar as s (s.id)}
							<a href="/concerns/{s.id}">{s.title}<span>{s.meta}</span></a>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="f">
			<label for="cd">What is happening?</label>
			<textarea
				id="cd"
				name="description"
				class="input"
				maxlength="4000"
				required
				placeholder="Describe the problem and when it happens"
				aria-invalid={err('description') ? 'true' : undefined}
				aria-describedby={err('description') ? 'cd-err' : undefined}
				>{val(f, 'description')}</textarea
			>
			{#if err('description')}<span class="err" id="cd-err">{err('description')}</span>{/if}
		</div>

		<div class="f">
			<label for="cc">Category</label>
			<select
				id="cc"
				name="category"
				class="input"
				required
				aria-invalid={err('category') ? 'true' : undefined}
				aria-describedby={err('category') ? 'cc-err' : undefined}
			>
				<option value="">Choose a category</option>
				{#each data.categories as c (c.id)}
					<option value={c.id} selected={val(f, 'category') === String(c.id)}>{c.name}</option>
				{/each}
			</select>
			{#if err('category')}<span class="err" id="cc-err">{err('category')}</span>{/if}
		</div>

		<details class="more" open={!!(val(f, 'location') || err('photo') || data.campaign)}>
			<summary>Add more details (optional)</summary>
			<div class="mt-5">
				<div class="f">
					<label for="cl">Location on campus</label>
					<input
						id="cl"
						name="location"
						class="input"
						type="text"
						maxlength="120"
						placeholder="Building, floor, or area"
						value={val(f, 'location')}
					/>
				</div>
				<div class="f">
					<span class="lb" id="ph-l">Photo</span>
					<label class="btn btn-o btn-sm photo">
						<Icon name="img" size={18} />{photoName ? 'Change photo' : 'Add a photo'}
						<input
							type="file"
							name="photo"
							accept="image/jpeg,image/png,image/webp"
							class="sr-only"
							aria-labelledby="ph-l"
							aria-describedby="ph-h"
							onchange={(e) => (photoName = e.currentTarget.files?.[0]?.name ?? '')}
						/>
					</label>
					{#if photoName}<span class="ml-3 text-sm">{photoName}</span>{/if}
					{#if err('photo')}<span class="err">{err('photo')}</span>{/if}
					<span class="cnt text-left" id="ph-h"
						>JPG, PNG, or WebP, up to 5 MB. Location data is removed automatically.</span
					>
				</div>
				{#if data.tags.length}
					<fieldset class="f tags">
						<legend class="lb">Tags</legend>
						<div class="flex flex-wrap gap-2">
							{#each data.tags as tg (tg.id)}
								<label class="tg"
									><input
										type="checkbox"
										name="tags"
										value={tg.id}
										checked={tg.id === data.campaign?.tagId}
									/>
									{tg.name}</label
								>
							{/each}
						</div>
					</fieldset>
				{/if}
			</div>
		</details>

		<div class="f">
			<label class="chk" for="cs">
				<input id="cs" name="sensitive" type="checkbox" checked={val(f, 'sensitive') === 'on'} />
				<span
					><b>This involves safety or harassment</b><small
						>Moderators will review it carefully before it is shown.</small
					></span
				>
			</label>
		</div>

		<div class="fact">
			<span>{PERSONAL_DETAILS_WARNING}</span>
			<a class="btn btn-o" href="/concerns">Cancel</a>
			<button class="btn btn-p" type="submit" disabled={submitting}
				>{submitting ? 'Posting…' : 'Post anonymously'}</button
			>
		</div>
	</form>

	<aside class="fside" aria-label="Before you post">
		<div class="notice">
			<b>Urgent or serious?</b>
			For emergencies, harassment, or safety, contact the proper campus office directly. Office:
			<i>{OFFICES.urgent.name}</i>. Contact: <i>{OFFICES.urgent.contact}</i>.
		</div>
		<div class="notice">
			<b>What happens next</b>
			<ul>
				<li>Your concern appears on the board right away, unless it needs a moderator first.</li>
				<li>Others can comment and propose fixes.</li>
				<li>Staff update the status as it moves forward.</li>
			</ul>
		</div>
		<div class="notice">
			<b>Good to know</b>
			Campusphere does not change university policy by itself. Concerns are reviewed and coordinated with
			the right offices.
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
	.fwrap {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 340px;
		gap: 40px;
		margin-top: 30px;
		align-items: start;
	}
	.fside {
		position: sticky;
		top: 20px;
	}
	.fside ul {
		margin: 8px 0 0 18px;
		color: var(--muted);
		font-size: 15px;
		list-style: disc;
	}
	.sim {
		margin-top: 10px;
		border: 1px solid var(--line);
		border-radius: 14px;
		background: var(--rose);
		padding: 14px 16px;
		font-size: 15px;
	}
	.sim b {
		display: block;
		margin-bottom: 6px;
		font-size: 14px;
		color: var(--muted);
		font-weight: 600;
	}
	.sim a {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 7px 0;
		font-weight: 600;
	}
	.sim a span {
		font-weight: 500;
		color: var(--muted);
		font-size: 14px;
		white-space: nowrap;
	}
	.sim a:hover {
		color: var(--red);
	}
	.photo {
		cursor: pointer;
	}
	.photo:focus-within {
		outline: 3px solid var(--red);
		outline-offset: 3px;
	}
	.tags {
		border: 0;
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
	@media (max-width: 1100px) {
		.fwrap {
			grid-template-columns: 1fr;
		}
		.fside {
			position: static;
		}
	}
</style>
