<script lang="ts">
	import { X, Palette } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { siteTheme, applyThemeStyles, loadGoogleFonts, applyCustomCss } from '$lib/site/stores/theme';
	
	interface Theme {
		id: string;
		name: string;
		description: string;
		isActive: boolean;
		primaryColor: string;
		secondaryColor: string;
		accentColor: string;
		backgroundColor: string;
		surfaceColor: string;
		borderColor: string;
		backgroundImage: string | null;
		backgroundImageExternal: boolean;
		textPrimary: string;
		textSecondary: string;
		textMuted: string;
		backgroundOverlay: string;
		backgroundBlur: number;
		backgroundPosition: string;
		backgroundSize: string;
		backgroundAttachment: string;
		fontFamily: string;
		headingFontFamily: string;
		fontScale: string;
		borderRadius: string;
		customCss: string | null;
	}
	
	let { isOpen = $bindable(false) } = $props();
	
	let themes = $state<Theme[]>([]);
	let loading = $state(true);
	let selectedThemeId = $state<string | null>(null);
	let applying = $state(false);
	
	onMount(() => {
		loadThemes();
	});
	
	async function loadThemes() {
		try {
			loading = true;
			const response = await fetch('/api/themes');
			
			if (!response.ok) {
				throw new Error('Failed to load themes');
			}
			
			const result = await response.json();
			themes = result.data || [];
			
			// Check localStorage for user preference
			const savedThemeId = localStorage.getItem('selectedTheme');
			if (savedThemeId && themes.some(t => t.id === savedThemeId)) {
				selectedThemeId = savedThemeId;
			} else {
				const activeTheme = themes.find(t => t.isActive);
				selectedThemeId = activeTheme?.id || null;
			}
		} catch (error) {
			console.error('Error loading themes:', error);
		} finally {
			loading = false;
		}
	}
	
	async function selectTheme(themeId: string) {
		if (applying) return;
		
		try {
			applying = true;
			selectedThemeId = themeId;
			
			const theme = themes.find(t => t.id === themeId);
			if (!theme) {
				throw new Error('Theme not found');
			}
			
			// Save to localStorage
			localStorage.setItem('selectedTheme', themeId);
			
			// Apply theme
			siteTheme.set(theme as any);
			applyThemeStyles(theme as any);
			loadGoogleFonts([theme.fontFamily, theme.headingFontFamily]);
			applyCustomCss(theme.customCss);
			
			applying = false;
		} catch (error) {
			console.error('Error selecting theme:', error);
			applying = false;
		}
	}
	
	function getBackgroundUrl(theme: Theme): string {
		if (!theme.backgroundImage) return '';
		
		if (theme.backgroundImageExternal) {
			return theme.backgroundImage;
		}
		
		return theme.backgroundImage;
	}
	
	function handleBackdropClick() {
		isOpen = false;
	}
	
	function handleWindowClick(e: MouseEvent) {
		e.stopPropagation();
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div 
		class="window-backdrop"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && handleBackdropClick()}
		role="button"
		tabindex="-1"
		aria-label="Close theme switcher"
	>
		<!-- Window -->
		<div 
			class="theme-window"
			onclick={handleWindowClick}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="theme-window-title"
			tabindex="-1"
		>
			<!-- Title Bar -->
			<div class="window-titlebar">
				<div class="titlebar-left">
					<Palette size={14} class="title-icon" />
					<span id="theme-window-title" class="title-text">Theme Selector</span>
				</div>
				<button 
					class="close-button"
					onclick={() => isOpen = false}
					aria-label="Close window"
				>
					<X size={14} />
				</button>
			</div>
			
			<!-- Window Content -->
			<div class="window-content">
				{#if loading}
					<div class="loading-state">
						<div class="loading-spinner"></div>
						<p>Loading themes...</p>
					</div>
				{:else if themes.length === 0}
					<div class="empty-state">
						<p>No themes available</p>
					</div>
				{:else}
					<div class="themes-grid">
						{#each themes as theme (theme.id)}
							<button
								class="theme-card"
								class:active={theme.id === selectedThemeId}
								class:applying={applying && theme.id === selectedThemeId}
								onclick={() => selectTheme(theme.id)}
								disabled={applying}
							>
								<!-- Theme Preview -->
								<div 
									class="theme-preview"
									style="
										background: {theme.surfaceColor};
										border-color: {theme.borderColor};
									"
								>
									{#if theme.backgroundImage}
										<div 
											class="preview-bg"
											style="background-image: url('{getBackgroundUrl(theme)}');"
										></div>
									{/if}
									<div class="preview-colors">
										<div class="color-bar" style="background: {theme.accentColor};"></div>
										<div class="color-swatch" style="background: {theme.primaryColor};"></div>
										<div class="color-swatch" style="background: {theme.secondaryColor};"></div>
										<div class="color-swatch" style="background: {theme.accentColor};"></div>
									</div>
								</div>
								
								<!-- Theme Info -->
								<div class="theme-info">
									<div class="theme-name">{theme.name}</div>
									{#if theme.id === selectedThemeId}
										<div class="active-badge">Active</div>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
			
			<!-- Window Footer -->
			<div class="window-footer">
				<div class="footer-text">
					Click a theme to apply it
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.window-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		animation: fadeIn 0.2s ease-out;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	
	.theme-window {
		background: var(--theme-surface, #1a1a1a);
		border: 2px solid var(--theme-border, #ffffff);
		box-shadow: 
			0 0 0 1px rgba(0, 0, 0, 0.1),
			0 8px 32px rgba(0, 0, 0, 0.6),
			0 0 40px var(--theme-accent, #90ee90);
		width: 90%;
		max-width: 600px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		animation: windowSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		font-family: var(--global-font-family, 'W95FA', 'JetBrains Mono', 'Courier New', monospace);
	}
	
	@keyframes windowSlideIn {
		from {
			transform: scale(0.9) translateY(-20px);
			opacity: 0;
		}
		to {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
	}
	
	/* Title Bar */
	.window-titlebar {
		background: var(--theme-accent, #90ee90);
		color: var(--theme-background, #0a0a0a);
		padding: 8px 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 2px solid var(--theme-border, #ffffff);
		user-select: none;
		text-shadow: 
			0 0 10px var(--theme-accent, #90ee90),
			0 0 20px var(--theme-accent, #90ee90);
	}
	
	.titlebar-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	
	.titlebar-left :global(svg) {
		flex-shrink: 0;
	}
	
	.title-text {
		font-size: 14px;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 1px;
	}
	
	.close-button {
		background: transparent;
		border: 2px solid currentColor;
		color: inherit;
		padding: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}
	
	.close-button:hover {
		background: var(--theme-background, #0a0a0a);
		color: var(--theme-accent, #90ee90);
		transform: scale(1.1);
	}
	
	/* Window Content */
	.window-content {
		flex: 1;
		padding: 16px;
		overflow-y: auto;
		background: var(--theme-background, #0a0a0a);
	}
	
	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40px 20px;
		color: var(--theme-text-secondary, #a1a1aa);
		text-align: center;
	}
	
	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--theme-border, #ffffff);
		border-top-color: var(--theme-accent, #90ee90);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}
	
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	
	/* Themes Grid */
	.themes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 16px;
	}
	
	.theme-card {
		background: var(--theme-surface, #1a1a1a);
		border: 2px solid var(--theme-border, #ffffff);
		padding: 0;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}
	
	.theme-card:hover {
		transform: translateY(-4px);
		box-shadow: 
			0 8px 16px rgba(0, 0, 0, 0.4),
			0 0 20px var(--theme-accent, #90ee90);
		border-color: var(--theme-accent, #90ee90);
	}
	
	.theme-card.active {
		border-color: var(--theme-accent, #90ee90);
		box-shadow: 
			0 0 20px var(--theme-accent, #90ee90),
			0 0 40px var(--theme-accent, #90ee90);
	}
	
	.theme-card.active::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--theme-accent, #90ee90);
		opacity: 0.1;
		pointer-events: none;
	}
	
	/* Theme Preview */
	.theme-preview {
		height: 100px;
		position: relative;
		border-bottom: 2px solid var(--theme-border, #ffffff);
		overflow: hidden;
	}
	
	.preview-bg {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-size: cover;
		background-position: center;
		opacity: 0.4;
	}
	
	.preview-colors {
		position: absolute;
		bottom: 8px;
		left: 8px;
		right: 8px;
		display: flex;
		gap: 4px;
		z-index: 1;
	}
	
	.color-bar {
		flex: 1;
		height: 20px;
		border: 1px solid rgba(0, 0, 0, 0.3);
	}
	
	.color-swatch {
		width: 20px;
		height: 20px;
		border: 1px solid rgba(0, 0, 0, 0.3);
	}
	
	/* Theme Info */
	.theme-info {
		padding: 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		background: var(--theme-surface, #1a1a1a);
	}
	
	.theme-name {
		font-size: 13px;
		font-weight: bold;
		color: var(--theme-text-primary, #ffffff);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.active-badge {
		background: var(--theme-accent, #90ee90);
		color: var(--theme-background, #0a0a0a);
		padding: 2px 8px;
		font-size: 10px;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border: 1px solid var(--theme-border, #ffffff);
		text-shadow: 
			0 0 10px var(--theme-accent, #90ee90);
	}
	
	/* Window Footer */
	.window-footer {
		background: var(--theme-surface, #1a1a1a);
		border-top: 2px solid var(--theme-border, #ffffff);
		padding: 8px 12px;
	}
	
	.footer-text {
		font-size: 11px;
		color: var(--theme-text-muted, #71717a);
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	/* Responsive */
	@media (max-width: 768px) {
		.theme-window {
			width: 95%;
			max-height: 90vh;
		}
		
		.themes-grid {
			grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
			gap: 12px;
		}
		
		.theme-preview {
			height: 80px;
		}
		
		.window-content {
			padding: 12px;
		}
	}
</style>
