import { describe, expect, it } from 'vitest';
import { buildRssFeed, type RssBlogPost } from './rss';
import { resolvePublicAssetUrl, absolutizeRelativeUrlsInHtml } from './resolvePublicUrl';
import { escapeXml } from './xml';

const samplePost: RssBlogPost = {
	id: 'post-1',
	title: 'Hello & Welcome',
	slug: 'hello-world',
	content: '# Hello\n\nRead [more](/about).',
	thumbnail: '/uploads/cover.png',
	publishedAt: '2024-06-01T12:00:00.000Z',
	updatedAt: '2024-06-02T12:00:00.000Z',
	tags: [{ id: 't1', name: 'Svelte' }]
};

describe('escapeXml', () => {
	it('escapes special characters', () => {
		expect(escapeXml('Tom & Jerry <3>')).toBe('Tom &amp; Jerry &lt;3&gt;');
	});
});

describe('resolvePublicAssetUrl', () => {
	it('absolutizes upload paths through the API route', () => {
		expect(resolvePublicAssetUrl('/uploads/cover.png', 'https://dane.gg')).toBe(
			'https://dane.gg/api/upload/file/cover.png'
		);
	});

	it('passes through absolute URLs', () => {
		expect(resolvePublicAssetUrl('https://example.com/a.png', 'https://dane.gg')).toBe(
			'https://example.com/a.png'
		);
	});
});

describe('absolutizeRelativeUrlsInHtml', () => {
	it('rewrites relative src and href attributes', () => {
		const html = '<a href="/about">x</a><img src="/uploads/pic.png" />';
		const out = absolutizeRelativeUrlsInHtml(html, 'https://dane.gg');
		expect(out).toContain('href="https://dane.gg/about"');
		expect(out).toContain('src="https://dane.gg/api/upload/file/pic.png"');
	});
});

describe('buildRssFeed', () => {
	it('builds valid RSS with escaped titles and full content', async () => {
		const xml = await buildRssFeed([samplePost], {
			origin: 'https://dane.gg',
			feedUrl: 'https://dane.gg/blog/rss.xml',
			channelTitle: 'Blog - dane.gg',
			channelDescription: 'Test feed'
		});

		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<rss version="2.0"');
		expect(xml).toContain('<title>Hello &amp; Welcome</title>');
		expect(xml).toContain('<link>https://dane.gg/blog/hello-world</link>');
		expect(xml).toContain('<guid isPermaLink="true">https://dane.gg/blog/hello-world</guid>');
		expect(xml).toContain('<category>Svelte</category>');
		expect(xml).toContain('<content:encoded><![CDATA[');
		expect(xml).toContain('<h1>Hello</h1>');
		expect(xml).toContain('href="https://dane.gg/about"');
		expect(xml).toContain(
			'<media:content url="https://dane.gg/api/upload/file/cover.png" medium="image" />'
		);
		expect(xml).toContain(
			'<atom:link href="https://dane.gg/blog/rss.xml" rel="self" type="application/rss+xml" />'
		);
	});
});
