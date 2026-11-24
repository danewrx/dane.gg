import { describe, expect, it } from 'vitest';
import {
	buildBlogPostSitemapUrls,
	buildProjectCategorySitemapUrls,
	buildSitemap,
	buildStaticSitemapUrls,
	sitemapPaths
} from './sitemap';

describe('buildSitemap', () => {
	it('renders urlset with escaped locations', () => {
		const xml = buildSitemap([
			{ loc: 'https://dane.gg/blog', changefreq: 'daily', priority: 0.8 },
			{
				loc: 'https://dane.gg/blog/hello&world',
				lastmod: '2024-06-01',
				changefreq: 'weekly',
				priority: 0.6
			}
		]);

		expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(xml).toContain('<loc>https://dane.gg/blog</loc>');
		expect(xml).toContain('<loc>https://dane.gg/blog/hello&amp;world</loc>');
		expect(xml).toContain('<lastmod>2024-06-01</lastmod>');
	});

	it('builds static and blog post url lists', () => {
		const staticUrls = buildStaticSitemapUrls('https://dane.gg', ['/', '/about', '/blog']);
		expect(staticUrls.some((u) => u.loc === 'https://dane.gg/')).toBe(true);
		expect(staticUrls.some((u) => u.loc === 'https://dane.gg/blog')).toBe(true);

		const posts = buildBlogPostSitemapUrls('https://dane.gg', [
			{ slug: 'hello-world', updatedAt: '2024-06-01T12:00:00.000Z' }
		]);
		expect(posts[0].loc).toBe('https://dane.gg/blog/hello-world');
		expect(posts[0].lastmod).toBe('2024-06-01');
	});
});

describe('sitemapPaths', () => {
	it('uses every page the backend knows about, in order', () => {
		expect(sitemapPaths({ '/': {}, '/about': {}, '/uses': {} })).toEqual(['/', '/about', '/uses']);
	});

	it('falls back to the home page when the page data is missing or empty', () => {
		for (const pageSeo of [null, undefined, {}]) {
			expect(sitemapPaths(pageSeo)).toEqual(['/']);
		}
	});
});

describe('buildStaticSitemapUrls', () => {
	it('gives the home page top priority and the blog a daily changefreq', () => {
		const urls = buildStaticSitemapUrls('https://dane.gg', ['/', '/about', '/blog']);
		expect(urls.map((u) => [u.loc, u.priority, u.changefreq])).toEqual([
			['https://dane.gg/', 1, 'monthly'],
			['https://dane.gg/about', 0.8, 'monthly'],
			['https://dane.gg/blog', 0.8, 'daily']
		]);
	});
});

describe('buildProjectCategorySitemapUrls', () => {
	it('lists each category page with an encoded id and no lastmod', () => {
		const urls = buildProjectCategorySitemapUrls('https://dane.gg', [
			{ id: 'abc-123' },
			{ id: 'a b' }
		]);
		expect(urls.map((u) => u.loc)).toEqual([
			'https://dane.gg/projects/abc-123',
			'https://dane.gg/projects/a%20b'
		]);
		expect(urls.every((u) => u.lastmod === undefined)).toBe(true);
	});

	it('returns nothing for no categories', () => {
		expect(buildProjectCategorySitemapUrls('https://dane.gg', [])).toEqual([]);
	});
});
