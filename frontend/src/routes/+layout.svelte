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

			logger.info('Page store updated. New path:', newPage.url.pathname);
			const isAdmin =
				newPage.url.pathname.startsWith('/admin') ||
				newPage.url.pathname.startsWith('/login') ||
				newPage.url.pathname.startsWith('/logout');

			if (!isAdmin && !newPage.url.searchParams.has('themePreview')) {
				logger.info('Calling trackPageView for:', newPage.url.pathname);
				trackingService.trackPageView(newPage.url.pathname);
			} else if (!isAdmin) {
				logger.info('Skipping tracking (theme preview iframe)');
			} else {
				logger.info('Skipping tracking for admin path:', newPage.url.pathname);
			}
		});

		return unsubscribe;
	});
</script>

<svelte:head>
	<link rel="icon" type="image/png" href="/assets/favicon/favicon-96x96.png" sizes="96x96" />
	<link rel="icon" type="image/svg+xml" href="/assets/favicon/favicon.svg" />
	<link rel="shortcut icon" href="/assets/favicon/favicon.ico" />
	<link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon/apple-touch-icon.png" />
	<meta name="apple-mobile-web-app-title" content="dane.gg" />
	<link rel="manifest" href="/assets/favicon/site.webmanifest" />
</svelte:head>

<slot />
