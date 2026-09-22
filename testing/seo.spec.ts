import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers';

test.describe('SEO basics', () => {
	test('homepage has a title', async ({ page }) => {
		await gotoReady(page, '/');
		const title = await page.title();
		expect(title.length).toBeGreaterThan(0);
	});

	test('pages have canonical link', async ({ page }) => {
		for (const path of ['/', '/about', '/blog', '/contact']) {
			await gotoReady(page, path);
			const canonical = page.locator('link[rel="canonical"]');
			await expect(canonical).toHaveCount(1);
		}
	});

	test('blog page advertises RSS feed', async ({ page }) => {
		await gotoReady(page, '/blog');
		const feedLink = page.locator('link[rel="alternate"][type="application/rss+xml"]');
		await expect(feedLink).toHaveCount(1);
		await expect(feedLink).toHaveAttribute('href', '/blog/rss.xml');
	});

	test('blog RSS feed returns valid XML', async ({ request }) => {
		const response = await request.get('/blog/rss.xml');
		expect(response.ok()).toBeTruthy();
		expect(response.headers()['content-type']).toContain('application/xml');
		const body = await response.text();
		expect(body).toContain('<rss version="2.0"');
		expect(body).toContain('<channel>');
	});

	test('sitemap returns valid XML with blog urls', async ({ request }) => {
		const response = await request.get('/sitemap.xml');
		expect(response.ok()).toBeTruthy();
		expect(response.headers()['content-type']).toContain('application/xml');
		const body = await response.text();
		expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(body).toContain('<loc>http://localhost:5173/blog</loc>');
	});

	test('robots.txt references sitemap', async ({ request }) => {
		const response = await request.get('/robots.txt');
		expect(response.ok()).toBeTruthy();
		const body = await response.text();
		expect(body).toContain('Sitemap: http://localhost:5173/sitemap.xml');
	});

	test('feed.xml redirects to blog rss', async ({ request }) => {
		const response = await request.get('/feed.xml', { maxRedirects: 0 });
		expect(response.status()).toBe(301);
		expect(response.headers()['location']).toBe('/blog/rss.xml');
	});

	test('blog index is server-rendered without loading spinner', async ({ page }) => {
		await gotoReady(page, '/blog');
		await expect(page.locator('.blog-page .loading')).toHaveCount(0);
		await expect(page.locator('.blog-page .posts-masonry, .blog-page .empty-state')).toBeVisible();
	});
});
