import { describe, expect, test } from 'bun:test';
import { isHttpUrl, isValidButtonImage, validateButtonFields } from './buttons';

describe('isHttpUrl', () => {
	test('accepts http and https URLs only', () => {
		expect(isHttpUrl('https://example.com/')).toBe(true);
		expect(isHttpUrl('http://example.com/a?b=1')).toBe(true);
		expect(isHttpUrl('javascript:alert(1)')).toBe(false);
		expect(isHttpUrl('ftp://example.com/')).toBe(false);
		expect(isHttpUrl('/relative/path')).toBe(false);
		expect(isHttpUrl('not a url')).toBe(false);
	});
});

describe('isValidButtonImage', () => {
	test('accepts remote URLs and site-local assets/uploads', () => {
		expect(isValidButtonImage('https://example.com/b.gif')).toBe(true);
		expect(isValidButtonImage('/assets/img/buttons/corp.gif')).toBe(true);
		expect(isValidButtonImage('/uploads/button-abc.gif')).toBe(true);
	});

	test('rejects path traversal and other local paths', () => {
		expect(isValidButtonImage('/uploads/../../etc/passwd')).toBe(false);
		expect(isValidButtonImage('/etc/passwd')).toBe(false);
		expect(isValidButtonImage('javascript:alert(1)')).toBe(false);
	});
});

describe('validateButtonFields', () => {
	test('returns null for valid or absent fields', () => {
		expect(validateButtonFields({})).toBeNull();
		expect(
			validateButtonFields({
				title: 'Luniiya',
				linkUrl: 'https://luniiya.me/',
				imageUrl: 'https://luniiya.me/button.gif'
			})
		).toBeNull();
	});

	test('rejects an over-long title, a non-http link and a bad image', () => {
		expect(validateButtonFields({ title: 'x'.repeat(101) })).toContain('Title');
		expect(validateButtonFields({ linkUrl: 'javascript:alert(1)' })).toContain('Link');
		expect(validateButtonFields({ linkUrl: `https://a.com/${'x'.repeat(500)}` })).toContain('Link');
		expect(validateButtonFields({ imageUrl: '/uploads/../x.gif' })).toContain('Image');
	});
});
