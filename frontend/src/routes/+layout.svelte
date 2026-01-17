<script lang="ts">
	// Root layout - handles routing between (site) and (admin) sections
	import { page } from '$app/stores';
	import { fontMode } from '$lib/site/stores/font';
	import { trackingService } from '$lib/tracking';
	import { onMount } from 'svelte';
	
	$: isAdminSection = $page?.url?.pathname 
		? ($page.url.pathname.startsWith('/admin') || 
		   $page.url.pathname.startsWith('/login') || 
		   $page.url.pathname.startsWith('/logout'))
		: false;
	
	$: fontMode;
	
	// Track page views (only for public site)
	onMount(() => {
		const unsubscribe = page.subscribe((newPage) => {
			if (!newPage?.url?.pathname) return;
			
			console.log('Layout: Page store updated. New path:', newPage.url.pathname);
			const isAdmin = newPage.url.pathname.startsWith('/admin') || 
			               newPage.url.pathname.startsWith('/login') || 
			               newPage.url.pathname.startsWith('/logout');
			
			if (!isAdmin) {
				console.log('Layout: Calling trackPageView for:', newPage.url.pathname);
				trackingService.trackPageView(newPage.url.pathname);
			} else {
				console.log('Layout: Skipping tracking for admin path:', newPage.url.pathname);
			}
		});
		
		return unsubscribe;
	});
</script>

<slot />

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
	}
</style>
