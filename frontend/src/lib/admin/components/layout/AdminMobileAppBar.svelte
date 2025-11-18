<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { adminNavigation } from '$lib/admin/config/navigation';
	import { user } from '$lib/admin/stores/auth';

	// Filter navigation items based on user admin status
	const navItems = $derived(
		adminNavigation.filter(item => {
			if (item.id === 'users') {
				return $user?.isAdmin ?? false;
			}
			return true;
		})
	);

	// Calculate how many items can fit based on screen width
	function calculateMaxItems() {
		// Default to navItems.length if window not available (SSR)
		if (typeof window === 'undefined') return navItems.length;
		
		const screenWidth = window.innerWidth;
		const itemWidth = 80; // Conservative estimate
		const availableWidth = screenWidth - 40; // Account for padding
		const calculatedItems = Math.floor(availableWidth / itemWidth);
		// Allow up to the total number of nav items in the app bar
		const maxItems = Math.max(2, Math.min(calculatedItems, navItems.length));
		
		
		return maxItems;
	}

	// Initialize with calculated value
	let maxVisibleItems = $state(calculateMaxItems());
	

	// Simple derived values
	const visibleItems = $derived(navItems.slice(0, maxVisibleItems));
	const sidebarItems = $derived(navItems.slice(maxVisibleItems));

	// Update function for resize events
	function updateItemCount() {
		const newMaxItems = calculateMaxItems();
		maxVisibleItems = newMaxItems;
	}

	// Handle requests for sidebar updates
	function handleSidebarUpdateRequest() {
		window.dispatchEvent(new CustomEvent('updateSidebarItems', {
			detail: { items: sidebarItems }
		}));
	}

	// Initial calculation and resize listener
	$effect(() => {
		// Recalculate on mount in case initial calculation was wrong
		updateItemCount();
		
		let timeoutId: ReturnType<typeof setTimeout>;
		const throttledUpdate = () => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(updateItemCount, 100);
		};
		
		window.addEventListener('resize', throttledUpdate);
		window.addEventListener('requestSidebarUpdate', handleSidebarUpdateRequest);
		
		return () => {
			window.removeEventListener('resize', throttledUpdate);
			window.removeEventListener('requestSidebarUpdate', handleSidebarUpdateRequest);
			clearTimeout(timeoutId);
		};
	});

	// Dispatch sidebar items when they change
	$effect(() => {
		// Small delay to ensure layout is mounted and listening
		setTimeout(() => {
			window.dispatchEvent(new CustomEvent('updateSidebarItems', {
				detail: { items: sidebarItems }
			}));
		}, 0);
	});

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

<!-- Mobile App Bar -->
<nav class="mobile-app-bar">
	<div class="app-bar-content">
		
		{#each visibleItems as item (item.id)}
			{@const IconComponent = item.icon}
			<button
				class="nav-item"
				class:active={isActive(item.path)}
				onclick={() => handleNavigation(item.path)}
				aria-current={isActive(item.path) ? 'page' : undefined}
				title={item.label}
			>
				<div class="nav-icon">
					<IconComponent size={20} />
				</div>
				<span class="nav-label">{item.label}</span>
			</button>
		{/each}
	</div>
</nav>

<style>
	.mobile-app-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: #2a2a2a;
		border-top: 1px solid #3a3a3a;
		z-index: 1000;
		display: none; /* Hidden by default, shown on mobile */
		transition: background-color 0.2s ease, border-color 0.2s ease;
	}

	
	:global(html:not(.dark)) .mobile-app-bar {
		background: #ffffff;
		border-top-color: #e5e7eb;
	}

	.app-bar-content {
		display: flex;
		justify-content: space-around;
		align-items: center;
		padding: 8px 0;
		max-width: 100%;
		overflow-x: auto;
	}


	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: #ffffff;
		cursor: pointer;
		transition: all 0.2s ease;
		padding: 8px 12px;
		border-radius: 8px;
		min-width: 60px;
		flex-shrink: 0;
	}

	
	:global(html:not(.dark)) .nav-item {
		color: #1f2937;
	}

	.nav-item:hover {
		background: #3a3a3a;
	}

	
	:global(html:not(.dark)) .nav-item:hover {
		background: #f3f4f6;
	}

	.nav-item.active {
		background: var(--accent-color, #3b82f6);
		color: var(--accent-color-contrast, white);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.nav-item.active:hover {
		background: var(--accent-color-dark, #2563eb);
		color: var(--accent-color-dark-contrast, white);
	}

	.nav-item:focus {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: 2px;
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 4px;
	}

	.nav-label {
		font-size: 11px;
		font-weight: 500;
		text-align: center;
		line-height: 1.2;
		white-space: nowrap;
	}

	/* Show on mobile only */
	@media (max-width: 768px) {
		.mobile-app-bar {
			display: block !important;
		}
	}

	/* Adjust for very small screens */
	@media (max-width: 480px) {
		.nav-item {
			padding: 6px 8px;
			min-width: 50px;
		}
		
		.nav-label {
			font-size: 10px;
		}
		
		.nav-icon {
			margin-bottom: 2px;
		}
	}
</style>
