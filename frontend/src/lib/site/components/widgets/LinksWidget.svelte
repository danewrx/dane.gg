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
			console.log('📡 Response status:', response.status);
			console.log('📡 Response headers:', response.headers);
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			const data = await response.json();

			if (data.success && data.data && data.data.length > 0) {
				socialLinks = data.data;
				
				// Debug each link's properties
				socialLinks.slice(0, 3).forEach((link, index) => {
					console.log(`🔍 Link ${index + 1}:`, {
						name: link.name,
						iconType: link.iconType,
						iconName: link.iconName,
						iconText: link.iconText,
						svgUrl: link.svgUrl,
						isActive: link.isActive
					});
				});
			} else {
				console.log('No social links found in API response, using sample data');
				socialLinks = [
					{ id: '1', name: 'X (Twitter)', url: 'https://x.com/dane', iconType: 'coreui-brand', iconName: 'twitter', displayOrder: 1, isActive: true },
					{ id: '2', name: 'Bluesky', url: 'https://bsky.app/profile/dane', iconType: 'coreui-brand', iconName: 'bluesky', displayOrder: 2, isActive: true },
					{ id: '3', name: 'Instagram', url: 'https://instagram.com/dane', iconType: 'coreui-brand', iconName: 'instagram', displayOrder: 3, isActive: true },
					{ id: '4', name: 'GitHub', url: 'https://github.com/dane', iconType: 'coreui-brand', iconName: 'github', displayOrder: 4, isActive: true },
					{ id: '5', name: 'Discord', url: 'https://discord.gg/dane', iconType: 'coreui-brand', iconName: 'discord', displayOrder: 5, isActive: true },
					{ id: '6', name: 'Steam', url: 'https://steamcommunity.com/id/dane', iconType: 'coreui-brand', iconName: 'steam', displayOrder: 6, isActive: true },
					{ id: '7', name: 'YouTube', url: 'https://youtube.com/@dane', iconType: 'coreui-brand', iconName: 'youtube', displayOrder: 7, isActive: true },
					{ id: '8', name: 'Twitch', url: 'https://twitch.tv/dane', iconType: 'coreui-brand', iconName: 'twitch', displayOrder: 8, isActive: true },
					{ id: '9', name: 'Behance', url: 'https://behance.net/dane', iconType: 'coreui-brand', iconName: 'behance', displayOrder: 9, isActive: true },
					{ id: '10', name: 'SoundCloud', url: 'https://soundcloud.com/dane', iconType: 'coreui-brand', iconName: 'soundcloud', displayOrder: 10, isActive: true },
					{ id: '11', name: 'Spotify', url: 'https://open.spotify.com/user/dane', iconType: 'coreui-brand', iconName: 'spotify', displayOrder: 11, isActive: true },
					{ id: '12', name: 'Reddit', url: 'https://reddit.com/u/dane', iconType: 'coreui-brand', iconName: 'reddit', displayOrder: 12, isActive: true },
					{ id: '13', name: 'ArtStation', url: 'https://artstation.com/dane', iconType: 'custom-text', iconText: 'OS', displayOrder: 13, isActive: true },
					{ id: '14', name: 'MyAnimeList', url: 'https://myanimelist.net/profile/dane', iconType: 'custom-text', iconText: 'MAL', displayOrder: 14, isActive: true },
					{ id: '15', name: 'VR', url: 'https://vr.dane.gg', iconType: 'custom-text', iconText: 'VR', displayOrder: 15, isActive: true },
					{ id: '16', name: 'osu!', url: 'https://osu.ppy.sh/users/dane', iconType: 'custom-text', iconText: 'osu!', displayOrder: 16, isActive: true }
				];
			}
		} catch (error) {
			console.error('Error loading social links:', error);
			console.log('Using sample data as fallback');
			// Use sample data as fallback
			socialLinks = [
				{ id: '1', name: 'X (Twitter)', url: 'https://x.com/dane', iconType: 'coreui-brand', iconName: 'twitter', displayOrder: 1, isActive: true },
				{ id: '2', name: 'Bluesky', url: 'https://bsky.app/profile/dane', iconType: 'coreui-brand', iconName: 'bluesky', displayOrder: 2, isActive: true },
				{ id: '3', name: 'Instagram', url: 'https://instagram.com/dane', iconType: 'coreui-brand', iconName: 'instagram', displayOrder: 3, isActive: true },
				{ id: '4', name: 'GitHub', url: 'https://github.com/dane', iconType: 'coreui-brand', iconName: 'github', displayOrder: 4, isActive: true },
				{ id: '5', name: 'Discord', url: 'https://discord.gg/dane', iconType: 'coreui-brand', iconName: 'discord', displayOrder: 5, isActive: true },
				{ id: '6', name: 'Steam', url: 'https://steamcommunity.com/id/dane', iconType: 'coreui-brand', iconName: 'steam', displayOrder: 6, isActive: true },
				{ id: '7', name: 'YouTube', url: 'https://youtube.com/@dane', iconType: 'coreui-brand', iconName: 'youtube', displayOrder: 7, isActive: true },
				{ id: '8', name: 'Twitch', url: 'https://twitch.tv/dane', iconType: 'coreui-brand', iconName: 'twitch', displayOrder: 8, isActive: true },
				{ id: '9', name: 'Behance', url: 'https://behance.net/dane', iconType: 'coreui-brand', iconName: 'behance', displayOrder: 9, isActive: true },
				{ id: '10', name: 'SoundCloud', url: 'https://soundcloud.com/dane', iconType: 'coreui-brand', iconName: 'soundcloud', displayOrder: 10, isActive: true },
				{ id: '11', name: 'Spotify', url: 'https://open.spotify.com/user/dane', iconType: 'coreui-brand', iconName: 'spotify', displayOrder: 11, isActive: true },
				{ id: '12', name: 'Reddit', url: 'https://reddit.com/u/dane', iconType: 'coreui-brand', iconName: 'reddit', displayOrder: 12, isActive: true },
				{ id: '13', name: 'ArtStation', url: 'https://artstation.com/dane', iconType: 'custom-text', iconText: 'OS', displayOrder: 13, isActive: true },
				{ id: '14', name: 'MyAnimeList', url: 'https://myanimelist.net/profile/dane', iconType: 'custom-text', iconText: 'MAL', displayOrder: 14, isActive: true },
				{ id: '15', name: 'VR', url: 'https://vr.dane.gg', iconType: 'custom-text', iconText: 'VR', displayOrder: 15, isActive: true },
				{ id: '16', name: 'osu!', url: 'https://osu.ppy.sh/users/dane', iconType: 'custom-text', iconText: 'osu!', displayOrder: 16, isActive: true }
			];
		} finally {
			isLoading = false;
			console.log('🏁 Loading complete. Social links count:', socialLinks.length);
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
					{:else}
						<!-- Default link icon when no specific icon is set -->
						<Icon 
							icon="lucide:external-link" 
							class="iconify-icon default-icon"
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
		border: 2px solid #374151;
		border-top: 2px solid #6366f1;
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
	
	.default-icon {
		opacity: 0.7;
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

