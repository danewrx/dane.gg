import { marked } from 'marked';
import { apiFetchUrl } from '$lib/server/apiFetchUrl';

export type HomeRecentPost = {
	id: string;
	title: string;
	slug: string;
	publishedAt: string;
};

export const load = async ({ fetch }: { fetch: typeof globalThis.fetch }) => {
	const musicUrl = apiFetchUrl('/api/widgets/nowplaying');
	const tweetUrl = apiFetchUrl('/api/widgets/latest-tweet');
	const aboutUrl = apiFetchUrl('/api/config/homepage_about_me');
	const blogUrl = apiFetchUrl('/api/blog?list=1');

	const [musicResult, tweetResult, aboutResult, blogResult] = await Promise.allSettled([
		fetch(musicUrl),
		fetch(tweetUrl),
		fetch(aboutUrl),
		fetch(blogUrl)
	]);

	let musicData: unknown = null;
	let tweetData: unknown = null;

	if (musicResult.status === 'fulfilled' && musicResult.value.ok) {
		musicData = await musicResult.value.json();
	}

	if (tweetResult.status === 'fulfilled' && tweetResult.value.ok) {
		tweetData = await tweetResult.value.json();
	}

	let aboutMeHtml = '';
	if (aboutResult.status === 'fulfilled' && aboutResult.value.ok) {
		try {
			const aboutJson = (await aboutResult.value.json()) as {
				data?: { value?: string };
			};
			const raw = aboutJson.data?.value;
			if (raw && typeof raw === 'string') {
				aboutMeHtml = await marked.parse(raw);
			}
		} catch {
			aboutMeHtml = '';
		}
	}

	let recentPosts: HomeRecentPost[] = [];
	if (blogResult.status === 'fulfilled' && blogResult.value.ok) {
		try {
			const blogJson = (await blogResult.value.json()) as {
				data?: Array<{ id: string; title: string; slug: string; publishedAt: string }>;
			};
			const posts = blogJson.data ?? [];
			recentPosts = posts.slice(0, 4).map((p) => ({
				id: p.id,
				title: p.title,
				slug: p.slug,
				publishedAt: p.publishedAt
			}));
		} catch {
			recentPosts = [];
		}
	}

	return {
		musicData,
		tweetData,
		aboutMeHtml,
		recentPosts
	};
};
