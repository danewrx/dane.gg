import { apiFetchUrl } from '$lib/server/apiFetchUrl';
import {
	buildBlogPostSitemapUrls,
	buildSitemap,
	buildStaticSitemapUrls
} from '$lib/site/feed/sitemap';
import type { RequestHandler } from './$types';

type BlogListPost = {
	slug: string;
	updatedAt: string;
};

export const GET: RequestHandler = async ({ fetch, url }) => {
	const origin = url.origin;
	const staticUrls = buildStaticSitemapUrls(origin);

	let blogPosts: BlogListPost[] = [];
	try {
		const response = await fetch(apiFetchUrl('/api/blog?list=1'));
		if (response.ok) {
			const body = (await response.json()) as { success?: boolean; data?: BlogListPost[] };
			if (body.success && body.data) {
				blogPosts = body.data;
			}
		}
	} catch {}

	const xml = buildSitemap([...staticUrls, ...buildBlogPostSitemapUrls(origin, blogPosts)]);

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
		}
	});
};
