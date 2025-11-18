<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { adminNavigation } from '$lib/admin/config/navigation';
	import { user } from '$lib/admin/stores/auth';

	let { isCollapsed = false } = $props();

	// Filter navigation items based on user admin status
	const allNavItems = $derived(
		adminNavigation.filter(item => {
			if (item.id === 'users') {
				return $user?.isAdmin ?? false;
			}
			return true;
		})
	);

	const navItems = $derived(
		allNavItems.filter(item => item.id !== 'settings')
	);
	const settingsItem = $derived(
		allNavItems.find(item => item.id === 'settings')
	);

	// Check if a nav item is active
	function isActive(path: string): boolean {
		const currentPath = $page.url.pathname;
		return currentPath === path || currentPath.startsWith(path + '/');
	}

	// Handle navigation
	function handleNavigation(path: string) {
		goto(path);
	}
</script>

<aside class="sidebar" class:collapsed={isCollapsed}>
	<nav class="sidebar-nav">
		<ul class="nav-list">
			{#each navItems as item (item.id)}
				{@const IconComponent = item.icon}
				<li class="nav-item">
					<button
						class="nav-link"
						class:active={isActive(item.path)}
						onclick={() => handleNavigation(item.path)}
						aria-current={isActive(item.path) ? 'page' : undefined}
						title={isCollapsed ? item.label : undefined}
					>
						<div class="nav-icon">
							<IconComponent size={20} />
						</div>
						{#if !isCollapsed}
							<span class="nav-label">{item.label}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
		{#if settingsItem}
			{@const SettingsIcon = settingsItem.icon}
			<ul class="nav-list settings-list">
				<li class="nav-item">
					<button
						class="nav-link"
						class:active={isActive(settingsItem.path)}
						onclick={() => handleNavigation(settingsItem.path)}
						aria-current={isActive(settingsItem.path) ? 'page' : undefined}
						title={isCollapsed ? settingsItem.label : undefined}
					>
						<div class="nav-icon">
							<SettingsIcon size={20} />
						</div>
						{#if !isCollapsed}
							<span class="nav-label">{settingsItem.label}</span>
						{/if}
					</button>
				</li>
			</ul>
		{/if}
	</nav>
</aside>

<style>
	.sidebar {
		width: 240px;
		background: #1a1a1a;
		color: #ffffff;
		overflow-y: auto;
		z-index: 999;
		transition: width 0.3s ease, background-color 0.2s ease, border-color 0.2s ease;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		min-height: 100%;
		border-right: 1px solid #2a2a2a;
	}

	:global(html:not(.dark)) .sidebar {
		background: #ffffff;
		color: #1f2937;
		border-right-color: #e5e7eb;
	}

	.sidebar.collapsed {
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
	}

	.nav-list:first-child {
		flex: 1;
	}

	.settings-list {
		margin-top: auto;
		border-top: 1px solid #2a2a2a;
		padding-top: 0;
	}

	:global(html:not(.dark)) .settings-list {
		border-top-color: #e5e7eb;
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
		transition: background-color 0.2s ease, color 0.2s ease;
		font-size: 14px;
		font-weight: 400;
		white-space: nowrap;
		position: relative;
	}

	:global(html:not(.dark)) .nav-link {
		color: #374151;
	}

	.nav-link:hover {
		background: #2a2a2a;
	}

	:global(html:not(.dark)) .nav-link:hover {
		background: #f3f4f6;
	}

	.nav-link.active {
		background: var(--accent-color, #3b82f6);
		color: var(--accent-color-contrast, white);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.nav-link.active:hover {
		background: var(--accent-color-dark, #2563eb);
		color: var(--accent-color-dark-contrast, white);
	}

	.nav-link:focus {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: -2px;
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.nav-label {
		font-size: 14px;
		font-weight: 400;
		opacity: 1;
		transition: opacity 0.3s ease;
	}

	.sidebar.collapsed .nav-label {
		opacity: 0;
		width: 0;
		overflow: hidden;
	}

	.sidebar.collapsed .nav-link {
		justify-content: center;
		padding: 12px;
	}

	/* Hide desktop sidebar on mobile */
	@media (max-width: 768px) {
		.sidebar {
			display: none;
		}
	}
</style>
