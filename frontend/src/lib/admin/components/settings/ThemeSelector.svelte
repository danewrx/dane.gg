<script lang="ts">
	import { logger } from '$lib/logger';

	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import {
		siteTheme,
		applyThemeStyles,
		loadGoogleFonts,
		applyCustomCss,
		type SiteTheme
	} from '$lib/site/stores/theme';
	import { themeDarkenToRgba } from '$lib/site/constants/themeOverlayOpacity';
	import { Check, Palette, Loader2 } from 'lucide-svelte';

	const STORAGE_KEY = 'userSelectedTheme';

	let themes: SiteTheme[] = $state([]);
	let loading = $state(true);
	let currentThemeId = $state<string | null>(null);

	// Subscribe to current theme
	$effect(() => {
		const unsubscribe = siteTheme.subscribe((theme) => {
			currentThemeId = theme?.id ?? null;
		});
		return unsubscribe;
	});

	onMount(async () => {
		await loadThemes();

		if (browser) {
			const savedThemeId = localStorage.getItem(STORAGE_KEY);
			if (savedThemeId && themes.length > 0) {
				const savedTheme = themes.find((t) => t.id === savedThemeId);
				if (savedTheme) {
					applyTheme(savedTheme);
				}
			}
		}
	});

	async function loadThemes() {
		try {
			const response = await fetch('/api/themes');

			if (!response.ok) {
				throw new Error('Failed to load themes');
			}

			const data = await response.json();

			if (data.success && data.data) {
				themes = data.data;
			}
		} catch (error) {
			logger.error('Error loading themes:', error);
		} finally {
			loading = false;
		}
	}

	function applyTheme(theme: SiteTheme) {
		siteTheme.set(theme);

		applyThemeStyles(theme);

		const fontsToLoad = [theme.fontFamily, theme.headingFontFamily].filter(Boolean);
		loadGoogleFonts(fontsToLoad);

		applyCustomCss(theme.customCss);

		if (browser) {
			localStorage.setItem(STORAGE_KEY, theme.id);
		}
	}

	function selectTheme(theme: SiteTheme) {
		applyTheme(theme);
	}

	function getThemePreviewStyle(theme: SiteTheme): string {
		let bgStyle = `background: ${theme.backgroundColor};`;

		if (theme.backgroundImage) {
			const bgUrl = theme.backgroundImageExternal ? theme.backgroundImage : theme.backgroundImage;
			const darken = themeDarkenToRgba(theme.overlayDarkenOpacity, '0');
			bgStyle = `
				background: linear-gradient(${darken}, ${darken}), 
				url('${bgUrl}') ${theme.backgroundPosition} / ${theme.backgroundSize};
			`;
		}

		return bgStyle;
	}
</script>

<div class="theme-selector">
	{#if loading}
		<div class="loading">
			<Loader2 size={16} class="spin" />
			<span>Loading themes...</span>
		</div>
	{:else if themes.length === 0}
		<div class="no-themes">
			<Palette size={16} />
			<span>No themes available</span>
		</div>
	{:else}
		<div class="theme-list">
			{#each themes as theme (theme.id)}
				<button
					class="theme-option"
					class:active={currentThemeId === theme.id}
					onclick={() => selectTheme(theme)}
					title={theme.description || theme.name}
				>
					<div class="theme-preview" style={getThemePreviewStyle(theme)}>
						<div
							class="preview-card"
							style="
								background: {theme.surfaceColor};
								border-color: {theme.borderColor};
								border-radius: {theme.widgetBorderRadius ?? theme.borderRadius};
							"
						>
							<div class="preview-accent" style="background: {theme.accentColor};"></div>
						</div>
					</div>
					<div class="theme-info">
						<span class="theme-name">{theme.name}</span>
						{#if currentThemeId === theme.id}
							<Check size={12} class="check-icon" />
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.theme-selector {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.loading,
	.no-themes {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
		padding: 8px 0;
	}

	.loading :global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.theme-list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
	}

	.theme-option {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 0;
		background: transparent;
		border: 2px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		overflow: hidden;
	}

	.theme-option:hover {
		border-color: var(--border-color, #3a3a3a);
	}

	.theme-option.active {
		border-color: var(--accent-color, #6366f1);
	}

	.theme-preview {
		width: 100%;
		height: 48px;
		border-radius: 6px 6px 0 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		box-sizing: border-box;
	}

	.preview-card {
		width: 100%;
		height: 100%;
		border: 1px solid;
		display: flex;
		align-items: flex-end;
		padding: 4px;
		box-sizing: border-box;
	}

	.preview-accent {
		width: 16px;
		height: 4px;
		border-radius: 2px;
	}

	.theme-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 8px 8px;
		background: var(--bg-secondary, #1a1a1a);
	}

	.theme-name {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.theme-option.active .theme-name {
		color: var(--accent-color, #6366f1);
	}

	:global(.check-icon) {
		color: var(--accent-color, #6366f1);
		flex-shrink: 0;
	}
</style>
