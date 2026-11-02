<script lang="ts">
	import { enhance } from '$app/forms';
	import Discussion from '#lib/components/ui/Discussion.svelte';
	import FormGuard from '#lib/components/ui/FormGuard.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import ReportForm from '#lib/components/ui/ReportForm.svelte';
	import StatusPill from '#lib/components/ui/StatusPill.svelte';
	import StatusTimeline from '#lib/components/ui/StatusTimeline.svelte';
	import SupportButton from '#lib/components/ui/SupportButton.svelte';
	import SortSelect from '#lib/components/ui/SortSelect.svelte';
	import { nextStatus, stageOf, STATUS_LABEL } from '#lib/status.ts';
	import { plural, timeAgo } from '#lib/format.ts';
	import { formState, val } from '#lib/form-state.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const c = $derived(data.concern);
	const stage = $derived(stageOf(c.status));
	const next = $derived(nextStatus(c.status));
	const isRec = $derived(c.kind === 'recommendation');
	const pf = $derived(formState(form, 'propose'));
	let proposeOpen = $state(false);
	let proposeBusy = $state(false);
	let proposeReset = $state(0);
	let proposeMsg = $state<string | null>(null);
	$effect(() => {
		if (pf?.errors || (pf?.message && !pf.ok)) proposeOpen = true;
	});
</script>

<svelte:head>
	<title>{c.title} | Campusphere</title>
	<meta name="description" content={c.description.slice(0, 160)} />
</svelte:head>

<a class="back" href={isRec ? '/recommendations' : '/concerns'}
	><Icon name="back" size={18} />{isRec ? 'All recommendations' : 'All concerns'}</a
>

{#if data.posted === 'published'}
	<p class="flash ok mb-6" role="status">
		Your {isRec ? 'idea' : 'concern'} is posted. Thank you for speaking up.
	</p>
{:else if data.posted === 'pending' || (c.visibility === 'pending' && c.isAuthor)}
	<p class="flash ok mb-6" role="status">
		Thanks. A moderator will review this before it appears publicly. Only you can see it for now.
	</p>
{:else if c.visibility !== 'published'}
	<p class="flash bad mb-6" role="status">
		This item is {c.visibility === 'hidden' ? 'hidden' : 'waiting for review'} and not visible to the
		public.
	</p>
{/if}

<div class="dwrap">
	<article>
		<header class="dh">
			<StatusPill status={c.status} />
			<h1 class="disp">{c.title}</h1>
			<div class="dmeta">
				{#if c.categoryName}<span>Category <b>{c.categoryName}</b></span>{/if}
				{#if c.location}<span>Location <b>{c.location}</b></span>{/if}
				<span
					>Posted <b
						><time datetime={new Date(c.createdAt).toISOString()}>{timeAgo(c.createdAt)}</time></b
					></span
				>
				{#if isRec}<span>Type <b>Recommendation</b></span>{/if}
			</div>
		</header>

		<p class="dbody">{c.description}</p>

		{#each c.images as img (img)}
			<img
				class="dimg"
				src="/media/{img}"
				alt="Photo attached to this {isRec ? 'idea' : 'concern'}"
			/>
		{/each}

		{#if data.tags.length}
			<p class="tags">
				Tags:
				{#each data.tags as tg, i (tg.slug)}<a href="/concerns?tag={tg.slug}">{tg.name}</a>{i <
					data.tags.length - 1
						? ', '
						: ''}{/each}
			</p>
		{/if}

		<section class="sec" aria-labelledby="hist-h">
			<h2 class="disp" id="hist-h">Status history</h2>
			<p class="l">Every change is logged and public.</p>
			<StatusTimeline history={data.history} />
		</section>

		<section class="sec" aria-labelledby="prop-h">
			<div class="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h2 class="disp h2" id="prop-h">Proposed solutions</h2>
					<p class="lead">Back the ones that make sense. The most supported rise to the top.</p>
				</div>
				{#if data.proposals.length > 1}
					<SortSelect
						name="psort"
						value={data.psort}
						options={[
							['supported', 'Most supported'],
							['newest', 'Newest'],
							['discussed', 'Most discussed']
						]}
					/>
				{/if}
			</div>

			<div class="mt-6">
				{#each data.proposals as p, i (p.id)}
					<article
						class="prop"
						class:best={i === 0 && data.psort === 'supported' && p.supportCount > 0}
					>
						<div class="ptop">
							<div>
								{#if p.adopted}<span class="adopted">Adopted by staff</span>{/if}
								{#if i === 0 && data.psort === 'supported' && p.supportCount > 0}
									<span class="bestlbl">Most supported</span>
								{/if}
								<h3 class="disp">{p.title}</h3>
								<p>{p.description}</p>
								{#if p.feasibilityNotes}<p class="feas">
										<b>Feasibility:</b>
										{p.feasibilityNotes}
									</p>{/if}
							</div>
							<SupportButton
								action="?/supportProposal"
								id={p.id}
								supported={p.supported}
								count={p.supportCount}
								label={p.title}
							/>
						</div>
						<details class="pdisc">
							<summary>{plural(p.commentCount, 'comment')}</summary>
							<Discussion
								compact
								heading="Discussion of this proposal"
								comments={data.proposalComments[p.id] ?? []}
								total={p.commentCount}
								intro={p.commentCount
									? 'Comments are anonymous.'
									: 'No comments on this proposal yet.'}
								placeholder="Is this realistic? What would make it work?"
								thread={{ type: 'proposal', id: p.id }}
								allowComments={c.status !== 'closed'}
							/>
							<ReportForm targetType="proposal" targetId={p.id} label="Report this proposal" />
						</details>
					</article>
				{:else}
					<div class="empty !mt-0">
						<p>No solutions yet. Have an idea that could fix this?</p>
					</div>
				{/each}
			</div>

			{#if c.status !== 'closed' && c.visibility === 'published'}
				<details class="propose" bind:open={proposeOpen}>
					<summary class="btn btn-o">Propose a solution</summary>
					{#if proposeMsg}
						<p class="flash ok mt-4" role="status">{proposeMsg}</p>
					{:else}
						<form
							class="form-card mt-4"
							method="POST"
							action="?/propose"
							use:enhance={() => {
								proposeBusy = true;
								return async ({ result, update }) => {
									proposeBusy = false;
									proposeReset++;
									if (result.type === 'success') {
										proposeMsg = String(result.data?.message ?? 'Posted.');
									}
									await update({ reset: result.type === 'success', navigate: false });
								};
							}}
						>
							<FormGuard resetKey={proposeReset} />
							{#if pf?.message && !pf.ok}<p class="flash bad mb-5" role="alert">
									{pf.message}
								</p>{/if}
							<div class="f">
								<label for="pt">Your solution in one line</label>
								<input
									id="pt"
									name="title"
									class="input"
									maxlength="120"
									required
									value={val(pf, 'title')}
									placeholder="For example, Add a second payment counter at lunch"
									aria-invalid={pf?.errors?.title ? 'true' : undefined}
								/>
								{#if pf?.errors?.title}<span class="err">{pf.errors.title}</span>{/if}
							</div>
							<div class="f">
								<label for="pd">How would it work?</label>
								<textarea
									id="pd"
									name="description"
									class="input"
									maxlength="2000"
									required
									placeholder="Explain the idea and why it would help"
									aria-invalid={pf?.errors?.description ? 'true' : undefined}
									>{val(pf, 'description')}</textarea
								>
								{#if pf?.errors?.description}<span class="err">{pf.errors.description}</span>{/if}
							</div>
							<div class="f">
								<label for="pn"
									>Feasibility notes <span class="hint">Optional. Cost, time, who could do it.</span
									></label
								>
								<textarea id="pn" name="feasibilityNotes" class="input short" maxlength="1000"
									>{val(pf, 'feasibilityNotes')}</textarea
								>
							</div>
							<div class="flex flex-wrap items-center gap-3">
								<span class="flex-1 text-sm text-muted-foreground"
									>Please don't include personal details about yourself or others.</span
								>
								<button class="btn btn-p" type="submit" disabled={proposeBusy}
									>{proposeBusy ? 'Posting…' : 'Post proposal'}</button
								>
							</div>
						</form>
					{/if}
				</details>
			{/if}
		</section>

		<Discussion
			comments={data.comments}
			total={c.commentCount}
			allowComments={c.visibility === 'published'}
		/>
	</article>

	<aside class="rail" aria-label="Summary">
		<div class="rc">
			<h2 class="rh">Where this stands</h2>
			<div class="big disp">{STATUS_LABEL[c.status]}</div>
			<div class="seg" role="img" aria-label="Stage {stage} of 7">
				{#each Array.from({ length: 7 }, (_, i) => i) as i (i)}<i class:f={i < stage}></i>{/each}
			</div>
			<p class="small">
				Stage {stage} of 7.{next ? ` Next: ${STATUS_LABEL[next]}.` : ''}
			</p>
		</div>
		<div class="rc">
			<h2 class="rh">The community</h2>
			<div class="big disp">{c.supportCount}</div>
			<p class="small">
				{c.supportCount === 1 ? 'person supports' : 'people support'} this {isRec
					? 'idea'
					: 'concern'}
			</p>
			{#if c.visibility === 'published'}
				<div class="mt-4">
					<SupportButton
						action="?/support"
						id={c.id}
						supported={c.supported}
						count={c.supportCount}
						size="lg"
					/>
				</div>
				{#if !c.isAuthor}
					<div class="mt-2 text-center">
						<ReportForm
							targetType="concern"
							targetId={c.id}
							label="Report this {isRec ? 'idea' : 'concern'}"
						/>
					</div>
				{/if}
			{/if}
		</div>
		<div class="rc">
			<dl>
				<dt>Comments</dt>
				<dd>{c.commentCount}</dd>
				<dt>Proposals</dt>
				<dd>{c.proposalCount}</dd>
				{#if c.categoryName}<dt>Category</dt>
					<dd>{c.categoryName}</dd>{/if}
			</dl>
		</div>
	</aside>
</div>

<style>
	.dwrap {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 340px;
		gap: 40px;
		align-items: start;
	}
	.dh h1 {
		font-size: clamp(36px, 4.4vw, 64px);
		line-height: 0.98;
		margin: 16px 0 14px;
		max-width: 900px;
		overflow-wrap: anywhere;
	}
	.dmeta {
		display: flex;
		gap: 8px 26px;
		flex-wrap: wrap;
		font-size: 15px;
		color: var(--muted);
	}
	.dmeta b {
		color: var(--ink);
		font-weight: 600;
	}
	.dbody {
		margin-top: 28px;
		font-size: 18px;
		line-height: 1.7;
		max-width: 760px;
		color: #3a2a2c;
		white-space: pre-line;
		overflow-wrap: anywhere;
	}
	.dimg {
		margin-top: 26px;
		border-radius: 22px;
		border: 1px solid var(--line);
		max-height: 420px;
		width: 100%;
		object-fit: cover;
		background: #fbe3df;
	}
	.tags {
		margin-top: 20px;
		font-size: 15px;
		color: var(--muted);
	}
	.tags a {
		color: var(--red-d);
		font-weight: 600;
	}
	.h2 {
		font-size: 30px;
		line-height: 1.1;
		margin-bottom: 6px;
	}
	.lead {
		color: var(--muted);
	}
	.prop {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 20px;
		padding: 22px 24px 6px;
	}
	.prop + .prop {
		margin-top: 14px;
	}
	.ptop {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 20px;
		align-items: center;
	}
	.prop h3 {
		font-size: 21px;
		line-height: 1.2;
	}
	.prop p {
		margin-top: 6px;
		color: var(--muted);
		font-size: 15.5px;
		max-width: 560px;
	}
	.prop .feas {
		font-size: 14.5px;
	}
	.prop.best {
		border-color: var(--hover-line);
		box-shadow: inset 4px 0 0 var(--red);
	}
	.bestlbl {
		display: inline-block;
		font-size: 13px;
		font-weight: 700;
		color: var(--red-d);
		margin-bottom: 6px;
	}
	.pdisc summary {
		cursor: pointer;
		list-style: none;
		font-size: 14px;
		color: var(--muted);
		font-weight: 600;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.pdisc summary::-webkit-details-marker {
		display: none;
	}
	.pdisc summary:hover {
		color: var(--red);
	}
	.pdisc[open] {
		padding-bottom: 14px;
	}
	.propose {
		margin-top: 16px;
	}
	.propose > summary {
		list-style: none;
	}
	.propose > summary::-webkit-details-marker {
		display: none;
	}
	textarea.short {
		min-height: 90px;
	}
	.rail {
		position: sticky;
		top: 20px;
		display: grid;
		gap: 16px;
	}
	.rc {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 22px;
		padding: 24px;
	}
	.rh {
		font-size: 15px;
		color: var(--muted);
		font-weight: 600;
		margin-bottom: 10px;
	}
	.big {
		font-size: 34px;
		line-height: 1.05;
	}
	.seg {
		margin-top: 18px;
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
	}
	.seg i {
		height: 8px;
		border-radius: 4px;
		background: var(--line);
		display: block;
	}
	.seg i.f {
		background: var(--red);
	}
	.small {
		margin-top: 10px;
		font-size: 14px;
		color: var(--muted);
	}
	dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 10px 16px;
		font-size: 15px;
	}
	dt {
		color: var(--muted);
	}
	dd {
		font-weight: 600;
		text-align: right;
	}
	@media (max-width: 1100px) {
		.dwrap {
			grid-template-columns: 1fr;
		}
		.rail {
			position: static;
		}
	}
	@media (max-width: 640px) {
		.ptop {
			grid-template-columns: 1fr;
		}
	}
</style>
