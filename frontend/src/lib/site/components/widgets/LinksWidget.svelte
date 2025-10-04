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
			const data = await response.json();

			if (data.success && data.data.length > 0) {
				socialLinks = data.data;
			} else {
				socialLinks = [];
			}
		} catch (error) {
			console.error('Error loading social links:', error);
			socialLinks = [];
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
							width="18" 
							height="18"
						/>
					{:else if link.iconType === 'coreui-brand' && link.iconName}
						<Icon 
							icon={`cib:${link.iconName}`} 
							width="18" 
							height="18" 
						/>
					{:else}
						<Icon 
							icon="cib:link" 
							width="18" 
							height="18" 
						/>
					{/if}
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	.links-container {
		width: 100%;
		padding: 0;
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
		border: 2px solid #374151;
		border-top: 2px solid #6366f1;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.links-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 6px;
		width: 100%;
	}

	.link-item {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 36px;
		background: transparent !important;
		border: none !important;
		border-radius: 2px;
		color: var(--text-primary, #ffffff);
		cursor: pointer;
		padding: 0;
		margin: 0;
		font-size: 12px;
		font-weight: 500;
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
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
		font-size: 0.75rem;
		background: var(--accent-color, #3b82f6);
		color: white;
		border-radius: 3px;
		padding: 1px 4px;
		min-width: 16px;
		min-height: 16px;
	}

	.svg-icon {
		object-fit: contain;
		filter: var(--icon-filter, none);
	}


	/* Styling for text-based icons */
	.link-item:has(.text-icon) {
		font-family: var(--font-family, 'Inter', sans-serif);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.links-grid {
			grid-template-columns: repeat(4, 1fr);
			gap: 4px;
		}
		
		.link-item {
			height: 32px;
			font-size: 11px;
		}
		
		.text-icon {
			font-size: 10px;
		}
	}

	@media (max-width: 480px) {
		.links-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 3px;
		}
		
		.link-item {
			height: 28px;
			font-size: 10px;
		}
		
		.text-icon {
			font-size: 9px;
		}
	}
</style>

