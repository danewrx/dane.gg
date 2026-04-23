import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { logger } from '$lib/logger';
import { normalizeDefaultWebNekoTypeForServer } from '$lib/site/oneko/variants';

const API_BASE_URL = process.env.VITE_API_URL || '/api';

const DANE_DEFAULT_WEB_NEKO_PLACEHOLDER = '%DANE_DEFAULT_WEB_NEKO_TYPE%';
const DANE_ENFORCE_WEB_NEKO_PLACEHOLDER = '%DANE_ENFORCE_WEB_NEKO%';
const DANE_ENFORCED_WEB_NEKO_TYPE_PLACEHOLDER = '%DANE_ENFORCED_WEB_NEKO_TYPE%';
const DANE_APP_REALM_PLACEHOLDER = '%DANE_APP_REALM%';

type WebNekoPageVars = { type: string; enforce: boolean; enforcedType: string };

let webNekoPageVarsCache: { vars: WebNekoPageVars; expires: number } | null = null;
const WEB_NEKO_PAGE_VARS_CACHE_MS = 60_000;

async function resolveWebNekoPageVars(event: {
	fetch: typeof fetch;
	url: URL;
}): Promise<WebNekoPageVars> {
	const now = Date.now();
	if (webNekoPageVarsCache && now < webNekoPageVarsCache.expires) {
		return webNekoPageVarsCache.vars;
	}
	let type = 'white';
	let enforce = false;
	let enforcedType = type;
	try {
		const configUrl = `${API_BASE_URL}/config`;
		const r = await event.fetch(configUrl);
		if (r.ok) {
			const j = await r.json();
			if (j.success && j.data) {
				type = normalizeDefaultWebNekoTypeForServer(j.data.default_web_neko_type);
				enforce = Boolean(j.data.enforce_web_neko);
				if (
					typeof j.data.enforced_web_neko_type === 'string' &&
					j.data.enforced_web_neko_type.trim()
				) {
					enforcedType = normalizeDefaultWebNekoTypeForServer(j.data.enforced_web_neko_type);
				} else {
					enforcedType = type;
				}
			}
		}
	} catch {
		/* defaults */
	}
	const vars = { type, enforce, enforcedType };
	webNekoPageVarsCache = { vars, expires: now + WEB_NEKO_PAGE_VARS_CACHE_MS };
	return vars;
}

interface User {
	id: string;
	username: string;
	isAdmin: boolean;
}

// Helper function to verify authentication with backend
async function verifyAuth(cookies: any, fetch: typeof globalThis.fetch): Promise<User | null> {
	try {
		const sessionCookie = cookies.get('dane.gg.sid');

		if (!sessionCookie) {
			return null;
		}

		// Try to get user from session first
		const sessionResponse = await fetch(`${API_BASE_URL}/auth/me`, {
			method: 'GET',
			headers: {
				Cookie: `dane.gg.sid=${sessionCookie}`,
				'Content-Type': 'application/json'
			}
		});

		if (sessionResponse.ok) {
			const data = await sessionResponse.json();
			if (data.success && data.user) {
				return data.user;
			}
		}

		// If session fails, try JWT token verification
		const authHeader = cookies.get('authorization');
		if (authHeader) {
			const tokenResponse = await fetch(`${API_BASE_URL}/auth/verify`, {
				method: 'GET',
				headers: {
					Authorization: authHeader,
					'Content-Type': 'application/json'
				}
			});

			if (tokenResponse.ok) {
				const data = await tokenResponse.json();
				if (data.success && data.user) {
					return data.user;
				}
			}
		}

		return null;
	} catch (error) {
		logger.error('Auth verification failed:', error);
		return null;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies } = event;
	const pathname = url.pathname;

	const isAdminRoute =
		pathname.startsWith('/admin') ||
		pathname.startsWith('/login') ||
		pathname.startsWith('/logout');
	const daneAppRealm = isAdminRoute ? 'admin' : 'public';

	// Skip auth check for system routes (assets, API, etc.)
	const systemRoutes = [
		'/api/health',
		'/favicon.ico',
		'/robots.txt',
		'/assets/',
		'/static/',
		'/_app/',
		'/_svelte/'
	];

	const isSystemRoute = systemRoutes.some((route) => pathname.startsWith(route));

	if (isSystemRoute) {
		return resolve(event);
	}

	if (pathname.startsWith('/api')) {
		return resolve(event);
	}

	const injectPagePlaceholders = async () => {
		const { type, enforce, enforcedType } = await resolveWebNekoPageVars(event);
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.split(DANE_DEFAULT_WEB_NEKO_PLACEHOLDER)
					.join(JSON.stringify(type))
					.split(DANE_ENFORCE_WEB_NEKO_PLACEHOLDER)
					.join(String(enforce))
					.split(DANE_ENFORCED_WEB_NEKO_TYPE_PLACEHOLDER)
					.join(JSON.stringify(enforcedType))
					.split(DANE_APP_REALM_PLACEHOLDER)
					.join(daneAppRealm)
		});
	};

	if (isAdminRoute) {
		// Verify authentication for admin routes
		const user = await verifyAuth(cookies, event.fetch);

		if (!user) {
			// Don't redirect if already on login page
			if (pathname === '/login') {
				return injectPagePlaceholders();
			}
			// Redirect to login page
			throw redirect(302, '/login?redirect=' + encodeURIComponent(pathname));
		}

		// Add user to locals for use in load functions
		event.locals.user = user;
		event.locals.isAuthenticated = true;
	}

	return injectPagePlaceholders();
};
