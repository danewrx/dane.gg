<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

interface SocialLink {
	id: string;
	name: string;
	url: string;
	iconType: 'coreui-brand' | 'svg-url' | 'custom-text';
	iconName?: string;
	iconText?: string;
	svgUrl?: string;
	displayOrder: number;
	isActive: boolean;
}


	let socialLinks: SocialLink[] = $state([]);
	let isLoading = $state(true);

	onMount(async () => {
		try {
			const response = await fetch('/api/social-links');
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			const data = await response.json();

			if (data.success && data.data) {
				socialLinks = data.data;
			}
		} catch (error) {
			console.error('Error loading social links:', error);
		} finally {
			isLoading = false;
		}
	});

	function handleLinkClick(url: string) {
		window.open(url, '_blank', 'noopener,noreferrer');
	}
</script>

{#if isLoading}
	<div class="links-container">
		<div class="loading">
			<div class="loading-spinner"></div>
		</div>
	</div>
{:else if socialLinks.length > 0}
	<div class="links-container">
		<div class="links-grid">
			{#each socialLinks as link, index}
				<button 
					class="link-item" 
					onclick={() => handleLinkClick(link.url)}
					aria-label={link.name}
					title={link.name}
				>
					{#if link.iconType === 'custom-text' && link.iconText}
						<span class="text-icon custom-text">{link.iconText}</span>
					{:else if link.iconType === 'svg-url' && link.svgUrl}
						<img 
							src={link.svgUrl} 
							alt={link.name}
							class="svg-icon"
						/>
					{:else if link.iconType === 'coreui-brand' && link.iconName}
					<Icon 
						icon={`cib:${link.iconName.replace('cb-', '')}`} 
						class="iconify-icon"
					/>
				{/if}
				</button>
			{/each}
		</div>
	</div>
{:else}
	<div class="links-container">
		<div class="no-links-message">
			<p>There are currently no links</p>
		</div>
	</div>
{/if}

<style>
	:global(*) {
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
	}

	:global(*:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:active) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus-visible) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus-within) {
		box-shadow: none !important;
		outline: none !important;
	}
	.links-container {
		width: 100%;
		padding: 0;
		box-sizing: border-box;
	}


	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--theme-border, #374151);
		border-top: 2px solid var(--theme-accent, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.no-links-message {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
		text-align: center;
	}

	.no-links-message p {
		color: var(--text-secondary, #9ca3af);
		font-size: 14px;
		font-weight: 400;
		margin: 0;
		opacity: 0.8;
	}

	.links-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 4px;
		width: 100%;
		margin: 0;
		padding: 12px 8px;
		box-sizing: border-box;
		grid-auto-rows: min-content;
	}

	.link-item {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 24px;
		background: transparent !important;
		border: none !important;
		border-radius: 2px;
		color: var(--text-primary, #ffffff);
		cursor: pointer;
		padding: 0;
		margin: 0;
		font-size: 8px;
		font-weight: 500;
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
		box-sizing: border-box;
		min-height: 24px;
	}

	.link-item:hover {
		color: var(--accent-color, #3b82f6) !important;
		transform: translateY(-1px);
		background: transparent !important;
		box-shadow: none !important;
		outline: none !important;
		border: none !important;
	}

	.link-item:active {
		transform: translateY(0);
		background: transparent !important;
		box-shadow: none !important;
		outline: none !important;
	}

	.link-item:focus {
		outline: none !important;
		box-shadow: none !important;
		background: transparent !important;
		border: none !important;
	}

	.link-item:focus-visible {
		outline: none !important;
		box-shadow: none !important;
		background: transparent !important;
	}

	.link-item:focus-within {
		outline: none !important;
		box-shadow: none !important;
		background: transparent !important;
	}

	.text-icon {
		font-size: 11px;
		font-weight: 600;
		text-align: center;
		line-height: 1;
	}

	.text-icon.custom-text {
		font-weight: 600;
		font-size: 0.7rem;
		background: transparent;
		color: var(--text-primary, #ffffff);
		border: 1px solid var(--text-primary, #ffffff);
		border-radius: 2px;
		padding: 2px 4px;
		min-width: 16px;
		min-height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.svg-icon {
		object-fit: contain;
		filter: var(--icon-filter, none);
		width: 16px;
		height: 16px;
	}

	:global(.link-item svg) {
		width: 16px;
		height: 16px;
	}

	.link-item:has(.text-icon) {
		font-family: var(--font-family, 'Inter', sans-serif);
	}

	/* Maintain 8 links per row on all screen sizes */
	@media (max-width: 1024px) {
		.links-grid {
			gap: 3px;
			--gap-height: 3px;
		}
	}

	@media (max-width: 768px) {
		.links-grid {
			gap: 2px;
			padding: 10px 6px;
			--base-padding: 20px;
			--icon-height: 24px;
			--gap-height: 2px;
		}
		
		.link-item {
			height: 24px;
			font-size: 9px;
		}
		
		.text-icon {
			font-size: 8px;
		}
		
		.svg-icon, :global(.link-item svg) {
			width: 16px;
			height: 16px;
		}
	}

	@media (max-width: 480px) {
		.links-grid {
			gap: 2px;
			padding: 8px 4px;
			--base-padding: 16px;
			--icon-height: 24px;
			--gap-height: 2px;
		}
		
		.link-item {
			height: 24px;
			font-size: 9px;
		}
		
		.text-icon {
			font-size: 8px;
		}
		
		.svg-icon, :global(.link-item svg) {
			width: 16px;
			height: 16px;
		}
	}
</style>

