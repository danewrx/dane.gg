import { describe, expect, test } from 'bun:test';
import { parseLinkType, validateCreateSocialLinkBody } from './socialLinkPayload';

describe('parseLinkType', () => {
	test('defaults to link when absent', () => {
		expect(parseLinkType(undefined)).toBe('link');
		expect(parseLinkType(null)).toBe('link');
		expect(parseLinkType('')).toBe('link');
	});

	test('accepts the two valid types', () => {
		expect(parseLinkType('link')).toBe('link');
		expect(parseLinkType('copy')).toBe('copy');
	});

	test('rejects anything else', () => {
		expect(parseLinkType('paste')).toEqual({ error: expect.stringContaining('link or copy') });
		expect(parseLinkType(42)).toEqual({ error: expect.stringContaining('link or copy') });
		expect(parseLinkType({})).toEqual({ error: expect.stringContaining('link or copy') });
	});
});

describe('validateCreateSocialLinkBody with linkType', () => {
	const base = {
		name: 'Discord',
		iconType: 'coreui-brand',
		iconName: 'discord'
	};

	test('creates a copy-type link with plain text instead of a URL', () => {
		const result = validateCreateSocialLinkBody({
			...base,
			url: 'danewrx',
			linkType: 'copy'
		});
		expect(result).toMatchObject({ url: 'danewrx', linkType: 'copy' });
	});

	test('defaults to link type when linkType is omitted', () => {
		const result = validateCreateSocialLinkBody({ ...base, url: 'https://example.com' });
		expect(result).toMatchObject({ linkType: 'link' });
	});

	test('missing text for a copy link uses the copy wording', () => {
		const result = validateCreateSocialLinkBody({ ...base, url: '', linkType: 'copy' });
		expect(result).toEqual({ error: 'Name and text to copy are required' });
	});

	test('missing url for a normal link keeps the original wording', () => {
		const result = validateCreateSocialLinkBody({ ...base, url: '' });
		expect(result).toEqual({ error: 'Name and URL are required' });
	});

	test('invalid linkType is rejected before other checks', () => {
		const result = validateCreateSocialLinkBody({ ...base, url: 'x', linkType: 'nonsense' });
		expect(result).toEqual({ error: expect.stringContaining('link or copy') });
	});
});
