import { apiFetchUrl } from '$lib/server/apiFetchUrl';
import { logger } from '$lib/logger';
import type { PageServerLoad } from './$types';

type CategoryProjectsPayload = {
	category: {
		id: string;
		name: string;
		displayOrder: number;
		createdAt: string;
	};
	projects: unknown[];
};

export const load: PageServerLoad = async ({ params, fetch }) => {
	const categoryId = params.categoryId?.trim();
	if (!categoryId) {
		return { categoryData: null, loadError: 'not_found' as const };
	}

	const url = apiFetchUrl(`/api/projects/category/${encodeURIComponent(categoryId)}`);

	let res: Response;
	try {
		res = await fetch(url);
	} catch (e) {
		logger.error('Project category SSR fetch failed:', e);
		return { categoryData: null, loadError: 'server' as const };
	}

	if (!res.ok) {
		if (res.status === 404) {
			return { categoryData: null, loadError: 'not_found' as const };
		}
		return { categoryData: null, loadError: 'server' as const };
	}

	let body: { success?: boolean; data?: unknown };
	try {
		body = (await res.json()) as { success?: boolean; data?: unknown };
	} catch {
		return { categoryData: null, loadError: 'server' as const };
	}

	if (!body.success || !body.data || typeof body.data !== 'object') {
		return { categoryData: null, loadError: 'server' as const };
	}

	return {
		categoryData: body.data as CategoryProjectsPayload,
		loadError: null
	};
};
