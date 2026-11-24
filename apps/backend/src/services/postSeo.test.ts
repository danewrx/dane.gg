import { describe, expect, test } from 'bun:test';
import { parsePostSeoFields } from './postSeo';

describe('parsePostSeoFields', () => {
	test('leaves fields that are not sent unchanged', () => {
		expect(parsePostSeoFields({})).toEqual({ fields: {} });
	});

	test('trims text and clears empty values', () => {
		expect(parsePostSeoFields({ seoDescription: '  Hello  ', ogImage: '  ' })).toEqual({
			fields: { seoDescription: 'Hello', ogImage: null }
		});
		expect(parsePostSeoFields({ seoDescription: null, ogImage: null })).toEqual({
			fields: { seoDescription: null, ogImage: null }
		});
	});

	test('accepts uploaded files and http(s) URLs for the image', () => {
		for (const ogImage of [
			'/uploads/cover-123.png',
			'https://example.com/a.png',
			'http://x.test/b'
		]) {
			expect(parsePostSeoFields({ ogImage })).toEqual({ fields: { ogImage } });
		}
	});

	test('rejects other image values', () => {
		for (const ogImage of [
			'javascript:alert(1)',
			'ftp://example.com/a.png',
			'/etc/passwd',
			'/uploads/../secret',
			'/uploads/a/b.png',
			'cover.png',
			42,
			{}
		]) {
			expect('error' in parsePostSeoFields({ ogImage })).toBe(true);
		}
		expect('error' in parsePostSeoFields({ ogImage: 'https://x.test/' + 'a'.repeat(500) })).toBe(
			true
		);
	});

	test('rejects a description that is not text or is too long', () => {
		expect('error' in parsePostSeoFields({ seoDescription: 5 })).toBe(true);
		expect('error' in parsePostSeoFields({ seoDescription: 'x'.repeat(301) })).toBe(true);
		expect('error' in parsePostSeoFields({ seoDescription: 'x'.repeat(300) })).toBe(false);
	});
});
