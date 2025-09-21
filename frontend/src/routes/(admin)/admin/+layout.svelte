<script lang="ts">
	import { goto } from '$app/navigation';
	import { authService } from '$lib/services/auth';
	import { onMount } from 'svelte';
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
	import AdminSidebar from '$lib/components/admin/AdminSidebar.svelte';
	import AdminMobileAppBar from '$lib/components/admin/AdminMobileAppBar.svelte';
	import AdminMobileSidebar from '$lib/components/admin/AdminMobileSidebar.svelte';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();
	let sidebarCollapsed = $state(false);
	let showMobileSidebar = $state(false);
	let mobileSidebarItems = $state<any[]>([]);
	

	// Handle logout
	async function handleLogout() {
		try {
			await authService.logout();
			goto('/login?redirect=/admin');
		} catch (error) {
			console.error('Logout failed:', error);
			goto('/login?redirect=/admin');
		}
	}

	// Handle desktop sidebar toggle
	function handleToggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}

	// Handle mobile sidebar toggle
	function handleToggleMobileSidebar() {
		showMobileSidebar = !showMobileSidebar;
	}

	// Close mobile sidebar
	function closeMobileSidebar() {
		showMobileSidebar = false;
	}

	// Track whether mobile menu should be shown
	let showMobileMenu = $derived(mobileSidebarItems.length > 0);


	// Handle sidebar items update
	function handleSidebarItemsUpdate(event: Event) {
		const customEvent = event as CustomEvent;
		mobileSidebarItems = customEvent.detail.items;
	}

	// Add event listener for sidebar items
	onMount(() => {
		window.addEventListener('updateSidebarItems', handleSidebarItemsUpdate);
		
		// Request initial update from app bar
		setTimeout(() => {
			window.dispatchEvent(new CustomEvent('requestSidebarUpdate'));
		}, 100);
		
		return () => {
			window.removeEventListener('updateSidebarItems', handleSidebarItemsUpdate);
		};
	});
</script>

<svelte:head>
	<title>Admin Panel - dane.gg</title>
</svelte:head>

<!-- Mode Watcher for theme management -->
<ModeWatcher track={true} />

<div class="admin-layout">
	<!-- Header Bar -->
	<AdminHeader 
		on:logout={handleLogout} 
		on:toggleSidebar={handleToggleSidebar}
		on:toggleMobileSidebar={handleToggleMobileSidebar}
		{showMobileMenu}
	/>
	
	<div class="admin-content">
		<!-- Collapsible Sidebar -->
		<AdminSidebar isCollapsed={sidebarCollapsed} />
		
		<!-- Main Content Area -->
		<main class="admin-main">
			{@render children?.()}
		</main>
	</div>

	<!-- Mobile App Bar -->
	<AdminMobileAppBar />
	
	<!-- Mobile Sidebar -->
	<AdminMobileSidebar 
		isOpen={showMobileSidebar} 
		onClose={closeMobileSidebar}
		items={mobileSidebarItems}
	/>
</div>

<style>
	.admin-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #1a1a1a;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		color: #ffffff;
		transition: background-color 0.2s ease, color 0.2s ease;
	}

	:global(html:not(.dark)) .admin-layout {
		background: #f8fafc;
		color: #1f2937;
	}

	.admin-content {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.admin-main {
		flex: 1;
		overflow-y: auto;
		background: #1a1a1a;
		padding: 24px;
		transition: background-color 0.2s ease;
	}

	:global(html:not(.dark)) .admin-main {
		background: #f8fafc;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.admin-content {
			flex-direction: column;
		}
		
		.admin-main {
			padding: 16px;
			padding-bottom: 100px; /* Space for mobile app bar */
		}
	}
</style>