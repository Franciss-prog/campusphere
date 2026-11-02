/** Report reasons: stored as codes (pg enum `report_reason`), shown as labels. */
export const REPORT_REASONS = [
	'private_person',
	'harassment',
	'spam',
	'off_topic',
	'safety',
	'other'
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
	private_person: 'Names or targets a private person',
	harassment: 'Harassment or abusive language',
	spam: 'Spam or advertising',
	off_topic: 'Off topic',
	safety: 'Safety concern',
	other: 'Something else'
};
