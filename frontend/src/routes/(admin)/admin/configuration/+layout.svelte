<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import SlideInPanel from '$lib/admin/components/ui/SlideInPanel.svelte';
	import ConfigurationSidebar, { type ConfigurationCategory } from '$lib/admin/components/ui/ConfigurationSidebar.svelte';
	import { 
		CloudRain,
		Settings as SettingsIcon,
		ChevronRight,
		Link,
		MessageSquare,
		Server,
		Twitter,
		FileText
	} from 'lucide-svelte';

	let { children } = $props();

	const settingsCategories: ConfigurationCategory[] = [
		{
			id: 'weather',
			title: 'Weather Effects',
			description: 'Configure rain and snow effects',
			icon: CloudRain,
			color: 'from-blue-500 to-cyan-500',
			bgColor: 'rgba(59, 130, 246, 0.1)',
			borderColor: 'rgba(59, 130, 246, 0.2)',
			iconBgColor: '#3b82f6', // Blue
			path: '/admin/configuration/weather',
			section: 'general'
		},
		{
			id: 'banner',
			title: 'Scrolling Banner',
			description: 'Configure the scrolling text banner',
			icon: MessageSquare,
			color: 'from-green-500 to-emerald-500',
			bgColor: 'rgba(34, 197, 94, 0.1)',
			borderColor: 'rgba(34, 197, 94, 0.2)',
			iconBgColor: '#22c55e', // Green
			path: '/admin/configuration/banner',
			section: 'general'
		},
		{
			id: 'social-links',
			title: 'Social Links',
			description: 'Manage social media and external links',
			icon: Link,
			color: 'from-purple-500 to-pink-500',
			bgColor: 'rgba(147, 51, 234, 0.1)',
			borderColor: 'rgba(147, 51, 234, 0.2)',
			iconBgColor: '#9333ea', // Purple
			path: '/admin/configuration/social-links',
			section: 'home'
		},
		{
			id: 'service-status',
			title: 'Service Status',
			description: 'Configure service status monitoring from Uptime Kuma',
			icon: Server,
			color: 'from-orange-500 to-red-500',
			bgColor: 'rgba(249, 115, 22, 0.1)',
			borderColor: 'rgba(249, 115, 22, 0.2)',
			iconBgColor: '#f97316', // Orange
			path: '/admin/configuration/service-status',
			section: 'home'
		},
		{
			id: 'twitter',
			title: 'Twitter Integration',
			description: 'Manage Twitter API connection and view tweets',
			icon: Twitter,
			color: 'from-blue-400 to-blue-600',
			bgColor: 'rgba(59, 130, 246, 0.1)',
			borderColor: 'rgba(59, 130, 246, 0.2)',
			iconBgColor: '#60a5fa', // Light blue
			path: '/admin/configuration/twitter',
			section: 'home'
		},
		{
			id: 'biography',
			title: 'Biography',
			description: 'Edit the about page biography content',
			icon: FileText,
			color: 'from-amber-500 to-orange-500',
			bgColor: 'rgba(245, 158, 11, 0.1)',
			borderColor: 'rgba(245, 158, 11, 0.2)',
			iconBgColor: '#f59e0b',
			path: '/admin/configuration/biography',
			section: 'about'
		}
	];

	let selectedCategory: any = $state(null);
	let isPanelOpen = $state(false);

	// Watch for route changes
	$effect(() => {
		checkCurrentRoute();
	});

	function checkCurrentRoute() {
		const currentPath = $page.url.pathname;
		const category = settingsCategories.find(cat => currentPath === cat.path);
		
		if (category) {
			selectedCategory = category;
			// Only open panel on mobile (will be hidden on desktop via CSS)
			isPanelOpen = true;
		} else if (currentPath === '/admin/configuration') {
			if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
				const firstCategory = settingsCategories[0];
				if (firstCategory) {
					goto(firstCategory.path);
					return;
				}
			}
			selectedCategory = null;
			isPanelOpen = false;
		} else {
			selectedCategory = null;
			isPanelOpen = false;
		}
	}

	function openSettingsPanel(category: any) {
		// Navigate to the specific settings route
		goto(category.path);
	}

	function closeSettingsPanel() {
		// Navigate back to the main settings page
		goto('/admin/configuration');
	}
</script>

<div class="settings-container desktop-layout">
	<!-- Sidebar -->
	<ConfigurationSidebar 
		categories={settingsCategories}
		selectedCategoryId={selectedCategory?.id || null}
		onItemClick={openSettingsPanel}
	/>

	<!-- Content Area -->
	<main class="settings-content">
		{#if selectedCategory}
			<div class="settings-page-content">
				<h1 class="page-title">
					{#if selectedCategory.icon === CloudRain}
						<CloudRain size={18} />
					{:else if selectedCategory.icon === Link}
						<Link size={18} />
					{:else if selectedCategory.icon === MessageSquare}
						<MessageSquare size={18} />
					{:else if selectedCategory.icon === Server}
						<Server size={18} />
					{:else if selectedCategory.icon === Twitter}
						<Twitter size={18} />
					{:else if selectedCategory.icon === FileText}
						<FileText size={18} />
					{/if}
					{selectedCategory.title}
				</h1>
				{@render children?.()}
			</div>
		{:else}
			<div class="empty-state">
				<SettingsIcon size={48} />
				<h2>Select a setting category</h2>
				<p>Choose an option from the sidebar to configure</p>
			</div>
		{/if}
	</main>
</div>


<div class="mobile-layout">
	<div class="mobile-settings-container">
		<ConfigurationSidebar 
			categories={settingsCategories}
			selectedCategoryId={selectedCategory?.id || null}
			onItemClick={openSettingsPanel}
		/>
	</div>
</div>

<div class="mobile-panel">
	<SlideInPanel 
		isOpen={isPanelOpen}
		title={selectedCategory?.title || ''}
		icon={selectedCategory?.icon || null}
		showCloseButton={true}
		on:close={closeSettingsPanel}
	>
		{#if selectedCategory}
			<!-- Render the specific settings page content -->
			<div class="settings-page-content">
				{@render children?.()}
			</div>
		{/if}
	</SlideInPanel>
</div>

<style>
	.desktop-layout {
		display: none !important;
	}

	.settings-container {
		display: flex;
		height: calc(100vh - var(--admin-header-height, 64px));
		overflow: hidden;
		margin: -24px;
		padding: 0;
		width: calc(100% + 48px);
		position: relative;
	}


	.settings-content {
		flex: 1;
		overflow-y: auto;
		background: var(--bg-primary, #1a1a1a);
		padding: 32px;
	}

	.page-title {
		color: var(--text-primary, #ffffff);
		margin: 0 0 24px 0;
		font-size: 20px;
		font-weight: 600;
		line-height: 1.4;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.page-title :global(svg) {
		color: var(--text-secondary, #a1a1aa);
		flex-shrink: 0;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		color: var(--text-secondary, #a1a1aa);
	}

	.empty-state :global(svg) {
		margin-bottom: 16px;
		opacity: 0.5;
	}

	.empty-state h2 {
		color: var(--text-primary, #ffffff);
		margin: 0 0 8px 0;
		font-size: 24px;
		font-weight: 600;
	}

	.empty-state p {
		margin: 0;
		font-size: 16px;
	}

	.mobile-layout {
		display: block;
	}

	.mobile-settings-container {
		width: 100%;
		max-width: 100%;
	}

	.settings-page-content {
		padding: 0;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.mobile-panel {
		display: block;
	}

	@media (min-width: 1024px) {
		.desktop-layout {
			display: flex !important;
		}

		.mobile-layout {
			display: none !important;
		}

		.mobile-panel {
			display: none !important;
		}
	}

	/* Mobile: List menu + slide-in panel */
	@media (max-width: 1023px) {
		.desktop-layout {
			display: none !important;
		}

		.mobile-layout {
			display: block !important;
		}
	}
</style>
