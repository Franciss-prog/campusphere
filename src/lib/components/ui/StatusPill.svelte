<script lang="ts">
	import { STATUS_LABEL, type ConcernStatus } from '#lib/status.ts';

	let { status }: { status: ConcernStatus } = $props();
</script>

<span class="st" data-s={status}>{STATUS_LABEL[status]}</span>
