import { marked } from 'marked';
import { apiFetchUrl } from '$lib/server/apiFetchUrl';

export type HomeRecentPost = {
	id: string;
	title: string;
	slug: string;
	publishedAt: string;
};

type BlogListItem = { id: string; title: string; slug: string; publishedAt: string };

async function jsonOf<T>(result: PromiseSettledResult<Response>): Promise<T | null> {
	if (result.status !== 'fulfilled' || !result.value.ok) return null;
	try {
		return (await result.value.json()) as T;
	} catch {
		return null;
	}
}

async function renderAbout(raw: unknown): Promise<string> {
	if (!raw || typeof raw !== 'string') return '';
	try {
		return await marked.parse(raw);
	} catch {
		return '';
	}
}

export const load = async ({ fetch }: { fetch: typeof globalThis.fetch }) => {
	const [musicResult, tweetResult, aboutResult, blogResult, socialResult] =
		await Promise.allSettled([
			fetch(apiFetchUrl('/api/widgets/nowplaying')),
			fetch(apiFetchUrl('/api/widgets/latest-tweet')),
			fetch(apiFetchUrl('/api/config/homepage_about_me')),
			fetch(apiFetchUrl('/api/blog?list=1')),
			fetch(apiFetchUrl('/api/social-links'))
		]);

	const [musicData, tweetData, about, blog, social] = await Promise.all([
		jsonOf<unknown>(musicResult),
		jsonOf<unknown>(tweetResult),
		jsonOf<{ data?: { value?: string } }>(aboutResult),
		jsonOf<{ data?: BlogListItem[] }>(blogResult),
		jsonOf<{ data?: Array<{ url: string; linkType: string }> }>(socialResult)
	]);

	const recentPosts: HomeRecentPost[] = (blog?.data ?? []).slice(0, 4).map((post) => ({
		id: post.id,
		title: post.title,
		slug: post.slug,
		publishedAt: post.publishedAt
	}));


	const socialUrls = (social?.data ?? [])
		.filter((link) => link.linkType === 'link')
		.map((link) => link.url);

	return {
		musicData,
		socialUrls,
		tweetData,
		aboutMeHtml: await renderAbout(about?.data?.value),
		recentPosts
	};
};
