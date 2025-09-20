<script lang="ts">
	import { goto } from '$app/navigation';
	import { authService } from '$lib/services/auth';
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
	import AdminSidebar from '$lib/components/admin/AdminSidebar.svelte';

	let { children } = $props();
	let sidebarCollapsed = $state(false);

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

	// Handle sidebar toggle
	function handleToggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
	}
</script>

<svelte:head>
	<title>Admin Panel - dane.gg</title>
</svelte:head>

<div class="admin-layout">
	<!-- Header Bar -->
	<AdminHeader 
		on:logout={handleLogout} 
		on:toggleSidebar={handleToggleSidebar} 
	/>
	
	<div class="admin-content">
		<!-- Collapsible Sidebar -->
		<AdminSidebar isCollapsed={sidebarCollapsed} />
		
		<!-- Main Content Area -->
		<main class="admin-main">
			{@render children?.()}
		</main>
	</div>
</div>

<style>
	.admin-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #1a1a1a;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		color: #ffffff;
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
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.admin-content {
			flex-direction: column;
		}
		
		.admin-main {
			padding: 16px;
		}
	}
</style>