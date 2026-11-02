import { describe, expect, it } from 'vitest';
import { parseUniversityStatement } from './university.ts';

const MD = `## Vision

> A premier national university that develops leaders in the global knowledge economy.

## Mission

A university committed to producing leaders.

## Core values

- **Patriotism**: Responsibility toward the university community.
- **Service**: Collaboration and assistance among campus members.
- **Faith**: Compassion, respect, and responsibility.

## Why it matters here

Text.`;

describe('parseUniversityStatement', () => {
	it('extracts vision, mission and values', () => {
		const s = parseUniversityStatement(MD);
		expect(s.vision).toBe(
			'A premier national university that develops leaders in the global knowledge economy.'
		);
		expect(s.mission).toBe('A university committed to producing leaders.');
		expect(s.values.map((v) => v.name)).toEqual(['Patriotism', 'Service', 'Faith']);
		expect(s.values.find((v) => v.focus)?.name).toBe('Service');
	});

	it('returns empty parts when sections are missing', () => {
		expect(parseUniversityStatement('Just text')).toEqual({
			vision: null,
			mission: null,
			values: []
		});
	});
});

import { otherSections } from './university.ts';
describe('otherSections', () => {
	it('keeps only sections other than the statement', () => {
		expect(otherSections(MD)).toBe('## Why it matters here\n\nText.');
	});
});
