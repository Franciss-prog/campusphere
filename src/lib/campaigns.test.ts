import { describe, expect, it } from 'vitest';
import {
	emptyProgress,
	findCampaign,
	progressLine,
	resolvedCaption,
	shapeProgress,
	valueChip
} from './campaigns.ts';
import { CAMPAIGNS } from './content/site.ts';

describe('findCampaign', () => {
	it('returns the campaign for a known slug', () => {
		expect(findCampaign('keep-our-campus-clean')?.title).toBe('Keep Our Campus Clean');
	});
	it('tolerates case and whitespace', () => {
		expect(findCampaign('  Practice-Academic-Integrity ')?.slug).toBe(
			'practice-academic-integrity'
		);
	});
	it('ignores unknown, empty and hostile values', () => {
		expect(findCampaign('nope')).toBeNull();
		expect(findCampaign('')).toBeNull();
		expect(findCampaign(null)).toBeNull();
		expect(findCampaign(undefined)).toBeNull();
		expect(findCampaign("keep-our-campus-clean' or 1=1")).toBeNull();
	});
	it('has unique slugs and three actions each', () => {
		expect(new Set(CAMPAIGNS.map((c) => c.slug)).size).toBe(CAMPAIGNS.length);
		for (const c of CAMPAIGNS) expect(c.actions).toHaveLength(3);
	});
});

describe('shapeProgress', () => {
	it('fills zeros for every slug and marks missing tags', () => {
		const p = shapeProgress(['a', 'b'], ['a'], [], []);
		expect(p.a).toEqual(emptyProgress(true));
		expect(p.b).toEqual(emptyProgress(false));
	});
	it('sums kinds, resolved and articles, and ignores slugs not requested', () => {
		const p = shapeProgress(
			['a'],
			['a', 'z'],
			[
				{ slug: 'a', kind: 'concern', n: 5, resolved: 2 },
				{ slug: 'a', kind: 'recommendation', n: 3, resolved: 1 },
				{ slug: 'z', kind: 'concern', n: 9, resolved: 9 }
			],
			[
				{ slug: 'a', n: 4 },
				{ slug: 'z', n: 1 }
			]
		);
		expect(p).toEqual({
			a: { tagExists: true, articles: 4, concerns: 5, recommendations: 3, resolved: 3, total: 8 }
		});
	});
	it('coerces numeric strings from the driver', () => {
		const p = shapeProgress(
			['a'],
			['a'],
			[{ slug: 'a', kind: 'concern', n: '2' as unknown as number, resolved: '1' as never }],
			[]
		);
		expect(p.a.total).toBe(2);
		expect(p.a.resolved).toBe(1);
	});
});

describe('progress text', () => {
	it('lists only non-zero parts', () => {
		expect(
			progressLine({
				tagExists: true,
				articles: 12,
				concerns: 5,
				recommendations: 0,
				resolved: 3,
				total: 5
			})
		).toBe('12 articles · 5 concerns · 3 resolved');
		expect(progressLine(emptyProgress(true))).toBe('');
	});
	it('captions the resolved bar in words', () => {
		expect(resolvedCaption({ ...emptyProgress(true), resolved: 3, total: 8 })).toBe(
			'3 of 8 resolved'
		);
		expect(resolvedCaption(emptyProgress(true))).toBe('No concerns or recommendations yet');
	});
});

describe('valueChip', () => {
	const values = [
		{ name: 'Service', focus: true },
		{ name: 'Integrity', focus: false }
	];
	it('matches case-insensitively and keeps the focus flag', () => {
		expect(valueChip('service', values)).toEqual({ name: 'Service', focus: true });
		expect(valueChip('INTEGRITY', values)).toEqual({ name: 'Integrity', focus: false });
	});
	it('omits values that are not in the parsed list', () => {
		expect(valueChip('Faith', values)).toBeNull();
		expect(valueChip('Service', [])).toBeNull();
	});
});
