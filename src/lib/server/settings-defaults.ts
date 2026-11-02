// Default moderation settings. Stored in the `setting` table; staff can change them later.
export type Settings = {
	/** `post`: publish immediately, moderate after. `pre`: hold new content for review. */
	moderation_mode: 'post' | 'pre';
	/** Unique open reports on one item that auto-hide it pending review. */
	auto_hide_threshold: number;
	/** Case-insensitive words/phrases that route content to the review queue instead of publishing. */
	word_filter: string[];
	/** Max links allowed in one submission before it is held for review. */
	max_links: number;
	/** Minutes during which an anonymous author may edit or delete their own content. */
	edit_window_minutes: number;
};

export const DEFAULT_SETTINGS: Settings = {
	moderation_mode: 'post',
	auto_hide_threshold: 3,
	word_filter: [],
	max_links: 2,
	edit_window_minutes: 30
};
