// Static copy shared across pages. University-specific facts that we do not know are
// explicit placeholders for the university to fill in (see README "Placeholders").

export const PLACEHOLDER = '[To be provided by the university]';

export const OFFICES = {
	urgent: {
		name: PLACEHOLDER,
		contact: PLACEHOLDER
	},
	coordination: {
		name: PLACEHOLDER,
		contact: PLACEHOLDER
	}
} as const;

export const CYCLE = [
	{ title: 'Identify', text: 'You run into a problem on campus.' },
	{ title: 'Report', text: 'Post it anonymously in under a minute.' },
	{ title: 'Collaborate', text: 'Others add context and propose solutions.' },
	{ title: 'Take action', text: 'The right university office reviews and acts.' },
	{ title: 'Improve', text: 'The outcome is published for everyone.' }
] as const;

export const PERSONAL_DETAILS_WARNING =
	'Please do not include personal details about yourself or others.';

import type { IconName } from '#lib/components/ui/Icon.svelte';

// ---------------------------------------------------------------------------
// Action Campaigns (Ethics in Action). Static in v1; shaped so the list can move into a
// `campaign` table later without renaming fields. Each slug is also the tag slug that links
// articles, concerns and recommendations to the campaign. Copy is a draft for the campaign team.
// ---------------------------------------------------------------------------
export type Campaign = {
	slug: string;
	title: string;
	summary: string;
	/** Must match a core value name parsed from the pinned post (case-insensitive). */
	coreValue: string;
	actions: readonly string[];
	/** Display only (hero stickers). */
	icon: IconName;
};

// TODO: confirm with the campaign team (copy and the core value of each campaign).
export const CAMPAIGNS = [
	{
		slug: 'keep-our-campus-clean',
		icon: 'trash',
		title: 'Keep Our Campus Clean',
		summary:
			'A clean campus starts with small daily habits. Dispose of waste properly and help others do the same.',
		coreValue: 'Service',
		actions: [
			'Use the right bin every time.',
			'Bring a reusable bottle and container.',
			'Report missing or overflowing bins, or recommend where new ones should go.'
		]
	},
	{
		slug: 'practice-academic-integrity',
		icon: 'book',
		title: 'Practice Academic Integrity',
		summary:
			'Honest work is the foundation of a degree worth earning. Do your own work and credit the work of others.',
		coreValue: 'Integrity',
		actions: [
			'Cite every source you use.',
			'Do not share or ask for answers during exams.',
			'Ask your instructor when you are unsure what counts as cheating.'
		]
	},
	{
		slug: 'respect-campus-facilities',
		icon: 'building',
		title: 'Respect Campus Facilities',
		summary:
			'Shared rooms, equipment, and grounds serve everyone. Treat them as you would want them treated.',
		coreValue: 'Patriotism',
		actions: [
			'Leave rooms, restrooms, and equipment as you found them.',
			'Report damage early.',
			'Turn off lights, fans, and taps when you leave.'
		]
	},
	{
		slug: 'promote-responsible-behavior',
		icon: 'users',
		title: 'Promote Responsible Student Behavior',
		summary:
			'A respectful, disciplined campus is built by everyday choices, and by speaking up kindly when needed.',
		coreValue: 'Faith',
		actions: [
			'Follow campus rules and schedules.',
			'Treat classmates, staff, and guards with respect.',
			'Speak up kindly when behavior hurts the community.'
		]
	}
] as const satisfies readonly Campaign[];

/** The six project objectives (README "Objectives"), shown on the landing page. */
export const OBJECTIVES = [
	{
		title: 'Centralize',
		text: 'Establish a centralized platform for campus communication and collaboration.'
	},
	{
		title: 'Participate',
		text: 'Encourage students and faculty members to actively participate in improving campus services.'
	},
	{
		title: 'Speak safely',
		text: 'Provide an anonymous space for reporting and discussing campus-related problems.'
	},
	{
		title: 'Solve together',
		text: 'Enable collaborative solution proposals and constructive discussions.'
	},
	{
		title: 'Stay transparent',
		text: 'Promote transparency through concern and resolution tracking.'
	},
	{
		title: 'Serve',
		text: 'Encourage a culture of service, responsibility, and continuous improvement.'
	}
] as const;

/** The two ways to take part. The examples are a matched pair (problem, then fix). */
export const PARTICIPATE = [
	{
		key: 'concern',
		title: 'Report a Concern',
		icon: 'flag',
		purpose: 'Report campus problems, inconveniences, or issues.',
		example: 'Lack of trash bins in certain campus areas.',
		primary: { href: '/concerns/new', label: 'Report a concern' },
		secondary: { href: '/concerns', label: 'Browse concerns' }
	},
	{
		key: 'recommendation',
		title: 'Campus Recommendations',
		icon: 'bulb',
		purpose: 'Suggest improvements, activities, or solutions for the campus.',
		example: 'Add more waste segregation bins and encourage proper waste disposal.',
		primary: { href: '/recommendations', label: 'Share a recommendation' },
		secondary: { href: '/recommendations#recent', label: 'Browse recommendations' }
	}
] as const;
