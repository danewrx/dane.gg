import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

const API_BASE_URL = process.env.VITE_API_URL || '/api';

interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

// Helper function to verify authentication with backend
async function verifyAuth(cookies: any): Promise<User | null> {
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

  // Check if admin route (/admin, /login, /logout)
  const isAdminRoute = pathname.startsWith('/admin') || 
                      pathname.startsWith('/login') || 
                      pathname.startsWith('/logout');

  if (isAdminRoute) {
    // Verify authentication for admin routes
    const user = await verifyAuth(cookies);
    
    if (!user) {
      // Don't redirect if already on login page
      if (pathname === '/login') {
        return resolve(event);
      }
      // Redirect to login page
      throw redirect(302, '/login?redirect=' + encodeURIComponent(pathname));
    }

    // Add user to locals for use in load functions
    event.locals.user = user;
    event.locals.isAuthenticated = true;
  }

  return resolve(event);
};
