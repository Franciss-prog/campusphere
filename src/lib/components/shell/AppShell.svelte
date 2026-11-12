<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import Icon, { type IconName } from '../ui/Icon.svelte';

	type NavItem = { href: string; label: string; icon: IconName; adminOnly?: boolean };

	let {
		mode = 'public',
		role,
		children
	}: {
		mode?: 'public' | 'staff';
		role?: 'ADMIN' | 'MODERATOR';
		children: Snippet;
	} = $props();

	const PUBLIC_NAV: NavItem[] = [
		{ href: '/campaigns', label: 'Action Campaigns', icon: 'target' },
		{ href: '/recommendations', label: 'Recommendations', icon: 'bulb' },
		{ href: '/blog', label: 'Blog', icon: 'doc' },
		{ href: '/concerns', label: 'Campus Concerns', icon: 'flag' },
		{ href: '/solutions', label: 'Solution Hub', icon: 'hub' },
		{ href: '/tracker', label: 'Impact Tracker', icon: 'chart' }
	];
	const STAFF_NAV: NavItem[] = [
		{ href: '/admin', label: 'Dashboard', icon: 'grid' },
		{ href: '/admin/moderation', label: 'Moderation', icon: 'shield' },
		{ href: '/admin/concerns', label: 'Concerns', icon: 'flag' },
		{ href: '/admin/content', label: 'Content', icon: 'list' },
		{ href: '/admin/taxonomy', label: 'Categories and tags', icon: 'tag', adminOnly: true },
		{ href: '/admin/users', label: 'Moderators', icon: 'users', adminOnly: true },
		{ href: '/admin/account', label: 'Account', icon: 'key' }
	];

	const nav = $derived(
		mode === 'public' ? PUBLIC_NAV : STAFF_NAV.filter((n) => !n.adminOnly || role === 'ADMIN')
	);

	function isCurrent(href: string): boolean {
		const p = page.url.pathname;
		if (href === '/admin') return p === '/admin';
		return p === href || p.startsWith(href + '/');
	}

	let menuOpen = $state(false);
	let entranceKey = $state(0);

	afterNavigate(({ type }) => {
		menuOpen = false;
		if (type !== 'enter') entranceKey++;
	});
</script>

<a class="skip" href="#main">Skip to content</a>

<div class="app">
	<aside class="side on-dark">
		<div class="side-head">
			<a class="brand disp" href={mode === 'public' ? '/' : '/admin'}>
				<span class="logo"><Icon name="chat" /></span>Campusphere
			</a>
			<button
				class="menu-btn"
				type="button"
				aria-expanded={menuOpen}
				aria-controls="side-nav"
				onclick={() => (menuOpen = !menuOpen)}
			>
				<Icon name={menuOpen ? 'close' : 'menu'} />
				<span class="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
			</button>
		</div>

		<nav id="side-nav" class="nav" class:open={menuOpen} aria-label="Main">
			{#each nav as item (item.href)}
				<a href={item.href} aria-current={isCurrent(item.href) ? 'page' : undefined}>
					<Icon name={item.icon} />{item.label}
				</a>
			{/each}
			{#if mode === 'public'}
				<div class="grp">About</div>
				<a href="/about" aria-current={isCurrent('/about') ? 'page' : undefined}>
					<Icon name="home" />How it works
				</a>
			{/if}
			<div class="foot">
				<b>Batangas State University</b>Mabini Campus<br />
				{#if mode === 'public'}
					<a class="mode" href="/admin/login">Staff sign in</a>
				{:else}
					<a class="mode" href="/recommendations">Back to public site</a>
					<form method="POST" action="/admin/logout">
						<button class="mode" type="submit">Sign out</button>
					</form>
				{/if}
			</div>
		</nav>
	</aside>

	<div class="main">
		<div class="top">
			<form class="search" role="search" method="GET" action="/search">
				<Icon name="search" size={18} />
				<input
					type="search"
					name="q"
					placeholder="Search concerns, ideas, and posts"
					aria-label="Search"
					value={page.url.pathname === '/search' ? (page.url.searchParams.get('q') ?? '') : ''}
				/>
			</form>
			<div class="sp"></div>
			{#if mode === 'public'}
				<div class="anon"><i></i>Browsing anonymously</div>
				<a class="btn btn-p" href="/concerns/new">Post a concern</a>
			{:else}
				<div class="anon">
					<i class="staff"></i>Signed in as {role === 'ADMIN' ? 'administrator' : 'moderator'}
				</div>
			{/if}
		</div>

		<main id="main" tabindex="-1">
			{#key entranceKey}
				<div class="screen-in">{@render children()}</div>
			{/key}
		</main>
	</div>
</div>

<style>
	.skip {
		position: absolute;
		left: -9999px;
		top: 8px;
		z-index: 100;
		background: #fff;
		color: var(--ink);
		padding: 10px 16px;
		border-radius: 999px;
		font-weight: 700;
	}
	.skip:focus {
		left: 16px;
	}
	.app {
		display: grid;
		grid-template-columns: 272px minmax(0, 1fr);
		min-height: 100vh;
	}
	.side {
		position: sticky;
		top: 0;
		height: 100vh;
		background: var(--deep);
		color: #f7dad6;
		padding: 28px 18px 22px;
		display: flex;
		flex-direction: column;
	}
	.side-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 10px 30px;
		font-size: 24px;
		color: #fff;
	}
	.logo {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--rose);
		color: var(--red);
		display: grid;
		place-items: center;
	}
	.menu-btn {
		display: none;
		width: 44px;
		height: 44px;
		border-radius: 12px;
		place-items: center;
		color: #fff;
		background: rgba(255, 255, 255, 0.08);
	}
	.nav {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
	}
	.nav > a {
		display: flex;
		align-items: center;
		gap: 14px;
		height: 48px;
		padding: 0 14px;
		border-radius: 14px;
		font-weight: 600;
		font-size: 15.5px;
		color: #ebc3be;
		transition:
			background 0.25s,
			color 0.25s,
			transform 0.35s var(--ease);
	}
	.nav > a:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
		transform: translateX(3px);
	}
	.nav > a[aria-current='page'] {
		background: var(--red);
		color: #fff;
		transform: none;
	}
	.grp {
		margin: 22px 14px 8px;
		font-size: 13px;
		font-weight: 600;
		color: #c49a97;
	}
	.foot {
		margin-top: auto;
		padding: 16px 14px 0;
		border-top: 1px solid rgba(255, 255, 255, 0.14);
		font-size: 14px;
		color: #d9afab;
		line-height: 1.45;
	}
	.foot b {
		display: block;
		color: #fff;
		font-size: 15px;
		margin-bottom: 2px;
	}
	.mode {
		margin-top: 14px;
		display: inline-flex;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		border-bottom: 2px solid var(--red);
		padding-bottom: 2px;
		margin-right: 16px;
	}
	.main {
		min-width: 0;
		padding: 0 40px 80px;
	}
	main:focus {
		outline: none;
	}
	.top {
		min-height: 88px;
		display: flex;
		align-items: center;
		gap: 20px;
	}
	.search {
		position: relative;
		flex: 0 1 460px;
		color: var(--muted);
	}
	.search :global(svg) {
		position: absolute;
		left: 16px;
		top: 50%;
		margin-top: -9px;
	}
	.search input {
		width: 100%;
		height: 46px;
		border-radius: 999px;
		border: 1.5px solid var(--line);
		background: #fff;
		padding: 0 18px 0 44px;
		font-size: 15px;
		color: var(--ink);
	}
	.search input::placeholder {
		color: var(--faint);
	}
	.search input:focus {
		outline: none;
		border-color: var(--red);
		box-shadow: 0 0 0 3px rgba(208, 28, 35, 0.18);
	}
	.sp {
		flex: 1;
	}
	.anon {
		font-size: 14.5px;
		color: var(--muted);
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.anon i {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--s-res);
		display: block;
	}
	.anon i.staff {
		background: var(--red);
	}

	@media (max-width: 1100px) {
		.app {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: auto 1fr;
		}
		.sp {
			display: none;
		}
		.anon {
			flex: 1;
		}
		.side {
			position: sticky;
			z-index: 30;
			height: auto;
			padding: 12px 16px;
		}
		.brand {
			padding: 0;
			font-size: 21px;
		}
		.menu-btn {
			display: grid;
		}
		.nav {
			display: none;
			padding-top: 12px;
		}
		.nav.open {
			display: flex;
		}
		.main {
			padding: 0 16px 60px;
		}
		.top {
			min-height: 0;
			padding: 14px 0;
			flex-wrap: wrap;
			gap: 12px;
		}
		.search {
			flex: 1 1 100%;
		}
	}
</style>
