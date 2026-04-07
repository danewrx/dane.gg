import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { normalizeDefaultWebNekoTypeForServer } from '$lib/site/oneko/variants';

const API_BASE_URL = process.env.VITE_API_URL || '/api';

const DANE_DEFAULT_WEB_NEKO_PLACEHOLDER = '%DANE_DEFAULT_WEB_NEKO_TYPE%';
const DANE_ENFORCE_WEB_NEKO_PLACEHOLDER = '%DANE_ENFORCE_WEB_NEKO%';

type WebNekoPageVars = { type: string; enforce: boolean };

let webNekoPageVarsCache: { vars: WebNekoPageVars; expires: number } | null = null;
const WEB_NEKO_PAGE_VARS_CACHE_MS = 60_000;

async function resolveWebNekoPageVars(event: { fetch: typeof fetch; url: URL }): Promise<WebNekoPageVars> {
	const now = Date.now();
	if (webNekoPageVarsCache && now < webNekoPageVarsCache.expires) {
		return webNekoPageVarsCache.vars;
	}
	let type = 'white';
	let enforce = false;
	try {
		const configUrl = new URL('/api/config', event.url.origin).toString();
		const r = await event.fetch(configUrl);
		if (r.ok) {
			const j = await r.json();
			if (j.success && j.data) {
				type = normalizeDefaultWebNekoTypeForServer(j.data.default_web_neko_type);
				enforce = Boolean(j.data.enforce_web_neko);
			}
		}
	} catch {
		/* defaults */
	}
	const vars = { type, enforce };
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
        'Cookie': `dane.gg.sid=${sessionCookie}`,
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
          'Authorization': authHeader,
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
    console.error('Auth verification failed:', error);
    return null;
  }
}

export const handle: Handle = async ({ event, resolve }) => {
  const { url, cookies } = event;
  const pathname = url.pathname;

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

  const isSystemRoute = systemRoutes.some(route => pathname.startsWith(route));
  
  if (isSystemRoute) {
    return resolve(event);
  }

  if (pathname.startsWith('/api')) {
    return resolve(event);
  }

  const injectWebNekoDefault = async () => {
    const { type, enforce } = await resolveWebNekoPageVars(event);
    return resolve(event, {
      transformPageChunk: ({ html }) =>
        html
          .split(DANE_DEFAULT_WEB_NEKO_PLACEHOLDER).join(JSON.stringify(type))
          .split(DANE_ENFORCE_WEB_NEKO_PLACEHOLDER).join(String(enforce))
    });
  };

  // Check if admin route (/admin, /login, /logout)
  const isAdminRoute = pathname.startsWith('/admin') || 
                      pathname.startsWith('/login') || 
                      pathname.startsWith('/logout');

  if (isAdminRoute) {
    // Verify authentication for admin routes
    const user = await verifyAuth(cookies, event.fetch);
    
    if (!user) {
      // Don't redirect if already on login page
      if (pathname === '/login') {
        return injectWebNekoDefault();
      }
      // Redirect to login page
      throw redirect(302, '/login?redirect=' + encodeURIComponent(pathname));
    }

    // Add user to locals for use in load functions
    event.locals.user = user;
    event.locals.isAuthenticated = true;
  }

  return injectWebNekoDefault();
};
