import { test, expect } from '@playwright/test';
import { gotoReady } from './helpers';

/** Every JSON-LD block in a page's HTML, parsed and flattened. */
function jsonLdBlocks(html: string): Array<Record<string, unknown>> {
	const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
	return blocks.flatMap((match) => [JSON.parse(match[1])].flat());
}

test.describe('structured data', () => {
	test('home page describes the website and the person', async ({ request }) => {
		await expect
			.poll(
				async () =>
					jsonLdBlocks(await (await request.get('/')).text())
						.map((b) => b['@type'])
						.sort(),
				{ timeout: 30_000 }
			)
			.toEqual(['Person', 'WebSite']);
	});

	test('static pages have a Home > page breadcrumb', async ({ request }) => {
		const blocks = jsonLdBlocks(await (await request.get('/about')).text());
		const crumbs = blocks.find((b) => b['@type'] === 'BreadcrumbList') as {
			itemListElement: Array<{ position: number; item: string }>;
		};
		expect(crumbs.itemListElement.map((c) => c.position)).toEqual([1, 2]);
		expect(crumbs.itemListElement[1].item).toMatch(/\/about$/);
	});

	test('a blog post has BlogPosting data and a breadcrumb', async ({ request }) => {
		const list = await (await request.get('/api/blog?list=1')).json();
		const slug = list.data?.[0]?.slug;
		test.skip(!slug, 'no published blog posts to check');

		const blocks = jsonLdBlocks(await (await request.get(`/blog/${slug}`)).text());
		const posting = blocks.find((b) => b['@type'] === 'BlogPosting');
		expect(posting).toMatchObject({ url: expect.stringContaining(`/blog/${slug}`) });
		expect(posting?.headline).toBeTruthy();
		expect(Number.isNaN(Date.parse(String(posting?.datePublished)))).toBe(false);
		expect(blocks.some((b) => b['@type'] === 'BreadcrumbList')).toBe(true);
	});
});

test.describe('blog post previews', () => {
	test('use the generated card and a description from the post by default', async ({ request }) => {
		const list = await (await request.get('/api/blog?list=1')).json();
		const slug = list.data?.[0]?.slug;
		test.skip(!slug, 'no published blog posts to check');

		const html = await (await request.get(`/blog/${slug}`)).text();
		expect(html).toMatch(
			new RegExp(`property="og:image" content="http://localhost:5173/api/blog/${slug}/og.png\\?v=\\d+"`)
		);
		expect(html).toContain('property="og:image:width" content="1200"');
		const description = html.match(/property="og:description" content="([^"]*)"/)?.[1] ?? '';
		expect(description.length).toBeGreaterThan(0);
	});
});

test.describe('project category pages', () => {
	test('have their own social card and a description that names their projects', async ({
		request
	}) => {
		const categories = (await (await request.get('/api/projects/categories')).json()).data;
		test.skip(!categories?.length, 'no project categories to check');
		const { id, name } = categories[0];

		const html = await (await request.get(`/projects/${id}`)).text();
		expect(html).toContain(
			`property="og:image" content="http://localhost:5173/api/projects/category/${id}/og.png"`
		);
		const description = html.match(/property="og:description" content="([^"]*)"/)?.[1] ?? '';
		expect(description).toContain(name.replace(/&/g, '&amp;'));
		expect(description).not.toMatch(/^Explore /);

		const card = await request.get(`/api/projects/category/${id}/og.png`);
		expect(card.status()).toBe(200);
		expect(card.headers()['content-type']).toBe('image/png');
	});

	test('unknown or invalid category ids fall back to the home card', async ({ request }) => {
		for (const id of ['00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
			const response = await request.get(`/api/projects/category/${id}/og.png`, {
				maxRedirects: 0
			});
			expect(response.status()).toBe(302);
			expect(response.headers()['location']).toContain('/api/blog/og-default.png');
		}
	});
});

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

	test('sitemap lists every page the backend knows about', async ({ request }) => {
		const pageSeo = (await (await request.get('/api/config/page-seo')).json()).data;
		const body = await (await request.get('/sitemap.xml')).text();
		for (const path of Object.keys(pageSeo)) {
			const loc = path === '/' ? 'http://localhost:5173/' : `http://localhost:5173${path}`;
			expect(body).toContain(`<loc>${loc}</loc>`);
		}
	});

	test('sitemap lists project category pages', async ({ request }) => {
		const categories = (await (await request.get('/api/projects/categories')).json()).data;
		test.skip(!categories?.length, 'no project categories to check');
		const body = await (await request.get('/sitemap.xml')).text();
		for (const category of categories) {
			expect(body).toContain(`<loc>http://localhost:5173/projects/${category.id}</loc>`);
		}
	});

	test('robots.txt references sitemap', async ({ request }) => {
		const response = await request.get('/robots.txt');
		expect(response.ok()).toBeTruthy();
		const body = await response.text();
		expect(body).toContain('Sitemap: http://localhost:5173/sitemap.xml');
	});

	test('robots.txt keeps the admin and login pages out of crawlers', async ({ request }) => {
		const body = await (await request.get('/robots.txt')).text();
		for (const path of ['/admin', '/login', '/logout']) {
			expect(body).toContain(`Disallow: ${path}`);
		}
	});

	test('login and admin responses are marked noindex', async ({ request }) => {
		const login = await request.get('/login');
		expect(login.headers()['x-robots-tag']).toBe('noindex, nofollow');
		// An unauthenticated admin request lands on the login page, which is noindex too.
		const admin = await request.get('/admin');
		expect(admin.headers()['x-robots-tag']).toBe('noindex, nofollow');
	});

	test('public pages are not marked noindex', async ({ request }) => {
		for (const path of ['/', '/about', '/blog']) {
			const response = await request.get(path);
			expect(response.headers()['x-robots-tag']).toBeUndefined();
		}
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
