<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { LogOut, Menu, User, ChevronDown } from 'lucide-svelte';
	import { user } from '$lib/admin/stores/auth';
	import { goto } from '$app/navigation';

	let { showMobileMenu = true } = $props();

	// Local state
	let showAccountDropdown = $state(false);

	const dispatch = createEventDispatcher<{
		logout: void;
		toggleSidebar: void;
		toggleMobileSidebar: void;
	}>();

	function handleLogout() {
		dispatch('logout');
	}

	function handleToggleSidebar() {
		dispatch('toggleSidebar');
	}

	function handleToggleMobileSidebar() {
		dispatch('toggleMobileSidebar');
	}

	function toggleAccountDropdown() {
		showAccountDropdown = !showAccountDropdown;
	}

	function handleAccountClick() {
		showAccountDropdown = false;
		goto('/admin/account');
	}

	function handleLogoutClick() {
		showAccountDropdown = false;
		handleLogout();
	}

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (!target.closest('.account-dropdown')) {
			showAccountDropdown = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<header class="admin-header">
	<div class="header-content">
		<!-- Left side - Menu toggle and site title -->
		<div class="header-left">
			<!-- Desktop sidebar toggle -->
			<button 
				class="menu-toggle desktop-only"
				onclick={handleToggleSidebar}
				aria-label="Toggle sidebar"
			>
				<Menu size={20} />
			</button>
			
			<!-- Mobile sidebar toggle -->
			{#if showMobileMenu}
				<button 
					class="menu-toggle mobile-only"
					onclick={handleToggleMobileSidebar}
					aria-label="Open menu"
				>
					<Menu size={20} />
				</button>
			{/if}
			
			<h1 class="site-title">DANEGG</h1>
		</div>
		
		<!-- Right side - Account dropdown -->
		<div class="header-right">
			<div class="account-dropdown">
				<button 
					class="account-button"
					onclick={toggleAccountDropdown}
					aria-label="Account menu"
				>
					<div class="account-info">
						<User size={16} />
						<span class="username">{$user?.username || 'User'}</span>
						<ChevronDown size={14} class="dropdown-arrow {showAccountDropdown ? 'open' : ''}" />
					</div>
				</button>
				
				{#if showAccountDropdown}
					<div class="dropdown-menu">
						<button class="dropdown-item" onclick={handleAccountClick}>
							<User size={16} />
							Account Settings
						</button>
						<hr class="dropdown-divider" />
						<button class="dropdown-item logout-item" onclick={handleLogoutClick}>
							<LogOut size={16} />
							Logout
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>

<style>
	.admin-header {
		background: #1a1a1a;
		color: #ffffff;
		z-index: 1000;
		position: sticky;
		top: 0;
		border-bottom: 1px solid #2a2a2a;
		transition: background-color 0.2s ease, border-color 0.2s ease;
	}

	:global(html:not(.dark)) .admin-header {
		background: #ffffff;
		color: #1f2937;
		border-bottom-color: #e5e7eb;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 24px;
		max-width: 100%;
		height: 40px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.menu-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		color: #ffffff;
		border: none;
		padding: 8px;
		cursor: pointer;
		transition: background-color 0.2s ease, color 0.2s ease;
		border-radius: 4px;
	}

	:global(html:not(.dark)) .menu-toggle {
		color: #1f2937;
	}

	.menu-toggle:hover {
		background: #2a2a2a;
	}

	:global(html:not(.dark)) .menu-toggle:hover {
		background: #f3f4f6;
	}

	.menu-toggle:focus {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: 2px;
	}

	.site-title {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: #ffffff;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		transition: color 0.2s ease;
	}

	:global(html:not(.dark)) .site-title {
		color: #1f2937;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.account-dropdown {
		position: relative;
	}

	.account-button {
		display: flex;
		align-items: center;
		background: none;
		color: #ffffff;
		border: none;
		padding: 8px 12px;
		cursor: pointer;
		transition: background-color 0.2s ease, color 0.2s ease;
		border-radius: 6px;
	}

	:global(html:not(.dark)) .account-button {
		color: #1f2937;
	}

	.account-button:hover {
		background: #2a2a2a;
	}

	:global(html:not(.dark)) .account-button:hover {
		background: #f3f4f6;
	}

	.account-button:focus {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: 2px;
	}

	.account-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.username {
		font-size: 0.875rem;
		font-weight: 500;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.dropdown-arrow) {
		transition: transform 0.2s ease;
	}

	:global(.dropdown-arrow.open) {
		transform: rotate(180deg);
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 4px;
		background: #2d2d2d;
		border: 1px solid #404040;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		min-width: 180px;
		z-index: 1000;
		overflow: hidden;
	}

	:global(html:not(.dark)) .dropdown-menu {
		background: #ffffff;
		border-color: #e5e7eb;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 12px 16px;
		background: none;
		border: none;
		color: #e5e7eb;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s ease;
		text-align: left;
	}

	:global(html:not(.dark)) .dropdown-item {
		color: #374151;
	}

	.dropdown-item:hover {
		background: #3a3a3a;
	}

	:global(html:not(.dark)) .dropdown-item:hover {
		background: #f9fafb;
	}

	.dropdown-item.logout-item {
		color: #ef4444;
	}

	.dropdown-item.logout-item:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	.dropdown-divider {
		border: none;
		height: 1px;
		background: #404040;
		margin: 0;
	}

	:global(html:not(.dark)) .dropdown-divider {
		background: #e5e7eb;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.header-content {
			padding: 12px 16px;
		}

		.site-title {
			font-size: 16px;
		}
	}

	/* Show/hide menu buttons based on screen size */
	.desktop-only {
		display: block;
	}

	.mobile-only {
		display: none;
	}

	@media (max-width: 768px) {
		.desktop-only {
			display: none;
		}

		.mobile-only {
			display: block;
		}
	}
</style>