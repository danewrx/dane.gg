import { env } from '$env/dynamic/private';

/**
 * Build URL for `fetch` in `+page.server.ts` / `+layout.server.ts`.
 * Without `VITE_API_URL`: relative `/api/...` (Vite proxy in dev; same-origin in prod).
 * With `VITE_API_URL` (e.g. `http://backend:3001/api`): absolute backend URL.
 *
 * @param path must start with `/api/` (e.g. `/api/blog/foo`, `/api/projects/category/uuid`)
 */
export function apiFetchUrl(path: string): string {
	if (!path.startsWith('/api/')) {
		throw new Error(`apiFetchUrl: path must start with /api/, got: ${path}`);
	}
	const fromEnv = env.VITE_API_URL?.trim();
	if (fromEnv) {
		const base = fromEnv.replace(/\/$/, '');
		const suffix = path.replace(/^\/api/, '');
		return `${base}${suffix}`;
	}
	return path;
}
