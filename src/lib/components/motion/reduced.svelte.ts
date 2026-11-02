/** Reactive `prefers-reduced-motion` flag (false during SSR). */
export function reducedMotion(): { readonly value: boolean } {
	let value = $state(false);
	$effect(() => {
		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		value = mq.matches;
		const on = () => (value = mq.matches);
		mq.addEventListener('change', on);
		return () => mq.removeEventListener('change', on);
	});
	return {
		get value() {
			return value;
		}
	};
}
