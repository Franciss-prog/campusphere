// Concern status set, order, and transition rules. Shared by client (hints) and server (authority).

export const STATUSES = [
	'submitted',
	'under_review',
	'in_discussion',
	'action_planned',
	'in_progress',
	'resolved',
	'closed'
] as const;

export type ConcernStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<ConcernStatus, string> = {
	submitted: 'Submitted',
	under_review: 'Under Review',
	in_discussion: 'In Discussion',
	action_planned: 'Action Planned',
	in_progress: 'In Progress',
	resolved: 'Resolved',
	closed: 'Closed / Not Feasible'
};

/** Statuses shown as columns on the Impact Tracker board. */
export const BOARD_STATUSES: ConcernStatus[] = [
	'under_review',
	'in_discussion',
	'action_planned',
	'in_progress',
	'resolved'
];

/** Linear stages for the 7-segment progress bar (Closed counts as the last stage). */
export function stageOf(status: ConcernStatus): number {
	return STATUSES.indexOf(status) + 1;
}

export function nextStatus(status: ConcernStatus): ConcernStatus | null {
	if (status === 'resolved' || status === 'closed') return null;
	return STATUSES[STATUSES.indexOf(status) + 1] ?? null;
}

export function isStatus(v: unknown): v is ConcernStatus {
	return typeof v === 'string' && (STATUSES as readonly string[]).includes(v);
}

export function noteRequired(status: ConcernStatus): boolean {
	return status === 'closed';
}

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

/**
 * Admins may move a concern to any status (including back, when it is reopened),
 * but not to the status it already has, and Closed / Not Feasible needs a public note.
 */
export function checkTransition(
	from: ConcernStatus,
	to: ConcernStatus,
	note: string | null | undefined
): TransitionCheck {
	if (!isStatus(to)) return { ok: false, reason: 'Choose a valid status.' };
	if (from === to) return { ok: false, reason: 'The concern already has this status.' };
	if (noteRequired(to) && !(note ?? '').trim()) {
		return { ok: false, reason: 'Explain why this concern is closed or not feasible.' };
	}
	return { ok: true };
}
