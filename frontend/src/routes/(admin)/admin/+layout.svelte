<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { goto } from '$app/navigation';
	import { authService } from '$lib/admin/services/auth';
	import { onMount } from 'svelte';
	import AdminHeader from '$lib/admin/components/layout/AdminHeader.svelte';
	import AdminSidebar from '$lib/admin/components/layout/AdminSidebar.svelte';
	import AdminMobileAppBar from '$lib/admin/components/layout/AdminMobileAppBar.svelte';
	import AdminMobileSidebar from '$lib/admin/components/layout/AdminMobileSidebar.svelte';
	import { Toaster } from 'svelte-sonner';
	import { ModeWatcher, mode } from 'mode-watcher';
	import '$lib/admin/theme/admin-accent.css';

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
			logger.error('Logout failed:', error);
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
	<title>{adminPageTitle('Admin')}</title>
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

	<!-- Toast Notifications -->
	<Toaster
		theme={mode.current === 'light' ? 'light' : 'dark'}
		position="top-right"
		closeButton
		expand
		visibleToasts={5}
		toastOptions={{
			style: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
			duration: 4000,
			classes: {
				success: 'sonner-success-accent',
				error: 'sonner-error',
				warning: 'sonner-warning',
				info: 'sonner-info',
				actionButton: 'sonner-action-accent',
				cancelButton: 'sonner-cancel-accent'
			}
		}}
	/>
</div>

<!-- Theme mode watcher -->
<ModeWatcher track={true} />

<style>
	.admin-layout {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #1a1a1a;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		color: #ffffff;
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
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

	/* CSS Variables for components */
	:global(:root) {
		--bg-primary: #1a1a1a;
		--bg-secondary: #2d2d2d;
		--bg-tertiary: #3a3a3a;
		--bg-hover: #404040;
		--text-primary: #ffffff;
		--text-secondary: #a1a1aa;
		--border-color: #404040;
		--accent-color: #3b82f6;
		--accent-bg: #3b82f6;
		--accent-fg: #ffffff;
		--accent-bg-hover: #2563eb;
		--accent-fg-hover: #ffffff;
		--accent-on-surface: #3b82f6;
		--accent-muted-bg: rgba(59, 130, 246, 0.1);
		--accent-muted-fg: #3b82f6;
		--accent-color-light: rgba(59, 130, 246, 0.1);
		--accent-color-medium: rgba(59, 130, 246, 0.2);
		--accent-color-dark: #2563eb;
		--accent-color-contrast: #ffffff;
		--accent-color-dark-contrast: #ffffff;
	}

	:global(html:not(.dark)) {
		--bg-primary: #ffffff;
		--bg-secondary: #f8fafc;
		--bg-tertiary: #f1f5f9;
		--bg-hover: #e2e8f0;
		--text-primary: #1f2937;
		--text-secondary: #6b7280;
		--border-color: #e5e7eb;
	}

	/* Global accent color applications */
	:global(.btn-primary),
	:global(.create-button),
	:global(.save-button--accent) {
		background: var(--accent-bg, var(--accent-color, #3b82f6)) !important;
		border-color: var(--accent-bg, var(--accent-color, #3b82f6)) !important;
		color: var(--accent-fg) !important;
	}

	:global(.btn-primary:hover),
	:global(.create-button:hover:not(:disabled)),
	:global(.save-button--accent:hover:not(:disabled)) {
		background: var(--accent-bg-hover, var(--accent-color-dark, #2563eb)) !important;
		border-color: var(--accent-bg-hover, var(--accent-color-dark, #2563eb)) !important;
		color: var(--accent-fg-hover, var(--accent-fg)) !important;
	}

	:global(.btn-primary:focus) {
		box-shadow: 0 0 0 2px var(--accent-color-medium, rgba(59, 130, 246, 0.2)) !important;
	}

	:global(.link-accent) {
		color: var(--accent-on-surface, var(--accent-color, #3b82f6)) !important;
	}

	:global(.link-accent:hover) {
		color: var(--accent-bg-hover, var(--accent-color-dark, #2563eb)) !important;
	}

	:global(.border-accent) {
		border-color: var(--accent-border, var(--accent-color, #3b82f6)) !important;
	}

	:global(.text-accent) {
		color: var(--accent-on-surface, var(--accent-color, #3b82f6)) !important;
	}

	:global(.bg-accent) {
		background-color: var(--accent-bg, var(--accent-color, #3b82f6)) !important;
		color: var(--accent-fg) !important;
	}

	:global(.bg-accent-light) {
		background-color: var(--accent-muted-bg, var(--accent-color-light, rgba(59, 130, 246, 0.1))) !important;
		color: var(--accent-muted-fg, var(--accent-on-surface, #3b82f6)) !important;
	}

	/* Icons and chips that use raw accent on a surface */
	:global(.accent-on-surface) {
		color: var(--accent-on-surface, var(--accent-color, #3b82f6)) !important;
	}

	:global(.accent-muted-surface) {
		background: var(--accent-muted-bg, var(--accent-color-light, rgba(59, 130, 246, 0.1))) !important;
		color: var(--accent-muted-fg, var(--accent-on-surface, #3b82f6)) !important;
	}

	:global(.bg-accent-dark) {
		background-color: var(--accent-bg-hover, var(--accent-color-dark, #2563eb)) !important;
		color: var(--accent-fg-hover, var(--accent-fg)) !important;
	}

	/* Input focus states */
	:global(input:focus),
	:global(textarea:focus),
	:global(select:focus) {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: 2px;
		border-color: var(--accent-color, #3b82f6);
	}

	/* Button focus states */
	:global(button:focus) {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: 2px;
	}

	/* General toast styling - ensure solid backgrounds (non-accent success toasts) */
	:global([data-sonner-toast]:not(.sonner-success-accent)) {
		background: #1f2937 !important;
		color: white !important;
		border: 1px solid rgba(255, 255, 255, 0.1) !important;
	}

	/* Default toast types with solid backgrounds */
	:global([data-sonner-toast][data-type='success']:not(.sonner-success-accent)) {
		background: #22c55e !important;
		color: white !important;
	}

	:global([data-sonner-toast][data-type='error']) {
		background: #ef4444 !important;
		color: white !important;
	}

	:global([data-sonner-toast][data-type='warning']) {
		background: #f59e0b !important;
		color: white !important;
	}

	:global([data-sonner-toast][data-type='info']) {
		background: #3b82f6 !important;
		color: white !important;
	}

	/* Accent success toasts: see admin-accent.css (title + description use --accent-fg) */

	/* Error toasts */
	:global(.sonner-error[data-type='error']) {
		background: #ef4444 !important;
		border-left: 4px solid #dc2626 !important;
		color: white !important;
	}

	:global(.sonner-error[data-type='error'] [data-icon]) {
		color: white !important;
	}

	/* Warning toasts */
	:global(.sonner-warning[data-type='warning']) {
		background: #f59e0b !important;
		border-left: 4px solid #d97706 !important;
		color: white !important;
	}

	:global(.sonner-warning[data-type='warning'] [data-icon]) {
		color: white !important;
	}

	/* Info toasts */
	:global(.sonner-info[data-type='info']) {
		background: #3b82f6 !important;
		border-left: 4px solid #2563eb !important;
		color: white !important;
	}

	:global(.sonner-info[data-type='info'] [data-icon]) {
		color: white !important;
	}

	:global(.sonner-action-accent) {
		background: var(--accent-bg, var(--accent-color, #3b82f6)) !important;
		color: var(--accent-fg) !important;
		border: 1px solid var(--accent-color, #3b82f6) !important;
	}

	:global(.sonner-action-accent:hover) {
		background: var(--accent-bg-hover, var(--accent-color-dark, #2563eb)) !important;
		border-color: var(--accent-color-dark, #2563eb) !important;
	}

	:global(.sonner-cancel-accent) {
		border: 1px solid var(--accent-color-light, rgba(59, 130, 246, 0.3)) !important;
		color: var(--accent-on-surface, var(--accent-color, #3b82f6)) !important;
	}

	:global(.sonner-cancel-accent:hover) {
		background: var(--accent-color-light, rgba(59, 130, 246, 0.1)) !important;
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
