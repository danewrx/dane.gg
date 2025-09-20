<script lang="ts">
	import { onMount } from 'svelte';
	import { siteConfig, loadSiteConfig } from '$lib/stores/siteConfig';
	import WeatherSettings from '$lib/components/admin/WeatherSettings.svelte';
	import { 
		CloudRain,
		Settings as SettingsIcon,
		ChevronRight
	} from 'lucide-svelte';

	// Settings categories - only weather effects
	const settingsCategories = [
		{
			id: 'weather',
			title: 'Weather Effects',
			description: 'Configure rain and snow effects',
			icon: CloudRain,
			color: 'from-blue-500 to-cyan-500',
			bgColor: 'rgba(59, 130, 246, 0.1)',
			borderColor: 'rgba(59, 130, 246, 0.2)',
			path: '/admin/settings/weather'
		}
	];

	let selectedCategory = $state(null);
	let isPanelOpen = $state(false);
	let isClosing = $state(false);

	onMount(() => {
		loadSiteConfig();
	});

	function openSettingsPanel(category) {
		selectedCategory = category;
		isPanelOpen = true;
	}

	function closeSettingsPanel() {
		isClosing = true;
		setTimeout(() => {
			isPanelOpen = false;
			selectedCategory = null;
			isClosing = false;
		}, 300); // Match animation duration
	}

	// Handle escape key
	function handleKeydown(event) {
		if (event.key === 'Escape' && isPanelOpen) {
			closeSettingsPanel();
		}
	}
</script>

<svelte:head>
	<title>Site Settings - dane.gg Admin</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

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

<!-- Settings Panel Overlay -->
{#if isPanelOpen}
	<div class="panel-overlay" onclick={closeSettingsPanel}>
		<div class="settings-panel" class:closing={isClosing} onclick={(e) => e.stopPropagation()}>
			<div class="panel-header">
				<div class="panel-title">
					{#if selectedCategory}
						{#if selectedCategory.icon === CloudRain}
							<CloudRain size={20} />
						{/if}
						<span>{selectedCategory.title}</span>
					{/if}
				</div>
				<button class="close-button" onclick={closeSettingsPanel}>
					×
				</button>
			</div>
			
			<div class="panel-content">
				{#if selectedCategory?.id === 'weather'}
					<WeatherSettings />
				{:else}
					<div class="coming-soon">
						<p>This settings section is coming soon!</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

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
	}

	.header-text p {
		color: #a1a1aa;
		margin: 0;
		font-size: 16px;
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
	}

	.card-content p {
		margin: 0;
		color: #a1a1aa;
		font-size: 14px;
		line-height: 1.4;
	}

	.card-arrow {
		color: #a1a1aa;
		transition: transform 0.2s ease;
		position: relative;
		z-index: 1;
	}

	.settings-card:hover .card-arrow {
		transform: translateX(4px);
	}

	/* Panel Overlay */
	.panel-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		display: flex;
		justify-content: flex-end;
		align-items: stretch;
		backdrop-filter: blur(4px);
	}

	.settings-panel {
		width: 50%;
		background: #1a1a1a;
		border-left: 1px solid #2a2a2a;
		display: flex;
		flex-direction: column;
		animation: slideIn 0.3s ease-out;
	}

	.settings-panel.closing {
		animation: slideOut 0.3s ease-in;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	@keyframes slideOut {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(100%);
		}
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 24px;
		border-bottom: 1px solid #2a2a2a;
	}

	.panel-title {
		display: flex;
		align-items: center;
		gap: 12px;
		color: #ffffff;
		font-size: 18px;
		font-weight: 600;
	}

	.close-button {
		background: none;
		border: none;
		color: #a1a1aa;
		font-size: 24px;
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.close-button:hover {
		background: #2a2a2a;
		color: #ffffff;
	}

	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 24px;
	}

	.coming-soon {
		text-align: center;
		color: #a1a1aa;
		padding: 40px 20px;
	}

	.coming-soon p {
		margin: 0;
		font-size: 16px;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.settings-panel {
			width: 100%;
		}

		.settings-grid {
			grid-template-columns: 1fr;
		}

		.settings-card {
			padding: 20px;
		}
	}
</style>

