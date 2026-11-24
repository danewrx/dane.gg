import { describe, expect, test } from 'bun:test';
import { buildCategoryDescription } from './categorySeo';

describe('buildCategoryDescription', () => {
	test('falls back to a generic line for a category with no projects', () => {
		expect(buildCategoryDescription('Design', [])).toBe(
			'A collection of Design projects from my portfolio.'
		);
	});

	test('names one, two or three projects', () => {
		expect(buildCategoryDescription('Design', ['Logo'])).toBe('1 Design project: Logo.');
		expect(buildCategoryDescription('Design', ['Logo', 'Poster'])).toBe(
			'2 Design projects: Logo and Poster.'
		);
		expect(buildCategoryDescription('Design', ['A', 'B', 'C'])).toBe(
			'3 Design projects: A, B and C.'
		);
	});

	test('lists the first three and counts the rest', () => {
		expect(buildCategoryDescription('Development', ['A', 'B', 'C', 'D', 'E'])).toBe(
			'5 Development projects: A, B, C and 2 more.'
		);
	});

	test('stays within 160 characters', () => {
		const long = 'x'.repeat(80);
		const text = buildCategoryDescription('Development', [long, long, long]);
		expect(text.length).toBeLessThanOrEqual(160);
		expect(text.endsWith('…')).toBe(true);
	});
});
