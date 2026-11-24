import { describe, expect, it } from 'vitest';
import { blogPostSeo, imageMimeType, twitterHandle } from './seo';

const post = {
	slug: 'hello',
	content: '# Hello\n\nThis is **my** first post.',
	updatedAt: '2024-02-01T08:30:00.000Z'
};

describe('blogPostSeo', () => {
	it('generates the description and card when there are no overrides', () => {
		const seo = blogPostSeo(post);
		expect(seo.description).toBe('Hello This is my first post.');
		expect(seo.imagePath).toBe(`/api/blog/hello/og.png?v=${Date.parse(post.updatedAt)}`);
		expect(seo.imageIsGenerated).toBe(true);
	});

	it('treats blank overrides as unset', () => {
		const seo = blogPostSeo({ ...post, seoDescription: '   ', ogImage: '' });
		expect(seo.description).toBe('Hello This is my first post.');
		expect(seo.imageIsGenerated).toBe(true);
	});

	it('uses the description override', () => {
		expect(blogPostSeo({ ...post, seoDescription: ' Custom text ' }).description).toBe(
			'Custom text'
		);
	});

	it('uses an uploaded image through the API', () => {
		const seo = blogPostSeo({ ...post, ogImage: '/uploads/social-1.png' });
		expect(seo.imagePath).toBe('/api/upload/file/social-1.png');
		expect(seo.imageIsGenerated).toBe(false);
	});

	it('uses an external image URL as is', () => {
		const seo = blogPostSeo({ ...post, ogImage: 'https://example.com/a.png' });
		expect(seo.imagePath).toBe('https://example.com/a.png');
		expect(seo.imageIsGenerated).toBe(false);
	});
});

describe('twitterHandle', () => {
	it('adds the @ and accepts it already being there', () => {
		expect(twitterHandle('danewrx')).toBe('@danewrx');
		expect(twitterHandle('@danewrx')).toBe('@danewrx');
		expect(twitterHandle('  @Dane_1  ')).toBe('@Dane_1');
	});

	it('rejects anything that is not a valid handle', () => {
		for (const raw of [
			null,
			undefined,
			42,
			'',
			'@',
			'has space',
			'a-b',
			'x'.repeat(16),
			'<script>'
		]) {
			expect(twitterHandle(raw)).toBeNull();
		}
	});
});

describe('imageMimeType', () => {
	it('maps known extensions, ignoring case and the query string', () => {
		expect(imageMimeType('/api/blog/hello/og.png?v=123')).toBe('image/png');
		expect(imageMimeType('https://example.com/a/photo.JPG')).toBe('image/jpeg');
		expect(imageMimeType('/api/upload/file/x.jpeg#top')).toBe('image/jpeg');
		expect(imageMimeType('/x.webp')).toBe('image/webp');
		expect(imageMimeType('/x.gif')).toBe('image/gif');
	});

	it('returns null when the type is not known', () => {
		for (const src of ['/api/image', 'https://example.com/photo', '/file.svg', '']) {
			expect(imageMimeType(src)).toBeNull();
		}
	});
});
