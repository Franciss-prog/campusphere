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
