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
			'/not-a-page': { name: 'Nope', description: 'Nope' }
		});
		expect(merged['/about'].name).toBe('Me');
		expect(merged['/about'].description).toHaveLength(300);
		expect(merged['/contact']).toEqual(DEFAULT_PAGE_SEO['/contact']);
		expect(merged['/not-a-page']).toBeUndefined();
	});

	test('falls back per field when a saved field is empty or not a string', () => {
		const merged = mergePageSeo({ '/blog': { name: '', description: 42 } });
		expect(merged['/blog']).toEqual(DEFAULT_PAGE_SEO['/blog']);
	});
});
