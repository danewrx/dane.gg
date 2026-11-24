import { apiFetchUrl } from '$lib/server/apiFetchUrl';
import {
	buildBlogPostSitemapUrls,
	buildProjectCategorySitemapUrls,
	buildSitemap,
	buildStaticSitemapUrls,
	sitemapPaths,
	type SitemapBlogPost,
	type SitemapProjectCategory
} from '$lib/site/feed/sitemap';
import { STATIC_ROUTE_PATHS } from '$lib/site/routes';
import type { RequestHandler } from './$types';

async function fetchData<T>(fetch: typeof globalThis.fetch, path: string, fallback: T): Promise<T> {
	try {
		const response = await fetch(apiFetchUrl(path));
		if (response.ok) {
			const body = (await response.json()) as { success?: boolean; data?: T };
			if (body.success && body.data) return body.data;
		}
	} catch {}
	return fallback;
}

export const GET: RequestHandler = async ({ fetch, url }) => {
	const origin = url.origin;

	const [blogPosts, categories] = await Promise.all([
		fetchData<SitemapBlogPost[]>(fetch, '/api/blog?list=1', []),
		fetchData<SitemapProjectCategory[]>(fetch, '/api/projects/categories', [])
	]);

	const xml = buildSitemap([
		...buildStaticSitemapUrls(origin, sitemapPaths(STATIC_ROUTE_PATHS)),
		...buildProjectCategorySitemapUrls(origin, categories),
		...buildBlogPostSitemapUrls(origin, blogPosts)
	]);

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
		}
	});
};
