import { describe, expect, it } from 'vitest';
import {
	buildBlogPostSitemapUrls,
	buildSitemap,
	buildStaticSitemapUrls
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
		const staticUrls = buildStaticSitemapUrls('https://dane.gg');
		expect(staticUrls.some((u) => u.loc === 'https://dane.gg/')).toBe(true);
		expect(staticUrls.some((u) => u.loc === 'https://dane.gg/blog')).toBe(true);

		const posts = buildBlogPostSitemapUrls('https://dane.gg', [
			{ slug: 'hello-world', updatedAt: '2024-06-01T12:00:00.000Z' }
		]);
		expect(posts[0].loc).toBe('https://dane.gg/blog/hello-world');
		expect(posts[0].lastmod).toBe('2024-06-01');
	});
});
