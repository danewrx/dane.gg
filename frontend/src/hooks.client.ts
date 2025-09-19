import { authService } from '$lib/services/auth';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';

// Initialize authentication when the app starts
if (browser) {
  // Initialize auth service
  authService.init().catch(error => {
    console.error('Failed to initialize auth:', error);
  });

  // Set up periodic token refresh (every 30 minutes)
  setInterval(async () => {
    try {
      await authService.refreshToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, redirect to login
      goto('/login');
    }
  }, 30 * 60 * 1000); // 30 minutes

  // Listen for storage changes (logout from another tab)
  window.addEventListener('storage', (event) => {
    if (event.key === 'auth' && event.newValue === null) {
      // Auth was cleared in another tab, redirect to login
      goto('/login');
    }
  });

  // Listen for visibility change (tab becomes active)
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
      // Tab became active, verify auth
      try {
        await authService.checkAuth();
      } catch (error) {
        console.error('Auth check failed on visibility change:', error);
        goto('/login');
      }
    }
  });
}
