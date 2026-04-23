<script lang="ts">
	import { logger } from '$lib/logger';

	// Root layout - handles routing between (site) and (admin) sections
	import '../app.css';
	import { page } from '$app/stores';
	import { trackingService } from '$lib/tracking';
	import { onMount } from 'svelte';

	// Track page views (only for public site)
	onMount(() => {
		const unsubscribe = page.subscribe((newPage) => {
			if (!newPage?.url?.pathname) return;

			logger.info('Layout: Page store updated. New path:', newPage.url.pathname);
			const isAdmin =
				newPage.url.pathname.startsWith('/admin') ||
				newPage.url.pathname.startsWith('/login') ||
				newPage.url.pathname.startsWith('/logout');

			if (!isAdmin && !newPage.url.searchParams.has('themePreview')) {
				logger.info('Layout: Calling trackPageView for:', newPage.url.pathname);
				trackingService.trackPageView(newPage.url.pathname);
			} else if (!isAdmin) {
				logger.info('Layout: Skipping tracking (theme preview iframe)');
			} else {
				logger.info('Layout: Skipping tracking for admin path:', newPage.url.pathname);
			}
		});

		return unsubscribe;
	});
</script>

<slot />
