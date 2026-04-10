<script lang="ts">
	// Root layout - handles routing between (site) and (admin) sections
	import '../app.css';
	import { page } from '$app/stores';
	import { trackingService } from '$lib/tracking';
	import { onMount } from 'svelte';

	// Track page views (only for public site)
	onMount(() => {
		const unsubscribe = page.subscribe((newPage) => {
			if (!newPage?.url?.pathname) return;

			console.log('Layout: Page store updated. New path:', newPage.url.pathname);
			const isAdmin =
				newPage.url.pathname.startsWith('/admin') ||
				newPage.url.pathname.startsWith('/login') ||
				newPage.url.pathname.startsWith('/logout');

			if (!isAdmin && !newPage.url.searchParams.has('themePreview')) {
				console.log('Layout: Calling trackPageView for:', newPage.url.pathname);
				trackingService.trackPageView(newPage.url.pathname);
			} else if (!isAdmin) {
				console.log('Layout: Skipping tracking (theme preview iframe)');
			} else {
				console.log('Layout: Skipping tracking for admin path:', newPage.url.pathname);
			}
		});

		return unsubscribe;
	});
</script>

<slot />
