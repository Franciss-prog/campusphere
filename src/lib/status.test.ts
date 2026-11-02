import { describe, expect, it } from 'vitest';
import { checkTransition, nextStatus, stageOf, STATUSES } from './status.ts';

describe('status rules', () => {
	it('has seven statuses in the documented order', () => {
		expect(STATUSES).toEqual([
			'submitted',
			'under_review',
			'in_discussion',
			'action_planned',
			'in_progress',
			'resolved',
			'closed'
		]);
		expect(stageOf('submitted')).toBe(1);
		expect(stageOf('in_progress')).toBe(5);
	});

	it('suggests the next stage and stops at terminal statuses', () => {
		expect(nextStatus('in_progress')).toBe('resolved');
		expect(nextStatus('resolved')).toBeNull();
		expect(nextStatus('closed')).toBeNull();
	});

	it('rejects a no-op transition', () => {
		expect(checkTransition('submitted', 'submitted', null).ok).toBe(false);
	});

	it('requires a public note for Closed / Not Feasible', () => {
		expect(checkTransition('under_review', 'closed', '  ').ok).toBe(false);
		expect(checkTransition('under_review', 'closed', 'Outside campus control.').ok).toBe(true);
	});

	it('allows reopening a resolved concern', () => {
		expect(checkTransition('resolved', 'in_progress', null).ok).toBe(true);
	});

	it('rejects unknown statuses', () => {
		// @ts-expect-error testing runtime validation
		expect(checkTransition('submitted', 'done', null).ok).toBe(false);
	});
});
