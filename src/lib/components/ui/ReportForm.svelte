<script lang="ts">
	import { enhance } from '$app/forms';

	import { REPORT_REASONS, REPORT_REASON_LABEL } from '#lib/report-reasons.ts';

	// "Report" disclosure: a native <details> so it works without JS and is keyboard accessible.

	let {
		targetType,
		targetId,
		label = 'Report',
		class: className = ''
	}: {
		targetType: 'post' | 'concern' | 'proposal' | 'comment';
		targetId: number;
		label?: string;
		class?: string;
	} = $props();

	let done = $state<string | null>(null);
	let err = $state<string | null>(null);
	let open = $state(false);
	const uid = $props.id();
</script>

<details class="rep {className}" bind:open>
	<summary>{label}</summary>
	{#if done}
		<p class="ok" role="status">{done}</p>
	{:else}
		<form
			method="POST"
			action="?/report"
			use:enhance={() =>
				async ({ result }) => {
					if (result.type === 'success') {
						done = String(result.data?.message ?? 'Thanks for the report.');
						err = null;
					} else if (result.type === 'failure') {
						err = String(result.data?.message ?? 'The report could not be sent.');
					}
				}}
		>
			<input type="hidden" name="targetType" value={targetType} />
			<input type="hidden" name="targetId" value={targetId} />
			<fieldset>
				<legend>Why are you reporting this?</legend>
				{#each REPORT_REASONS as r, i (r)}
					<label
						><input type="radio" name="reason" value={r} required={i === 0} />
						{REPORT_REASON_LABEL[r]}</label
					>
				{/each}
			</fieldset>
			<label class="det" for="{uid}-d">Anything else moderators should know? (optional)</label>
			<textarea id="{uid}-d" name="details" maxlength="500" rows="2" class="input"></textarea>
			{#if err}<p class="err" role="alert">{err}</p>{/if}
			<div class="row">
				<button class="btn btn-o btn-sm" type="submit">Send report</button>
				<button class="lk" type="button" onclick={() => (open = false)}>Cancel</button>
			</div>
		</form>
	{/if}
</details>

<style>
	.rep {
		display: inline-block;
	}
	.rep summary {
		list-style: none;
		cursor: pointer;
		font-size: 14px;
		font-weight: 600;
		color: var(--muted);
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.rep summary::-webkit-details-marker {
		display: none;
	}
	.rep summary:hover {
		color: var(--red);
	}
	.rep[open] {
		display: block;
		width: 100%;
	}
	form {
		margin-top: 6px;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 16px;
		padding: 16px 18px;
		max-width: 520px;
	}
	fieldset {
		border: 0;
		display: grid;
		gap: 4px;
	}
	legend {
		font-weight: 700;
		margin-bottom: 6px;
	}
	fieldset label {
		display: flex;
		gap: 10px;
		align-items: center;
		font-size: 15px;
		min-height: 36px;
	}
	input[type='radio'] {
		accent-color: var(--red);
		width: 18px;
		height: 18px;
	}
	.det {
		display: block;
		margin: 12px 0 6px;
		font-size: 14px;
		font-weight: 600;
		color: var(--muted);
	}
	textarea.input {
		min-height: 64px;
		font-size: 15px;
	}
	.row {
		margin-top: 10px;
		display: flex;
		gap: 14px;
		align-items: center;
	}
	.ok {
		font-size: 14px;
		color: var(--muted);
		padding: 8px 0;
	}
</style>
