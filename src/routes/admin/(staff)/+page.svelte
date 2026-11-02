<script lang="ts">
	import Banner from '#lib/components/shell/Banner.svelte';
	import CountUp from '#lib/components/motion/CountUp.svelte';
	import { describeAudit } from '#lib/audit-text.ts';
	import { STATUS_LABEL } from '#lib/status.ts';
	import { timeAgo } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const max = $derived(Math.max(1, ...data.weeks.map((w) => w.n)));
	const chartLabel = $derived(
		`New concerns per week for the last ${data.weeks.length} weeks: ` +
			data.weeks.map((w) => `${w.week}, ${w.n}`).join('; ')
	);
	const who = (a: { staffEmail: string | null; staffRole: string | null }) =>
		a.staffEmail ? a.staffEmail.split('@')[0] : 'System';
	const clock = (d: Date) => {
		const dt = new Date(d);
		return Date.now() - dt.getTime() < 86_400_000
			? dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
			: timeAgo(dt);
	};
</script>

<svelte:head><title>Dashboard | Campusphere staff</title></svelte:head>

<Banner variant="staff" title="Dashboard" subtitle="What needs your attention today." />

<div class="stats">
	<a class="stat hot" href="/admin/moderation"
		><CountUp to={data.reportsToReview} class="disp n" /><span>Items to review</span></a
	>
	<a class="stat" href="/admin/concerns?status=stale"
		><CountUp to={data.staleCount} class="disp n" /><span>Concerns waiting for a status update</span
		></a
	>
	<div class="stat">
		<CountUp to={data.newThisWeek} class="disp n" /><span>New concerns this week</span>
	</div>
	<div class="stat">
		<CountUp to={data.resolvedThisMonth} class="disp n" /><span>Resolved this month</span>
	</div>
</div>

<div class="dcols">
	<section class="panel">
		<h2 class="disp h3">Needs attention</h2>
		<p class="sub">Oldest first.</p>
		<div class="att">
			{#each data.queueTop as q (q.key)}
				<a href="/admin/moderation?item={q.key}">
					<div>
						<b>{q.title}</b>
						<small
							>{q.pending
								? 'Waiting for approval'
								: `${q.reports} ${q.reports === 1 ? 'report' : 'reports'}`},
							{timeAgo(q.at)}</small
						>
					</div>
					<span class="lk">Review</span>
				</a>
			{/each}
			{#each data.staleList as c (c.id)}
				<a href="/admin/concerns?update={c.id}">
					<div>
						<b>{c.title}</b>
						<small>{STATUS_LABEL[c.status]} since {timeAgo(c.statusChangedAt).toLowerCase()}</small>
					</div>
					<span class="lk">Update</span>
				</a>
			{/each}
			{#if !data.queueTop.length && !data.staleList.length}
				<p class="py-4 text-muted-foreground">Nothing needs attention. Nice work.</p>
			{/if}
		</div>
	</section>

	<section class="panel">
		<h2 class="disp h3">New concerns by week</h2>
		<p class="sub">Last {data.weeks.length} weeks.</p>
		<div class="bars" role="img" aria-label={chartLabel}>
			{#each data.weeks as w, i (w.week)}
				<div>
					<em>{w.n}</em>
					<i class:cur={i === data.weeks.length - 1} style="height:{Math.max(2, (w.n / max) * 75)}%"
					></i>
					<span>{w.week}</span>
				</div>
			{/each}
		</div>
	</section>
</div>

<section class="panel mt-5">
	<h2 class="disp h3">Recent activity</h2>
	<p class="sub">Every staff action is logged.</p>
	{#if data.activity.length}
		<ul class="log">
			{#each data.activity as a (a.id)}
				<li>
					<span>{clock(a.createdAt)}</span>
					<div><b>{who(a)}</b> {describeAudit(a)}</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="py-4 text-muted-foreground">No staff activity yet.</p>
	{/if}
</section>

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-top: 24px;
	}
	.stat {
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 20px;
		padding: 22px 24px;
		display: block;
	}
	a.stat:hover {
		border-color: var(--hover-line);
	}
	.stat :global(.n) {
		display: block;
		font-size: 46px;
		line-height: 1;
	}
	.stat span {
		display: block;
		margin-top: 10px;
		color: var(--muted);
		font-size: 15px;
	}
	.stat.hot {
		border-color: var(--hover-line);
		box-shadow: inset 0 4px 0 var(--red);
	}
	.dcols {
		display: grid;
		grid-template-columns: 1.1fr 1fr;
		gap: 20px;
		margin-top: 20px;
	}
	.h3 {
		font-size: 24px;
		line-height: 1.1;
	}
	.att {
		margin-top: 18px;
	}
	.att a {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 15px 0;
		border-top: 1px solid var(--line2);
	}
	.att b {
		display: block;
		font-size: 16px;
	}
	.att small {
		color: var(--muted);
		font-size: 14px;
	}
	.att a:hover b {
		color: var(--red);
	}
	.bars {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		height: 190px;
		margin-top: 22px;
	}
	.bars div {
		flex: 1;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		gap: 6px;
	}
	.bars em {
		font-style: normal;
		font-size: 13px;
		font-weight: 700;
	}
	.bars i {
		display: block;
		width: 100%;
		border-radius: 8px 8px 3px 3px;
		background: var(--hover-line);
	}
	.bars i.cur {
		background: var(--red);
	}
	.bars span {
		font-size: 12px;
		color: var(--muted);
		white-space: nowrap;
	}
	.log {
		margin-top: 16px;
		list-style: none;
	}
	.log li {
		display: grid;
		grid-template-columns: 96px 1fr;
		gap: 14px;
		padding: 13px 0;
		border-top: 1px solid var(--line2);
		font-size: 15px;
	}
	.log span {
		color: var(--faint);
		font-size: 13.5px;
		padding-top: 2px;
	}
	@media (max-width: 1100px) {
		.stats {
			grid-template-columns: 1fr 1fr;
		}
		.dcols {
			grid-template-columns: 1fr;
		}
		.bars span {
			font-size: 10px;
		}
		.bars {
			gap: 6px;
		}
	}
</style>
