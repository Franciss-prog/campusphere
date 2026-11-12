<script lang="ts">
	import type { ValueChip } from '#lib/campaigns.ts';

	// Core value a campaign puts into practice. The focus value (Service) is filled red.
	let { chip }: { chip: ValueChip } = $props();
</script>

<span class="vchip" class:focus={chip.focus}
	><span class="k">Core value</span><b>{chip.name}</b></span
>

<style>
	.vchip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		border-radius: 999px;
		padding: 5px 13px;
		font-size: 13.5px;
		background: var(--tint);
		color: var(--red-d);
		border: 1px solid var(--line);
		white-space: nowrap;
	}
	.k {
		font-weight: 500;
	}
	b {
		font-weight: 700;
	}
	.focus {
		background: var(--red);
		border-color: var(--red);
		color: #fff;
	}
</style>
