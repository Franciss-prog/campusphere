<script lang="ts" module>
	// 24x24 line icons from the app prototype. Stroke-only, `currentColor`.
	export const ICONS = {
		home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
		bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
		doc: '<path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h4"/>',
		flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
		hub: '<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/>',
		chart: '<path d="M3 20h18M6 16v-5M11 16V7M16 16v-8M21 16v-3"/>',
		search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
		img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
		back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
		up: '<path d="M7 10v11M15 5.9L14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9z"/>',
		shield: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
		users:
			'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3.2 3.2 0 0 1 0 6M18 14c2 .7 3 2.6 3 5"/>',
		tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
		grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
		chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
		menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
		close: '<path d="M6 6l12 12M18 6L6 18"/>',
		key: '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2"/>',
		list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
		target:
			'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
		check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
		arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
		down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
		trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
		book: '<path d="M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14"/>',
		building:
			'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 21v-3h4v3"/>',
		pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'
	} as const;
	export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
	let {
		name,
		size = 20,
		class: className = ''
	}: { name: IconName; size?: number; class?: string } = $props();
</script>

<svg
	class="icon {className}"
	viewBox="0 0 24 24"
	width={size}
	height={size}
	style="width:{size}px;height:{size}px"
	aria-hidden="true"
	focusable="false"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- static, trusted icon markup -->
	{@html ICONS[name]}
</svg>
