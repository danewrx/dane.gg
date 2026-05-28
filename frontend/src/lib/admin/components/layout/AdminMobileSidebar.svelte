<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { X } from 'lucide-svelte';

	let { isOpen = false, onClose, items = [] } = $props();

	// Use the dynamic items passed from the app bar
	const allNavItems = $derived(items || []);

	const navItems = $derived(allNavItems.filter((item) => item.id !== 'settings'));
	const settingsItem = $derived(allNavItems.find((item) => item.id === 'settings'));

	let isClosing = $state(false);
	let startX = $state(0);
	let currentX = $state(0);
	let isDragging = $state(false);
	let dragProgress = $state(0);

	// Check if a nav item is active
	function isActive(path: string): boolean {
		const currentPath = $page.url.pathname;
		return currentPath === path || currentPath.startsWith(path + '/');
	}

	// Handle navigation
	function handleNavigation(path: string) {
		goto(path);
		closeSidebar();
	}

	// Close sidebar with animation
	function closeSidebar() {
		isClosing = true;
		setTimeout(() => {
			isClosing = false;
			onClose();
		}, 200);
	}

	// Touch event handlers
	function handleTouchStart(event: TouchEvent) {
		if (!isOpen) return;

		startX = event.touches[0].clientX;
		isDragging = true;
		// Don't prevent default to avoid passive event warning
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isDragging || !isOpen) return;

		currentX = event.touches[0].clientX;
		const deltaX = startX - currentX; // Inverted for left-side dragging

		// Only allow dragging to the left (closing)
		if (deltaX > 0) {
			dragProgress = Math.min(deltaX / 200, 1); // 200px to fully close
		}

		// Don't prevent default to avoid passive event warning
	}

	function handleTouchEnd(_event: TouchEvent) {
		if (!isDragging) return;

		isDragging = false;
		const deltaX = startX - currentX; // Inverted for left-side dragging

		// If dragged more than 100px, close the sidebar
		if (deltaX > 100) {
			closeSidebar();
		} else {
			// Snap back
			dragProgress = 0;
		}
	}

	// Mouse event handlers for desktop testing
	function handleMouseDown(event: MouseEvent) {
		if (!isOpen) return;

		startX = event.clientX;
		isDragging = true;
		event.preventDefault();
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging || !isOpen) return;

		currentX = event.clientX;
		const deltaX = startX - currentX; // Inverted for left-side dragging

		if (deltaX > 0) {
			dragProgress = Math.min(deltaX / 200, 1);
		}

		event.preventDefault();
	}

	function handleMouseUp(_event: MouseEvent) {
		if (!isDragging) return;

		isDragging = false;
		const deltaX = startX - currentX; // Inverted for left-side dragging

		if (deltaX > 100) {
			closeSidebar();
		} else {
			dragProgress = 0;
		}
	}

	// Reset drag state when sidebar closes
	$effect(() => {
		if (!isOpen) {
			dragProgress = 0;
			isDragging = false;
		}
	});

	// Calculate transform based on drag progress
	const transform = $derived(() => {
		if (isDragging) {
			return `translateX(${-dragProgress * 100}%)`; // Negative for left-side
		}
		return isOpen ? 'translateX(0)' : 'translateX(-100%)';
	});

	// Calculate opacity for backdrop
	const backdropOpacity = $derived(() => {
		if (isDragging) {
			return 0.5 * (1 - dragProgress);
		}
		return isOpen ? 0.5 : 0;
	});
</script>

<!-- Backdrop -->
{#if isOpen || isDragging}
	<div
		class="sidebar-backdrop"
		class:closing={isClosing}
		style:opacity={backdropOpacity()}
		role="button"
		tabindex="0"
		aria-label="Close menu"
		onclick={closeSidebar}
		onkeydown={(e) => e.key === 'Enter' && closeSidebar()}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="mobile-sidebar"
	class:open={isOpen}
	class:closing={isClosing}
	class:dragging={isDragging}
	style:transform={transform()}
	role="navigation"
	aria-label="Mobile navigation menu"
>
	<div
		class="sidebar-header"
		role="button"
		tabindex="0"
		aria-label="Drag to close menu"
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		style="touch-action: none;"
	>
		<h2 class="sidebar-title">Menu ({navItems.length} items)</h2>
		<button class="close-button" onclick={closeSidebar} aria-label="Close menu">
			<X size={24} />
		</button>
	</div>

	<nav class="sidebar-nav">
		<ul class="nav-list">
			{#if navItems.length > 0}
				{#each navItems as item (item.id)}
					{@const IconComponent = item.icon}
					<li class="nav-item">
						<button
							class="nav-link"
							class:active={isActive(item.path)}
							onclick={() => handleNavigation(item.path)}
							aria-current={isActive(item.path) ? 'page' : undefined}
						>
							<div class="nav-icon">
								<IconComponent size={20} />
							</div>
							<span class="nav-label">{item.label}</span>
						</button>
					</li>
				{/each}
			{:else}
				<li class="nav-item">
					<div class="no-items">No additional links</div>
				</li>
			{/if}
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
					>
						<div class="nav-icon">
							<SettingsIcon size={20} />
						</div>
						<span class="nav-label">{settingsItem.label}</span>
					</button>
				</li>
			</ul>
		{/if}
	</nav>
</aside>

<style>
	.sidebar-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
		transition: opacity 0.2s ease;
	}

	.sidebar-backdrop.closing {
		opacity: 0;
	}

	.mobile-sidebar {
		position: fixed;
		top: 0;
		left: 0;
		width: 280px;
		height: 100vh;
		background: #1a1a1a;
		border-right: 1px solid #2a2a2a;
		z-index: 1000;
		display: flex;
		flex-direction: column;
		transform: translateX(-100%);
		transition:
			transform 0.2s ease,
			background-color 0.2s ease,
			border-color 0.2s ease;
		overflow: hidden;
	}

	:global(html:not(.dark)) .mobile-sidebar {
		background: #ffffff;
		border-right-color: #e5e7eb;
	}

	.mobile-sidebar.open {
		transform: translateX(0);
	}

	.mobile-sidebar.closing {
		transform: translateX(-100%);
	}

	.mobile-sidebar.dragging {
		transition: none;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid #2a2a2a;
		flex-shrink: 0;
		transition: border-color 0.2s ease;
	}

	:global(html:not(.dark)) .sidebar-header {
		border-bottom-color: #e5e7eb;
	}

	.sidebar-title {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: #ffffff;
		transition: color 0.2s ease;
	}

	:global(html:not(.dark)) .sidebar-title {
		color: #1f2937;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		color: #ffffff;
		border: none;
		padding: 8px;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
		border-radius: 4px;
	}

	:global(html:not(.dark)) .close-button {
		color: #1f2937;
	}

	.close-button:hover {
		background: #2a2a2a;
	}

	:global(html:not(.dark)) .close-button:hover {
		background: #f3f4f6;
	}

	.close-button:focus {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: 2px;
	}

	.sidebar-nav {
		flex: 1;
		overflow-y: auto;
		padding: 0;
		display: flex;
		flex-direction: column;
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
		gap: 16px;
		width: 100%;
		padding: 16px 24px;
		background: none;
		border: none;
		color: #ffffff;
		text-align: left;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
		font-size: 16px;
		font-weight: 400;
	}

	:global(html:not(.dark)) .nav-link:not(.active) {
		color: #1f2937;
	}

	.nav-link:hover {
		background: #2a2a2a;
	}

	:global(html:not(.dark)) .nav-link:hover {
		background: #f3f4f6;
	}

	.nav-link.active {
		background: var(--accent-bg, var(--accent-color, #3b82f6));
		color: var(--accent-fg);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.nav-link.active:hover {
		background: var(--accent-bg-hover, var(--accent-color-dark, #2563eb));
		color: var(--accent-fg-hover, var(--accent-fg));
	}

	.nav-link:focus {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: -2px;
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		flex-shrink: 0;
	}

	.nav-label {
		font-size: 16px;
		font-weight: 400;
	}

	.no-items {
		padding: 16px 24px;
		color: #888;
		text-align: center;
		font-style: italic;
	}

	/* Only show on mobile */
	@media (min-width: 769px) {
		.mobile-sidebar {
			display: none;
		}

		.sidebar-backdrop {
			display: none;
		}
	}
</style>
