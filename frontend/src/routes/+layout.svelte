<script lang="ts">
	// Root layout - handles routing between (site) and (admin) sections
	import { page } from '$app/stores';
	
	// Determine which section we're in based on the current route
	$: isAdminSection = $page.url.pathname.startsWith('/admin') || 
	                   $page.url.pathname.startsWith('/login') || 
	                   $page.url.pathname.startsWith('/logout');
</script>

<slot />

<style>
	/* Root styles - minimal, let each section handle its own styling */
	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
	}
</style>
