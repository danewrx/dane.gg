import { apiFetchUrl } from '$lib/server/apiFetchUrl';
import type { SiteTheme } from '$lib/site/stores/theme';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch }) => {
	const url = apiFetchUrl('/api/themes/active');
	try {
		const res = await fetch(url);
		if (!res.ok) {
			return { themeActive: null };
		}
		const themeActive = (await res.json()) as SiteTheme;
		return { themeActive };
	} catch {
		return { themeActive: null };
	}
};
