import { authService } from '$lib/admin/services/auth';
import { themeService } from '$lib/admin/services/theme';
import { accentColorService } from '$lib/admin/services/accentColor';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { page } from '$app/stores';

// Helper function to check if current route is admin
// Admin routes: /admin, /login, /logout
// Everything else (including all (site) routes) is public
function isAdminRoute(pathname: string): boolean {
	return (
		pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/logout')
	);
}

// Initialize authentication when the app starts - ONLY for admin routes
if (browser) {
	// Check if we're on an admin route before initializing auth
	const currentPath = window.location.pathname;

	if (isAdminRoute(currentPath)) {
		// Initialize auth service only for admin routes
		authService.init().catch(() => {
			// Auth initialization failed - this is normal for unauthenticated users
		});

		// Initialize theme service for admin routes
		themeService.init().catch((error) => {
			console.error('Failed to initialize theme service:', error);
		});

		// Initialize accent color service for admin routes
		accentColorService.init().catch((error) => {
			console.error('Failed to initialize accent color service:', error);
		});
	}

	// Set up periodic token refresh (every 30 minutes) - only for admin routes
	setInterval(
		async () => {
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
		},
		30 * 60 * 1000
	); // 30 minutes

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
					// Auth check failed - this is normal for unauthenticated users
					// Only redirect to login if we're on an admin route
					if (isAdminRoute(currentPath)) {
						goto('/login');
					}
				}
			}
		}
	});

	// Listen for route changes to initialize auth when navigating to admin routes
	page.subscribe((pageData) => {
		// Check if url exists before accessing it
		if (!pageData?.url) {
			return;
		}

		const currentPath = pageData.url.pathname;

		if (isAdminRoute(currentPath)) {
			// Initialize auth when navigating to admin routes
			authService.init().catch(() => {
				// Auth initialization failed - this is normal for unauthenticated users
			});

			// Initialize theme service when navigating to admin routes
			themeService.init().catch((error) => {
				console.error('Failed to initialize theme service on route change:', error);
			});

			// Initialize accent color service when navigating to admin routes
			accentColorService.init().catch((error) => {
				console.error('Failed to initialize accent color service on route change:', error);
			});
		}
	});
}
