<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { MoreHorizontal } from 'lucide-svelte';
	import { adminNavigation } from '$lib/admin/config/navigation';
	import { user } from '$lib/admin/stores/auth';

	const BAR_PADDING_X = 16;
	const MIN_SLOT_WIDTH = 84;

	// Filter navigation items based on user admin status
	const navItems = $derived(
		adminNavigation.filter((item) => {
			if (item.id === 'users') {
				return $user?.isAdmin ?? false;
			}
			return true;
		})
	);

	let viewportWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 360);
	let showMoreTray = $state(false);

	function computeMaxSlots(width: number): number {
		const inner = Math.max(280, width - BAR_PADDING_X * 2);
		return Math.max(2, Math.floor(inner / MIN_SLOT_WIDTH));
	}

	const maxSlotsInViewport = $derived(computeMaxSlots(viewportWidth));

	const needsMore = $derived(navItems.length > maxSlotsInViewport);

	const barItemCount = $derived(needsMore ? Math.max(1, maxSlotsInViewport - 1) : navItems.length);

	const barItems = $derived(navItems.slice(0, barItemCount));
	const overflowItems = $derived(navItems.slice(barItemCount));

	function isActive(path: string): boolean {
		const currentPath = $page.url.pathname;
		return currentPath === path || currentPath.startsWith(path + '/');
	}

	const moreTrayActive = $derived(overflowItems.some((item) => isActive(item.path)));

	function handleNavigation(path: string) {
		closeMoreTray();
		goto(path);
	}

	function openMoreTray() {
		showMoreTray = true;
	}

	function closeMoreTray() {
		showMoreTray = false;
	}

	function toggleMoreTray() {
		showMoreTray = !showMoreTray;
	}

	function onResize() {
		viewportWidth = window.innerWidth;
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		onResize();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	$effect(() => {
		if (!needsMore) showMoreTray = false;
	});

	/** Keep mobile hamburger hidden: overflow lives in the More tray only */
	$effect(() => {
		if (typeof window === 'undefined') return;
		const id = setTimeout(() => {
			window.dispatchEvent(new CustomEvent('updateSidebarItems', { detail: { items: [] } }));
		}, 0);
		return () => clearTimeout(id);
	});

	function onGlobalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeMoreTray();
	}
</script>

<svelte:window onkeydown={onGlobalKeydown} />

{#if showMoreTray}
	<button type="button" class="more-backdrop" onclick={closeMoreTray} aria-label="Close menu"
	></button>
	<div
		class="more-sheet"
		role="dialog"
		aria-modal="true"
		aria-label="More navigation"
		tabindex="-1"
		onkeydown={(e) => e.stopPropagation()}
	>
		<div class="more-sheet-handle" aria-hidden="true"></div>
		<p class="more-sheet-title">More</p>
		<div class="more-grid">
			{#each overflowItems as item (item.id)}
				{@const IconComponent = item.icon}
				<button
					type="button"
					class="more-grid-item"
					class:active={isActive(item.path)}
					onclick={() => handleNavigation(item.path)}
					aria-current={isActive(item.path) ? 'page' : undefined}
				>
					<div class="more-grid-icon">
						<IconComponent size={22} />
					</div>
					<span class="more-grid-label">{item.label}</span>
				</button>
			{/each}
		</div>
	</div>
{/if}

<!-- Mobile App Bar -->
<nav class="mobile-app-bar" aria-label="Primary mobile admin navigation">
	<div class="app-bar-content">
		{#each barItems as item (item.id)}
			{@const IconComponent = item.icon}
			<button
				type="button"
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
		{#if needsMore}
			<button
				type="button"
				class="nav-item nav-item-more"
				class:active={moreTrayActive}
				onclick={toggleMoreTray}
				aria-expanded={showMoreTray}
				aria-haspopup="dialog"
				title="More destinations"
			>
				<div class="nav-icon">
					<MoreHorizontal size={22} />
				</div>
				<span class="nav-label">More</span>
			</button>
		{/if}
	</div>
</nav>

<style>
	/* Height of bottom tab bar; tray sits above it */
	.more-backdrop,
	.more-sheet {
		--admin-mobile-nav-height: calc(56px + env(safe-area-inset-bottom, 0px));
	}

	.more-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: var(--admin-mobile-nav-height);
		z-index: 1001;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		background: rgba(0, 0, 0, 0.45);
		animation: fade-in 0.2s ease;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.more-sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: var(--admin-mobile-nav-height);
		z-index: 1002;
		background: #2a2a2a;
		border-top: 1px solid #3a3a3a;
		border-radius: 16px 16px 0 0;
		padding: 12px 16px 16px;
		max-height: min(58vh, 400px);
		overflow-y: auto;
		box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.35);
		animation: sheet-up 0.22s ease-out;
	}

	@keyframes sheet-up {
		from {
			transform: translateY(110%);
			opacity: 0.88;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	:global(html:not(.dark)) .more-sheet {
		background: #ffffff;
		border-top-color: #e5e7eb;
		box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
	}

	.more-sheet-handle {
		width: 40px;
		height: 4px;
		border-radius: 2px;
		background: #52525b;
		margin: 4px auto 12px;
	}

	:global(html:not(.dark)) .more-sheet-handle {
		background: #cbd5e1;
	}

	.more-sheet-title {
		margin: 0 4px 12px;
		font-size: 13px;
		font-weight: 600;
		color: #a1a1aa;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	:global(html:not(.dark)) .more-sheet-title {
		color: #64748b;
	}

	.more-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
		gap: 10px;
	}

	.more-grid-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 14px 10px;
		border: 1px solid #3a3a3a;
		border-radius: 12px;
		background: #242424;
		color: #ffffff;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
		min-height: 88px;
	}

	:global(html:not(.dark)) .more-grid-item {
		background: #f8fafc;
		border-color: #e5e7eb;
		color: #1f2937;
	}

	.more-grid-item:hover {
		background: #2f2f2f;
		border-color: #52525b;
	}

	:global(html:not(.dark)) .more-grid-item:hover {
		background: #f1f5f9;
	}

	.more-grid-item.active {
		background: var(--accent-color, #3b82f6);
		border-color: var(--accent-color-dark, #2563eb);
		color: var(--accent-color-contrast, white);
	}

	.more-grid-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.more-grid-label {
		font-size: 11px;
		font-weight: 500;
		text-align: center;
		line-height: 1.25;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.mobile-app-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: #2a2a2a;
		border-top: 1px solid #3a3a3a;
		z-index: 1003;
		display: none;
		padding-bottom: env(safe-area-inset-bottom, 0px);
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
	}

	:global(html:not(.dark)) .mobile-app-bar {
		background: #ffffff;
		border-top-color: #e5e7eb;
	}

	.app-bar-content {
		display: flex;
		align-items: stretch;
		justify-content: space-evenly;
		padding: 8px 4px;
		max-width: 100%;
		gap: 2px;
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1 1 0;
		min-width: 0;
		background: none;
		border: none;
		color: #ffffff;
		cursor: pointer;
		transition: all 0.2s ease;
		padding: 8px 4px;
		border-radius: 8px;
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

	.nav-item:focus-visible {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: 2px;
	}

	.nav-item-more.active {
		background: var(--accent-color, #3b82f6);
		color: var(--accent-color-contrast, white);
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 4px;
		flex-shrink: 0;
	}

	.nav-label {
		font-size: 10px;
		font-weight: 500;
		text-align: center;
		line-height: 1.2;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		word-break: break-word;
		hyphens: auto;
	}

	@media (max-width: 768px) {
		.mobile-app-bar {
			display: block !important;
		}
	}

	@media (max-width: 480px) {
		.nav-item {
			padding: 6px 2px;
		}

		.nav-label {
			font-size: 9px;
		}

		.nav-icon {
			margin-bottom: 2px;
		}
	}
</style>
