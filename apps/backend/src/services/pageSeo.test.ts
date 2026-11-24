import { describe, expect, test } from 'bun:test';
import { DEFAULT_PAGE_SEO, mergePageSeo } from './pageSeo';

describe('mergePageSeo', () => {
	test('uses the built-in text when nothing is saved or the value is not an object', () => {
		for (const stored of [null, undefined, 'junk', 5]) {
			expect(mergePageSeo(stored)).toEqual(DEFAULT_PAGE_SEO);
		}
	});

	test('applies saved text over the defaults, trimmed and length-limited', () => {
		const merged = mergePageSeo({
			'/about': { name: '  Me  ', description: 'x'.repeat(500) },
			'/not a page': { name: 'Nope', description: 'Nope' }
		});
		expect(merged['/about'].name).toBe('Me');
		expect(merged['/about'].description).toHaveLength(300);
		expect(merged['/contact']).toEqual(DEFAULT_PAGE_SEO['/contact']);
		expect(merged['/not a page']).toBeUndefined();
	});

	test('keeps text saved for a new page route, falling back to the home description', () => {
		const merged = mergePageSeo({
			'/uses': { name: 'Uses', description: 'My setup' },
			'/projects/archive': { name: 'Archive', description: '' }
		});
		expect(merged['/uses']).toEqual({ name: 'Uses', description: 'My setup' });
		expect(merged['/projects/archive']).toEqual({
			name: 'Archive',
			description: DEFAULT_PAGE_SEO['/'].description
		});
	});

	test('ignores extra pages with an unsafe path or no name', () => {
		const merged = mergePageSeo({
			'../etc/passwd': { name: 'Nope' },
			uses: { name: 'No slash' },
			'/has space': { name: 'Space' },
			'//double': { name: 'Double' },
			'/<script>': { name: 'Tag' },
			'/nameless': { description: 'No name' },
			'/ok': 'not an object'
		});
		expect(Object.keys(merged).sort()).toEqual(Object.keys(DEFAULT_PAGE_SEO).sort());
	});

	test('caps how many extra pages are kept', () => {
		const many = Object.fromEntries(
			Array.from({ length: 80 }, (_, i) => [`/page-${i}`, { name: `Page ${i}` }])
		);
		const extras = Object.keys(mergePageSeo(many)).filter((path) => !(path in DEFAULT_PAGE_SEO));
		expect(extras).toHaveLength(50);
	});

	test('falls back per field when a saved field is empty or not a string', () => {
		const merged = mergePageSeo({ '/blog': { name: '', description: 42 } });
		expect(merged['/blog']).toEqual(DEFAULT_PAGE_SEO['/blog']);
	});
});
