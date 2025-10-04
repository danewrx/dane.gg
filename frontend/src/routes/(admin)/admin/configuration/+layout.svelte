<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import SlideInPanel from '$lib/admin/components/ui/SlideInPanel.svelte';
	import { 
		CloudRain,
		Settings as SettingsIcon,
		ChevronRight,
		Link
	} from 'lucide-svelte';

	let { children } = $props();

	const settingsCategories = [
		{
			id: 'weather',
			title: 'Weather Effects',
			description: 'Configure rain and snow effects',
			icon: CloudRain,
			color: 'from-blue-500 to-cyan-500',
			bgColor: 'rgba(59, 130, 246, 0.1)',
			borderColor: 'rgba(59, 130, 246, 0.2)',
			path: '/admin/configuration/weather'
		},
		{
			id: 'social-links',
			title: 'Social Links',
			description: 'Manage social media and external links',
			icon: Link,
			color: 'from-purple-500 to-pink-500',
			bgColor: 'rgba(147, 51, 234, 0.1)',
			borderColor: 'rgba(147, 51, 234, 0.2)',
			path: '/admin/configuration/social-links'
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
			isPanelOpen = true;
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

<!-- Main Settings Page Content -->
<div class="settings-page">
	<header class="page-header">
		<div class="header-content">
			<div class="header-text">
				<h1>Site Settings</h1>
				<p>Configure your website settings and preferences</p>
			</div>
			<div class="header-icon">
				<SettingsIcon size={24} />
			</div>
		</div>
	</header>

	<div class="settings-grid">
		{#each settingsCategories as category (category.id)}
			<button 
				class="settings-card"
				onclick={() => openSettingsPanel(category)}
				style="--bg-color: {category.bgColor}; --border-color: {category.borderColor};"
			>
				<div class="card-icon" class:icon-gradient={category.color}>
					{#if category.icon === CloudRain}
						<CloudRain size={24} />
					{/if}
				</div>
				<div class="card-content">
					<h3>{category.title}</h3>
					<p>{category.description}</p>
				</div>
				<div class="card-arrow">
					<ChevronRight size={20} />
				</div>
			</button>
		{/each}
	</div>
</div>

<!-- Settings Panel -->
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

<style>
	.settings-page {
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 32px;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-text h1 {
		color: #ffffff;
		margin: 0 0 8px 0;
		font-size: 28px;
		font-weight: 600;
		transition: color 0.2s ease;
	}

	
	:global(html:not(.dark)) .header-text h1 {
		color: #1f2937;
	}

	.header-text p {
		color: #a1a1aa;
		margin: 0;
		font-size: 16px;
		transition: color 0.2s ease;
	}

	
	:global(html:not(.dark)) .header-text p {
		color: #6b7280;
	}

	.header-icon {
		color: #6366f1;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 20px;
	}

	.settings-card {
		background: var(--bg-color);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 24px;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		display: flex;
		align-items: center;
		gap: 16px;
		position: relative;
		overflow: hidden;
	}

	.settings-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
		pointer-events: none;
	}

	.settings-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
	}

	.card-icon {
		width: 48px;
		height: 48px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		flex-shrink: 0;
		position: relative;
		z-index: 1;
	}

	.card-icon.icon-gradient {
		background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
	}

	.card-content {
		flex: 1;
		position: relative;
		z-index: 1;
	}

	.card-content h3 {
		margin: 0 0 4px 0;
		font-size: 18px;
		font-weight: 600;
		color: #ffffff;
		transition: color 0.2s ease;
	}

	
	:global(html:not(.dark)) .card-content h3 {
		color: #1f2937;
	}

	.card-content p {
		margin: 0;
		color: #a1a1aa;
		font-size: 14px;
		line-height: 1.4;
		transition: color 0.2s ease;
	}

	
	:global(html:not(.dark)) .card-content p {
		color: #6b7280;
	}

	.card-arrow {
		color: #a1a1aa;
		transition: transform 0.2s ease, color 0.2s ease;
		position: relative;
		z-index: 1;
	}

	
	:global(html:not(.dark)) .card-arrow {
		color: #6b7280;
	}

	.settings-card:hover .card-arrow {
		transform: translateX(4px);
	}

	.settings-page-content {
		padding: 0;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.settings-grid {
			grid-template-columns: 1fr;
		}

		.settings-card {
			padding: 20px;
		}
	}
</style>
