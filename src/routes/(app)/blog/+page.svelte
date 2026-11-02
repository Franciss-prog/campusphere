<script lang="ts">
	import { page } from '$app/state';
	import Banner from '#lib/components/shell/Banner.svelte';
	import Icon from '#lib/components/ui/Icon.svelte';
	import LinkTabs from '#lib/components/ui/LinkTabs.svelte';
	import Pager from '#lib/components/ui/Pager.svelte';
	import SortSelect from '#lib/components/ui/SortSelect.svelte';
	import { shortDate, withParams } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const tabs = $derived([
		{
			href: withParams(page.url, { category: null }),
			label: 'All',
			count: data.counts.all,
			current: !data.category
		},
		...data.categories.map((c) => ({
			href: withParams(page.url, { category: c.slug }),
			label: c.name,
			count: data.counts.bySlug[c.slug] ?? 0,
			current: data.category === c.slug
		}))
	]);
</script>

<svelte:head><title>Campus Blog | Campusphere</title></svelte:head>

<Banner
	title="Campus Blog"
	subtitle="Stories, guides, and announcements from the people who study and work here."
>
	{#snippet action()}<a class="btn btn-w" href="/blog/new">Write a post</a>{/snippet}
</Banner>

{#if data.pinned && !data.category && data.list.page === 1}
	<a class="feat on-dark" href="/blog/{data.pinned.slug}">
		<div class="l">
			<span class="official">Pinned official post</span>
			<h2 class="disp">{data.pinned.title}</h2>
			<p>{data.pinned.excerpt}</p>
			<span class="rd">Read the post<Icon name="back" size={18} class="rotate-180" /></span>
		</div>
		{#if data.values.length}
			<div class="r" aria-hidden="true">
				{#each data.values as v (v.name)}
					<div class:sv={v.focus}>
						{v.name}{#if v.focus}<span>our focus</span>{/if}
					</div>
				{/each}
			</div>
		{/if}
	</a>
{/if}

<div class="listhead">
	<div>
		<h2 class="disp">Latest posts</h2>
		<p>Written anonymously by students and faculty.</p>
	</div>
	<SortSelect
		value={data.sort}
		options={[
			['newest', 'Newest'],
			['liked', 'Most liked'],
			['discussed', 'Most discussed']
		]}
	/>
</div>

<LinkTabs label="Filter by category" items={tabs} />
{#if data.tag}
	<p class="mt-4 text-[15px] text-muted-foreground">
		Tagged <b class="text-ink">{data.tag}</b>. <a class="lk" href="/blog">Clear tag</a>
	</p>
{/if}

{#if data.list.items.length}
	<div class="card-grid">
		{#each data.list.items as p (p.id)}
			<article class="card">
				{#if p.coverImage}
					<img
						class="ph"
						src="/media/{p.coverImage}"
						alt=""
						loading="lazy"
						width="400"
						height="150"
					/>
				{/if}
				<div class="b">
					<div class="t">
						<span>{p.categoryName ?? 'Post'}</span>
						{#if p.isOfficial}<span class="off">Official</span>{/if}
					</div>
					<h3 class="disp"><a class="stretch" href="/blog/{p.slug}">{p.title}</a></h3>
					<p>{p.excerpt}</p>
					<div class="m">
						<span>{p.byline}</span>
						<time datetime={new Date(p.createdAt).toISOString()}>{shortDate(p.createdAt)}</time>
						<span class="likes" aria-label="{p.likeCount} likes"
							><Icon name="up" size={16} />{p.likeCount}</span
						>
					</div>
				</div>
			</article>
		{/each}
	</div>
	<Pager page={data.list.page} perPage={data.list.perPage} total={data.list.total} noun="posts" />
{:else}
	<div class="empty">
		<p>No posts here yet. Share something useful with the campus.</p>
		<a class="btn btn-o" href="/blog/new">Write a post</a>
	</div>
{/if}

<style>
	.feat {
		margin-top: 24px;
		display: grid;
		grid-template-columns: 1.25fr 1fr;
		border-radius: 28px;
		overflow: hidden;
		background: var(--deep2);
		color: #fff;
		transition: transform 0.45s var(--ease);
	}
	.feat:hover {
		transform: translateY(-4px);
	}
	.feat .l {
		padding: 46px 50px;
	}
	.official {
		display: inline-block;
		font-size: 14px;
		font-weight: 700;
		color: #ffb3ae;
		border-bottom: 2px solid var(--red);
		padding-bottom: 2px;
	}
	.feat h2 {
		font-size: clamp(34px, 3.8vw, 58px);
		line-height: 0.98;
		margin: 18px 0 16px;
	}
	.feat p {
		color: #f2d2cf;
		font-size: 18px;
		max-width: 520px;
		line-height: 1.55;
	}
	.rd {
		margin-top: 26px;
		font-weight: 700;
		display: inline-flex;
		gap: 10px;
		align-items: center;
	}
	.feat .r {
		background: var(--red);
		padding: 38px 44px;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.feat .r div {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 11px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.3);
		font-size: 19px;
	}
	.feat .r div:last-child {
		border-bottom: 0;
	}
	.feat .r div.sv {
		font-size: 34px;
		padding: 16px 0;
		font-family: var(--font-display);
		font-weight: 700;
		letter-spacing: -0.04em;
	}
	.feat .r div span {
		font-size: 13.5px;
		color: #fff1ee;
		font-family: var(--font-sans);
		letter-spacing: 0;
		font-weight: 500;
	}
	.ph {
		height: 150px;
		width: 100%;
		object-fit: cover;
		border-bottom: 1px solid var(--line);
	}
	.b {
		padding: 22px 22px 20px;
		display: flex;
		flex-direction: column;
		flex: 1;
	}
	.t {
		display: flex;
		justify-content: space-between;
		font-size: 13.5px;
		color: var(--muted);
	}
	.off {
		font-weight: 700;
		color: var(--red-d);
		border-bottom: 2px solid var(--red);
	}
	h3 {
		font-size: 22px;
		line-height: 1.18;
		margin: 14px 0 8px;
	}
	.stretch::after {
		content: '';
		position: absolute;
		inset: 0;
	}
	.stretch:focus-visible {
		outline: none;
	}
	.stretch:focus-visible::after {
		outline: 3px solid var(--red);
		outline-offset: -3px;
		border-radius: 22px;
	}
	.b > p {
		font-size: 15.5px;
		color: var(--muted);
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.m {
		margin-top: auto;
		padding-top: 20px;
		display: flex;
		align-items: center;
		gap: 16px;
		font-size: 14px;
		color: var(--muted);
		flex-wrap: wrap;
	}
	.likes {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: 1.5px solid var(--line);
		border-radius: 999px;
		padding: 6px 12px;
		font-weight: 700;
		color: var(--ink);
	}
	@media (max-width: 1100px) {
		.feat {
			grid-template-columns: 1fr;
		}
		.feat .l {
			padding: 32px 24px;
		}
		.feat .r {
			padding: 24px;
		}
	}
</style>
