<script lang="ts">
	import { STATUS_LABEL, type ConcernStatus } from '#lib/status.ts';
	import { shortDate } from '#lib/format.ts';

	let {
		history
	}: {
		history: {
			id: number;
			status: ConcernStatus;
			publicNote: string | null;
			createdAt: Date;
			byStaff: boolean;
		}[];
	} = $props();
</script>

<ol class="tl">
	{#each history as h, i (h.id)}
		<li
			class="te"
			class:now={i === 0}
			data-s={h.status}
			aria-current={i === 0 ? 'step' : undefined}
		>
			<div class="h">
				<b>{STATUS_LABEL[h.status]}</b>
				<time datetime={new Date(h.createdAt).toISOString()}>{shortDate(h.createdAt)}</time>
			</div>
			{#if h.publicNote}<p>{h.publicNote}</p>{/if}
			{#if h.byStaff}<div class="by">Updated by staff</div>{/if}
		</li>
	{/each}
</ol>

<style>
	.tl {
		position: relative;
		padding-left: 34px;
		list-style: none;
	}
	.tl::before {
		content: '';
		position: absolute;
		left: 11px;
		top: 8px;
		bottom: 8px;
		width: 3px;
		background: var(--line);
		border-radius: 2px;
	}
	.te {
		position: relative;
		padding: 0 0 28px;
	}
	.te:last-child {
		padding-bottom: 0;
	}
	.te::before {
		content: '';
		position: absolute;
		left: -31px;
		top: 4px;
		width: 17px;
		height: 17px;
		border-radius: 50%;
		background: #fff;
		border: 3px solid var(--c);
	}
	.te.now::before {
		background: var(--c);
		box-shadow: 0 0 0 7px color-mix(in srgb, var(--c) 22%, transparent);
	}
	.h {
		display: flex;
		align-items: baseline;
		gap: 14px;
		flex-wrap: wrap;
	}
	.h b {
		font-size: 18px;
	}
	.h time {
		font-size: 14px;
		color: var(--faint);
	}
	p {
		margin-top: 4px;
		color: var(--muted);
		font-size: 16px;
		max-width: 620px;
	}
	.by {
		font-size: 13.5px;
		color: var(--faint);
		margin-top: 4px;
	}
</style>
