<script lang="ts">
	import favicon from '$lib/shared/assets/favicon.svg';
	import '../../app.css';
	import { page } from '$app/stores';
	import { THEME_PREVIEW_SEARCH_PARAM } from '$lib/site/themePreview';
	import SettingsIcon from '$lib/admin/components/settings/SettingsIcon.svelte';
	import SettingsPanel from '$lib/admin/components/settings/SettingsPanel.svelte';
	import Header from '$lib/site/components/layout/Header.svelte';
	import WeatherEffects from '$lib/site/components/effects/WeatherEffects.svelte';
	import ScrollingBanner from '$lib/site/components/ScrollingBanner.svelte';
	import ThemeProvider from '$lib/site/components/ThemeProvider.svelte';

	let { children } = $props();
	let settingsOpen = $state(false);

	const isThemePreviewEmbed = $derived($page.url.searchParams.has(THEME_PREVIEW_SEARCH_PARAM));

	function handleSettingsToggle() {
		settingsOpen = !settingsOpen;
	}

	function handleSettingsClose() {
		settingsOpen = false;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>dane.gg - Software Engineer & Designer</title>
	<meta name="description" content="Hi, I'm Dane! I'm a software engineer & freelance designer from Manchester, UK." />
</svelte:head>

<!-- Public website layout -->
<div class="main-container dark-theme">
	<ThemeProvider />
	
	<!-- Weather Effects -->
	{#if !isThemePreviewEmbed}
		<WeatherEffects />
	{/if}
	
	<div class="scanlines"></div>
	<div class="bg-overlay bg-overlay--grid" aria-hidden="true"></div>
	<div class="bg-overlay bg-overlay--grain" aria-hidden="true"></div>
	<div class="bg-overlay bg-overlay--vignette" aria-hidden="true"></div>
	<div class="bg-overlay bg-overlay--glare" aria-hidden="true"></div>
	
	<div class="content-window">
		<div class="content-area">
			<!-- Header -->
			<Header />
			
			<!-- Scrolling Banner -->
			<ScrollingBanner />
			
			<!-- Page content -->
			{@render children?.()}
		</div>
	</div>
	
	{#if !isThemePreviewEmbed}
		<!-- Settings Icon -->
		<SettingsIcon 
			isOpen={settingsOpen} 
			on:toggle={handleSettingsToggle}
		/>
		
		<!-- Settings Panel -->
		<SettingsPanel 
			isOpen={settingsOpen} 
			onClose={handleSettingsClose}
		/>
	{/if}
</div>

<style>
	:global(:root) {
		/* Default values - overridden by theme */
		--theme-primary: #ffffff;
		--theme-secondary: #a1a1aa;
		--theme-accent: #6366f1;
		--theme-background: #0a0a0a;
		--theme-surface: #1a1a1a;
		--theme-border: #ffffff;
		--theme-text-primary: #ffffff;
		--theme-text-secondary: #a1a1aa;
		--theme-text-muted: #71717a;
		--theme-border-radius: 8px;
		--theme-widget-border-radius: 8px;
		--theme-shell-border-width: 2px;
		--theme-widget-border-width: 2px;
		--theme-shell-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		--theme-content-max-width: 900px;
		--theme-scanlines-opacity: 1;
		--theme-overlay-vignette-opacity: 0;
		--theme-overlay-grid-opacity: 0;
		--theme-overlay-grain-opacity: 0;
		--theme-overlay-glare-opacity: 0;
		--theme-body-line-height: 1.65;
		--theme-font-scale: 1;

		--theme-surface-tone: dark;
		--status-ok: #90ee90;
		--status-down: #ffb6c1;
		--status-warn: #fde68a;
		--status-pending: #e5e7eb;
		--status-neutral: #d1d5db;
		--status-loading: #fcd34d;
		
		--bg-primary: var(--theme-surface);
		--bg-secondary: var(--theme-background);
		--bg-tertiary: #3a3a3a;
		--bg-hover: #474747;
		--text-primary: var(--theme-text-primary);
		--text-secondary: var(--theme-text-secondary);
		--text-muted: var(--theme-text-muted);
		--border-color: var(--theme-border);
		--accent-color: var(--theme-accent);
		--accent-hover: var(--theme-accent);
		--shadow: rgba(0, 0, 0, 0.3);
		--content-bg: rgba(45, 45, 45, 0.95);
	}

	:global(html) {
		background: var(--theme-background) !important;
		transition: all 0.3s ease;
	}
	
	:global(body) {
		background: transparent !important;
		margin: 0;
		padding: 0;
		transition: all 0.3s ease;
	}

	.main-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		transition: all 0.3s ease;
		position: relative;
	}

	.content-window {
		background: var(--theme-surface, var(--content-bg));
		border: var(--theme-shell-border-width, 2px) solid var(--theme-border, var(--border-color));
		border-radius: var(--theme-border-radius, 0);
		width: 90%;
		max-width: var(--theme-content-max-width, 900px);
		height: 90vh;
		max-height: 1100px;
		box-shadow: var(--theme-shell-shadow, 0 4px 20px var(--shadow));
		backdrop-filter: blur(10px);
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
		z-index: 1;
	}

	.content-area {
		background: var(--theme-surface, var(--bg-primary));
		height: 100%;
		padding: 1rem 1rem 3rem 1rem;
		overflow-y: auto;
		transition: all 0.3s ease;
		position: relative;
		line-height: var(--theme-body-line-height, 1.65);
	}

	/* Scanline effect */
	.scanlines {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
		z-index: 0;
		opacity: var(--theme-scanlines-opacity, 1);
		background-image: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 2px,
			rgba(255, 255, 255, 0.03) 2px,
			rgba(255, 255, 255, 0.03) 4px
		);
		animation: scanline-move 0.1s linear infinite;
	}

	@keyframes scanline-move {
		0% { transform: translateY(0); }
		100% { transform: translateY(4px); }
	}

	.bg-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		pointer-events: none;
		z-index: 0;
	}

	.bg-overlay--grid {
		opacity: var(--theme-overlay-grid-opacity, 0);
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
		background-size: 56px 56px;
		mask-image: radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 75%);
		-webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 75%);
	}

	.bg-overlay--grain {
		opacity: var(--theme-overlay-grain-opacity, 0);
		mix-blend-mode: overlay;
		background-image: radial-gradient(rgba(255, 255, 255, 0.09) 0.6px, transparent 0.7px);
		background-size: 3px 3px;
		animation: grain-shift 0.5s steps(2) infinite;
	}

	@keyframes grain-shift {
		0% {
			transform: translate(0, 0);
		}
		50% {
			transform: translate(-1px, 1px);
		}
		100% {
			transform: translate(1px, -1px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.bg-overlay--grain {
			animation: none;
		}
	}

	.bg-overlay--vignette {
		opacity: var(--theme-overlay-vignette-opacity, 0);
		background: radial-gradient(
			ellipse 85% 75% at 50% 48%,
			transparent 22%,
			rgba(0, 0, 0, 0.88) 100%
		);
		mix-blend-mode: multiply;
	}

	.bg-overlay--glare {
		opacity: var(--theme-overlay-glare-opacity, 0);
		background: linear-gradient(
			125deg,
			rgba(255, 255, 255, 0.14) 0%,
			rgba(255, 255, 255, 0.04) 22%,
			transparent 48%
		);
		mix-blend-mode: soft-light;
	}

	.content-window {
		background: var(--theme-surface, var(--content-bg));
		border-color: var(--theme-border, var(--border-color));
	}

	.content-area {
		background: var(--theme-surface, var(--bg-primary));
		color: var(--theme-text-primary, var(--text-primary));
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.main-container {
			padding: 10px;
		}
		
		.content-window {
			height: 95vh;
			min-height: 600px;
		}
		
		.content-area {
			padding: 0.75rem 1rem 2rem 1rem;
		}
		
	}

	@media (max-width: 480px) {
		.content-window {
			height: 98vh;
			min-height: 500px;
		}
		
		.content-area {
			padding: 0.5rem 0.75rem 1.5rem 0.75rem;
		}
	}
</style>

