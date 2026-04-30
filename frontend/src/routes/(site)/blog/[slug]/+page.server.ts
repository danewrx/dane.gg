import { apiFetchUrl } from '$lib/server/apiFetchUrl';
import { logger } from '$lib/logger';
import type { PageServerLoad } from './$types';

type BlogPostSeo = {
	id: string;
	title: string;
	slug: string;
	content: string;
	thumbnail: string | null;
	publishedAt: string;
	createdAt: string;
	updatedAt: string;
	tags: { id: string; name: string }[];
};

type BlogNavPost = { id: string; title: string; slug: string };

type BlogNavigation = {
	previous: BlogNavPost | null;
	next: BlogNavPost | null;
};

export const load: PageServerLoad = async ({ params, fetch }) => {
	const slug = params.slug?.trim();
	if (!slug) {
		return { post: null, navigation: null, loadError: 'not_found' as const };
	}

	const enc = encodeURIComponent(slug);
	const postUrl = apiFetchUrl(`/api/blog/${enc}`);
	const navUrl = apiFetchUrl(`/api/blog/${enc}/navigation`);

	let postRes: Response;
	let navRes: Response;
	try {
		[postRes, navRes] = await Promise.all([fetch(postUrl), fetch(navUrl)]);
	} catch (e) {
		logger.error('Blog SSR fetch failed:', e);
		return { post: null, navigation: null, loadError: 'server' as const };
	}

	let navigation: BlogNavigation | null = null;
	if (navRes.ok) {
		try {
			const navJson = (await navRes.json()) as {
				success?: boolean;
				data?: BlogNavigation;
			};
			if (navJson.success && navJson.data) {
				navigation = navJson.data;
			}
		} catch {
			/* navigation is optional */
		}
	}

	if (!postRes.ok) {
		if (postRes.status === 404) {
			return { post: null, navigation: null, loadError: 'not_found' as const };
		}
		return { post: null, navigation, loadError: 'server' as const };
	}

	let body: { success?: boolean; data?: BlogPostSeo };
	try {
		body = (await postRes.json()) as { success?: boolean; data?: BlogPostSeo };
	} catch {
		return { post: null, navigation, loadError: 'server' as const };
	}

	if (!body.success || !body.data) {
		return { post: null, navigation, loadError: 'server' as const };
	}

	return {
		post: body.data,
		navigation,
		loadError: null
	};
};
