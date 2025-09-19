import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';

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

  // Skip auth check for public routes
  const publicRoutes = [
    '/',
    '/login',
    '/api/health',
    '/favicon.ico',
    '/robots.txt'
  ];

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return resolve(event);
  }

  // Check if this is an admin route
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    // Verify authentication for admin routes
    const user = await verifyAuth(cookies);
    
    if (!user) {
      // Redirect to login page
      throw redirect(302, '/login?redirect=' + encodeURIComponent(pathname));
    }

    // Add user to locals for use in load functions
    event.locals.user = user;
    event.locals.isAuthenticated = true;
  }

  // For other protected routes, you can add similar logic here
  // const isProtectedRoute = pathname.startsWith('/protected');
  // if (isProtectedRoute) {
  //   const user = await verifyAuth(cookies);
  //   if (!user) {
  //     throw redirect(302, '/login?redirect=' + encodeURIComponent(pathname));
  //   }
  //   event.locals.user = user;
  //   event.locals.isAuthenticated = true;
  // }

  return resolve(event);
};
