// Extracts Vision, Mission and Core values from the pinned official blog post's Markdown,
// so the landing page and the article render them from real content, not hard-coded markup.

export type CoreValue = { name: string; text: string; focus: boolean };
export type UniversityStatement = {
	vision: string | null;
	mission: string | null;
	values: CoreValue[];
};

/** The value Campusphere is built on; highlighted wherever values are listed. */
export const FOCUS_VALUE = 'Service';

function section(md: string, heading: string): string | null {
	const re = new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'im');
	const m = md.match(re);
	return m ? m[1].trim() : null;
}

function unquote(block: string): string {
	return block
		.split('\n')
		.map((l) => l.replace(/^>\s?/, ''))
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function parseUniversityStatement(md: string): UniversityStatement {
	const vision = section(md, 'Vision');
	const mission = section(md, 'Mission');
	const valuesBlock = section(md, 'Core values') ?? '';
	const values: CoreValue[] = [];
	for (const line of valuesBlock.split('\n')) {
		const m = line.match(/^\s*[-*]\s+\*\*(.+?)\*\*\s*[:–-]?\s*(.*)$/);
		if (m)
			values.push({ name: m[1].trim(), text: m[2].trim(), focus: m[1].trim() === FOCUS_VALUE });
	}
	return {
		vision: vision ? unquote(vision) : null,
		mission: mission ? unquote(mission) : null,
		values
	};
}

/** Markdown of every `##` section other than Vision, Mission and Core values. */
export function otherSections(md: string): string {
	const parts = md.split(/^(?=##\s)/m);
	return parts
		.filter((p) => !/^##\s+(Vision|Mission|Core values)\s*$/im.test(p.split('\n')[0]))
		.filter((p) => p.trim().startsWith('##'))
		.join('\n')
		.trim();
}
