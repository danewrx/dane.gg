<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Settings } from 'lucide-svelte';

	let { isCollapsed = false } = $props();

	// Navigation items - only Site Settings for now
	const navItems = [
		{
			id: 'site-settings',
			label: 'Site Settings',
			icon: Settings,
			path: '/admin/settings'
		}
	];

	// Check if a nav item is active
	function isActive(path: string): boolean {
		return $page.url.pathname === path;
	}

	// Handle navigation
	function handleNavigation(path: string) {
		goto(path);
	}
</script>

<aside class="desktop-sidebar" class:collapsed={isCollapsed}>
	<nav class="sidebar-nav">
		<ul class="nav-list">
			{#each navItems as item (item.id)}
				<li class="nav-item">
					<button
						class="nav-link"
						class:active={isActive(item.path)}
						onclick={() => handleNavigation(item.path)}
						aria-current={isActive(item.path) ? 'page' : undefined}
						title={isCollapsed ? item.label : undefined}
					>
						{#if item.icon === Settings}
							<Settings size={20} />
						{/if}
						{#if !isCollapsed}
							<span class="nav-label">{item.label}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</nav>
</aside>

<style>
	.desktop-sidebar {
		width: 240px;
		background: #1a1a1a;
		color: #ffffff;
		overflow-y: auto;
		z-index: 999;
		transition: width 0.3s ease;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		min-height: 100%;
		border-right: 1px solid #2a2a2a;
	}

	.desktop-sidebar.collapsed {
		width: 60px;
	}

	.sidebar-nav {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 0;
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
		flex: 1;
	}

	.nav-item {
		margin: 0;
		padding: 0;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 20px;
		background: none;
		border: none;
		color: #ffffff;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s ease;
		font-size: 14px;
		font-weight: 400;
		white-space: nowrap;
		position: relative;
	}

	.nav-link:hover {
		background: #2a2a2a;
	}

	.nav-link.active {
		background: #3a3a3a;
		color: #ffffff;
	}

	.nav-link:focus {
		outline: 2px solid #6366f1;
		outline-offset: -2px;
	}

	.nav-label {
		font-size: 14px;
		font-weight: 400;
		opacity: 1;
		transition: opacity 0.3s ease;
	}

	.desktop-sidebar.collapsed .nav-label {
		opacity: 0;
		width: 0;
		overflow: hidden;
	}

	.desktop-sidebar.collapsed .nav-link {
		justify-content: center;
		padding: 12px;
	}

	/* Hide on mobile */
	@media (max-width: 768px) {
		.desktop-sidebar {
			display: none;
		}
	}
</style>
