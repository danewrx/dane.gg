<script lang="ts">
	import { page } from '$app/stores';
	import { user, isAuthenticated, isLoading } from '$lib/stores/auth';
	import { authService } from '$lib/services/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	
	// Admin navigation items
	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: '📊' }
	];

	let isLoggingOut = false;

	onMount(() => {
		// If not authenticated, redirect to login
		if (!$isLoading && !$isAuthenticated) {
			goto('/login?redirect=' + encodeURIComponent($page.url.pathname));
		}
	});

	async function handleLogout() {
		if (isLoggingOut) return;
		
		isLoggingOut = true;
		try {
			await authService.logout();
			goto('/login');
		} catch (error) {
			console.error('Logout failed:', error);
			// Still redirect to login even if logout fails
			goto('/login');
		}
	}
</script>

<svelte:head>
	<title>Admin Panel - Dane.gg</title>
</svelte:head>

{#if $isLoading}
	<div class="loading-page">
		<LoadingSpinner size="large" text="Authenticating..." />
	</div>
{:else if !$isAuthenticated}
	<div class="loading-page">
		<LoadingSpinner size="large" text="Redirecting to login..." />
	</div>
{:else}
<div class="admin-layout">
	<!-- Admin Header -->
	<header class="admin-header">
		<div class="admin-header-content">
			<div class="admin-logo">
				<h1>🔧 Admin Panel</h1>
			</div>
			<nav class="admin-nav">
				{#if $user}
					<div class="user-info">
						<span class="username">Welcome, {$user.username}</span>
						{#if $user.isAdmin}
							<span class="admin-badge">Admin</span>
						{/if}
					</div>
				{/if}
				<button 
					class="logout-btn" 
					on:click={handleLogout}
					disabled={isLoggingOut}
				>
					{isLoggingOut ? 'Logging out...' : 'Logout'}
				</button>
				<a href="/" class="back-to-site">← Back to Site</a>
			</nav>
		</div>
	</header>

	<div class="admin-container">
		<!-- Admin Sidebar -->
		<aside class="admin-sidebar">
			<nav class="admin-nav-menu">
				{#each navItems as item}
					<a 
						href={item.href} 
						class="nav-item"
						class:active={$page.url.pathname === item.href}
					>
						<span class="nav-icon">{item.icon}</span>
						<span class="nav-label">{item.label}</span>
					</a>
				{/each}
			</nav>
		</aside>

		<!-- Admin Main Content -->
		<main class="admin-main">
			<slot />
		</main>
	</div>
</div>
{/if}

<style>
	.admin-layout {
		min-height: 100vh;
		background: #f8fafc;
	}

	.admin-header {
		background: #1e293b;
		color: white;
		padding: 1rem 0;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.admin-header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.admin-logo h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.back-to-site {
		color: #94a3b8;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		transition: all 0.2s;
	}

	.back-to-site:hover {
		background: #334155;
		color: white;
	}

	.admin-container {
		display: flex;
		max-width: 1200px;
		margin: 0 auto;
		min-height: calc(100vh - 80px);
	}

	.admin-sidebar {
		width: 250px;
		background: white;
		border-right: 1px solid #e2e8f0;
		padding: 1.5rem 0;
	}

	.admin-nav-menu {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		color: #64748b;
		text-decoration: none;
		transition: all 0.2s;
		border-right: 3px solid transparent;
	}

	.nav-item:hover {
		background: #f1f5f9;
		color: #334155;
	}

	.nav-item.active {
		background: #dbeafe;
		color: #1d4ed8;
		border-right-color: #1d4ed8;
	}

	.nav-icon {
		font-size: 1.25rem;
	}

	.nav-label {
		font-weight: 500;
	}

	.admin-main {
		flex: 1;
		padding: 2rem;
		background: white;
		margin: 1rem;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	@media (max-width: 768px) {
		.admin-container {
			flex-direction: column;
		}
		
		.admin-sidebar {
			width: 100%;
			padding: 1rem 0;
		}
		
		.admin-nav-menu {
			flex-direction: row;
			overflow-x: auto;
			padding: 0 1rem;
		}
		
		.nav-item {
			white-space: nowrap;
			flex-shrink: 0;
		}
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.username {
		color: #374151;
		font-weight: 500;
	}

	.admin-badge {
		background: #667eea;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.logout-btn {
		background: #dc2626;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.15s ease-in-out;
	}

	.logout-btn:hover:not(:disabled) {
		background: #b91c1c;
	}

	.logout-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.loading-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f8fafc;
	}
</style>
