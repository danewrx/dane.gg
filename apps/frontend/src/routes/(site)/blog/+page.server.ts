import { apiFetchUrl } from '$lib/server/apiFetchUrl';
import { logger } from '$lib/logger';
import type { PageServerLoad } from './$types';

export type BlogListPost = {
	id: string;
	title: string;
	slug: string;
	content: string;
	thumbnail: string | null;
	publishedAt: string;
	tags: { id: string; name: string }[];
};

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const response = await fetch(apiFetchUrl('/api/blog'));
		if (!response.ok) {
			return { posts: [] as BlogListPost[], loadError: 'server' as const };
		}

		const body = (await response.json()) as { success?: boolean; data?: BlogListPost[] };
		if (!body.success || !body.data) {
			return { posts: [] as BlogListPost[], loadError: 'server' as const };
		}

		return { posts: body.data, loadError: null };
	} catch (error) {
		logger.error('Blog index SSR fetch failed:', error);
		return { posts: [] as BlogListPost[], loadError: 'server' as const };
	}
};
