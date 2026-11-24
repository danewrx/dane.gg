import { apiFetchUrl } from '$lib/server/apiFetchUrl';
import { buildRssFeed, type RssBlogPost } from '$lib/site/feed/rss';
import { getStaticRouteSeo, type PageSeoMap } from '$lib/site/seo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, url }) => {
	const origin = url.origin;
	const feedUrl = `${origin}/blog/rss.xml`;

	let response: Response;
	try {
		response = await fetch(apiFetchUrl('/api/blog'));
	} catch {
		return new Response('Feed unavailable', { status: 503 });
	}

	if (!response.ok) {
		return new Response('Feed unavailable', { status: 502 });
	}

	let body: { success?: boolean; data?: RssBlogPost[] };
	try {
		body = (await response.json()) as { success?: boolean; data?: RssBlogPost[] };
	} catch {
		return new Response('Feed unavailable', { status: 502 });
	}

	if (!body.success || !body.data) {
		return new Response('Feed unavailable', { status: 502 });
	}

	let pageSeo: PageSeoMap | null = null;
	try {
		const seoResponse = await fetch(apiFetchUrl('/api/config/page-seo'));
		pageSeo = seoResponse.ok
			? (((await seoResponse.json()) as { data?: PageSeoMap }).data ?? null)
			: null;
	} catch {
	}
	const blogSeo = getStaticRouteSeo('/blog', pageSeo);
	const xml = await buildRssFeed(body.data, {
		origin,
		feedUrl,
		channelTitle: blogSeo?.title ?? 'Blog - dane.gg',
		channelDescription:
			blogSeo?.description ??
			'Read my latest blog posts about software, design, and other random stuff I feel like writing about.'
	});

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
		}
	});
};
