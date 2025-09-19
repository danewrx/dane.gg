import { authService } from '$lib/services/auth';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { page } from '$app/stores';

// Helper function to check if current route is admin
function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/logout');
}

// Initialize authentication when the app starts
if (browser) {
  // Initialize auth service
  authService.init().catch(error => {
    console.error('Failed to initialize auth:', error);
  });

  // Set up periodic token refresh (every 30 minutes) - only for admin routes
  setInterval(async () => {
    const currentPath = window.location.pathname;
    if (isAdminRoute(currentPath)) {
      try {
        await authService.refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Only redirect to login if we're on an admin route
        if (isAdminRoute(currentPath)) {
          goto('/login');
        }
      }
    }
  }, 30 * 60 * 1000); // 30 minutes

  // Listen for storage changes (logout from another tab) - only for admin routes
  window.addEventListener('storage', (event) => {
    if (event.key === 'auth' && event.newValue === null) {
      const currentPath = window.location.pathname;
      // Only redirect to login if we're on an admin route
      if (isAdminRoute(currentPath)) {
        goto('/login');
      }
    }
  });

  // Listen for visibility change (tab becomes active) - only for admin routes
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
      const currentPath = window.location.pathname;
      if (isAdminRoute(currentPath)) {
        try {
          await authService.checkAuth();
        } catch (error) {
          console.error('Auth check failed on visibility change:', error);
          // Only redirect to login if we're on an admin route
          if (isAdminRoute(currentPath)) {
            goto('/login');
          }
        }
      }
    }
  });
}
