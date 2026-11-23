import { apiFetchUrl } from '$lib/server/apiFetchUrl';
import type { PageSeoMap } from '$lib/site/seo';
import type { SiteTheme } from '$lib/site/stores/theme';
import type { LayoutServerLoad } from './$types';

async function fetchJson<T>(fetch: typeof globalThis.fetch, path: string): Promise<T | null> {
	try {
		const res = await fetch(apiFetchUrl(path));
		return res.ok ? ((await res.json()) as T) : null;
	} catch {
		return null;
	}
}

export const load: LayoutServerLoad = async ({ fetch }) => {
	const [themeActive, pageSeo] = await Promise.all([
		fetchJson<SiteTheme>(fetch, '/api/themes/active'),
		fetchJson<{ data?: PageSeoMap }>(fetch, '/api/config/page-seo')
	]);
	return { themeActive, pageSeo: pageSeo?.data ?? null };
};
