import { logger } from '$lib/logger';
import { authService } from '$lib/admin/services/auth';
import { themeService } from '$lib/admin/services/theme';
import { accentColorService } from '$lib/admin/services/accentColor';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { page } from '$app/stores';
import { get } from 'svelte/store';
import {
	applyBrowserSiteThemeToDom,
	clearSiteThemePresentation,
	siteTheme
} from '$lib/site/stores/theme';
import { reapplyFontForCurrentRealm } from '$lib/site/stores/font';

// Helper function to check if current route is admin
// Admin routes: /admin, /login, /logout
// Everything else (including all (site) routes) is public
function isAdminRoute(pathname: string): boolean {
	return (
		pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/logout')
	);
}

function setDaneAppRealm(pathname: string): void {
	document.documentElement.dataset.daneApp = isAdminRoute(pathname) ? 'admin' : 'public';
}

type DaneWindow = typeof globalThis & {
	daneTeardownWebNeko?: () => void;
	daneRestartWebNeko?: () => void;
};

function daneWindow(): DaneWindow {
	return globalThis;
}

// Initialize authentication when the app starts - ONLY for admin routes
if (browser) {
	setDaneAppRealm(globalThis.location.pathname);

	// Check if we're on an admin route before initializing auth
	const currentPath = globalThis.location.pathname;

	if (isAdminRoute(currentPath)) {
		// Initialize auth service only for admin routes
		authService.init().catch(() => {
			// Auth initialization failed - this is normal for unauthenticated users
		});

		// Initialize theme service for admin routes
		themeService.init().catch((error) => {
			logger.error('Failed to initialize theme service:', error);
		});

		// Initialize accent color service for admin routes
		accentColorService.init().catch((error) => {
			logger.error('Failed to initialize accent color service:', error);
		});
	}

	// Set up periodic token refresh (every 30 minutes) - only for admin routes
	setInterval(
		async () => {
			const currentPath = globalThis.location.pathname;
			if (isAdminRoute(currentPath)) {
				try {
					await authService.refreshToken();
				} catch (error) {
					logger.error('Token refresh failed:', error);
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
	globalThis.addEventListener('storage', (event) => {
		if (event.key === 'auth' && event.newValue === null) {
			const currentPath = globalThis.location.pathname;
			// Only redirect to login if we're on an admin route
			if (isAdminRoute(currentPath)) {
				goto('/login');
			}
		}
	});

	// Listen for visibility change (tab becomes active) - only for admin routes
	document.addEventListener('visibilitychange', async () => {
		if (!document.hidden) {
			const currentPath = globalThis.location.pathname;
			if (isAdminRoute(currentPath)) {
				try {
					await authService.checkAuth();
				} catch {
					// Auth check failed - this is normal for unauthenticated users
					// Only redirect to login if we're on an admin route
					if (isAdminRoute(currentPath)) {
						goto('/login');
					}
				}
			}
		}
	});

	let prevAdminRoute = isAdminRoute(globalThis.location.pathname);

	// Listen for route changes to initialize auth when navigating to admin routes
	page.subscribe((pageData) => {
		// Check if url exists before accessing it
		if (!pageData?.url) {
			return;
		}

		const currentPath = pageData.url.pathname;
		const adminNow = isAdminRoute(currentPath);

		setDaneAppRealm(currentPath);

		if (adminNow && !prevAdminRoute) {
			clearSiteThemePresentation();
			reapplyFontForCurrentRealm();
		} else if (!adminNow && prevAdminRoute) {
			applyBrowserSiteThemeToDom(get(siteTheme));
			reapplyFontForCurrentRealm();
		}

		const w = daneWindow();
		if (adminNow && !prevAdminRoute) {
			if (typeof w.daneTeardownWebNeko === 'function') w.daneTeardownWebNeko();
		} else if (!adminNow && prevAdminRoute) {
			if (typeof w.daneRestartWebNeko === 'function') w.daneRestartWebNeko();
		}
		prevAdminRoute = adminNow;

		if (adminNow) {
			// Initialize auth when navigating to admin routes
			authService.init().catch(() => {
				// Auth initialization failed - this is normal for unauthenticated users
			});

			// Initialize theme service when navigating to admin routes
			themeService.init().catch((error) => {
				logger.error('Failed to initialize theme service on route change:', error);
			});

			// Initialize accent color service when navigating to admin routes
			accentColorService.init().catch((error) => {
				logger.error('Failed to initialize accent color service on route change:', error);
			});
		}
	});

	function syncWebNekoForViewport() {
		if (isAdminRoute(globalThis.location.pathname)) return;
		const w = daneWindow();
		if (typeof w.daneRestartWebNeko === 'function') w.daneRestartWebNeko();
	}

	const webNekoViewportQueries = ['(pointer: coarse)', '(max-width: 768px) and (hover: none)'];
	for (const q of webNekoViewportQueries) {
		globalThis.matchMedia(q).addEventListener('change', syncWebNekoForViewport);
	}
}
