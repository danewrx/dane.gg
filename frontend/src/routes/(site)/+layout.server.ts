import { apiFetchUrl } from '$lib/server/apiFetchUrl';

export const load = async ({ fetch }: { fetch: typeof globalThis.fetch }) => {
	const url = apiFetchUrl('/api/themes/active');
	try {
		const res = await fetch(url);
		if (!res.ok) {
			return { themeActive: null };
		}
		const themeActive = await res.json();
		return { themeActive };
	} catch {
		return { themeActive: null };
	}
};
