<script lang="ts">
	import favicon from '$lib/shared/assets/favicon.svg';
	import '../../app.css';
	import SettingsIcon from '$lib/admin/components/settings/SettingsIcon.svelte';
	import SettingsPanel from '$lib/admin/components/settings/SettingsPanel.svelte';
	import Header from '$lib/site/components/layout/Header.svelte';
	import WeatherEffects from '$lib/site/components/effects/WeatherEffects.svelte';
	import ScrollingBanner from '$lib/site/components/ScrollingBanner.svelte';
	import ThemeProvider from '$lib/site/components/ThemeProvider.svelte';

	let { children } = $props();
	let settingsOpen = $state(false);

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
	<WeatherEffects />
	
	<!-- Scanline Effect - behind content container -->
	<div class="scanlines"></div>
	
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
		--theme-font-scale: 1;
		
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
		border: 2px solid var(--theme-border, var(--border-color));
		border-radius: var(--theme-border-radius, 0);
		width: 90%;
		max-width: 900px;
		height: 90vh;
		max-height: 1100px;
		box-shadow: 0 4px 20px var(--shadow);
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

