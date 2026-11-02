import type { Action } from 'svelte/action';

/**
 * Cursor spotlight + dot grid: writes the pointer position into `--mx` / `--my` on the node.
 * The visual effect lives in CSS (radial gradients that read those variables).
 * Disabled for reduced motion and for touch-only pointers, where the CSS default position is used.
 */
export const spotlight: Action<HTMLElement> = (node) => {
	const reduce = matchMedia('(prefers-reduced-motion: reduce)');
	const fine = matchMedia('(pointer: fine)');
	let frame = 0;

	function move(e: PointerEvent) {
		if (reduce.matches || !fine.matches) return;
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			const r = node.getBoundingClientRect();
			node.style.setProperty('--mx', `${e.clientX - r.left}px`);
			node.style.setProperty('--my', `${e.clientY - r.top}px`);
		});
	}

	node.addEventListener('pointermove', move, { passive: true });
	return {
		destroy() {
			cancelAnimationFrame(frame);
			node.removeEventListener('pointermove', move);
		}
	};
};
