<script lang="ts">
	import favicon from '$lib/shared/assets/favicon.svg';
	import '../../app.css';
	import SettingsIcon from '$lib/admin/components/settings/SettingsIcon.svelte';
	import SettingsPanel from '$lib/admin/components/settings/SettingsPanel.svelte';
	import Header from '$lib/site/components/layout/Header.svelte';
	import WeatherEffects from '$lib/site/components/effects/WeatherEffects.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();
	let settingsOpen = $state(false);

	onMount(() => {
		// Site initialization
	});

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
	<!-- Weather Effects -->
	<WeatherEffects />
	
	<!-- Scanline Effect - behind content container -->
	<div class="scanlines"></div>
	
	<div class="content-window">
		<div class="content-area">
			<!-- Header -->
			<Header />
			
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
		on:close={handleSettingsClose}
	/>
</div>

<style>
	/* Static CSS Variables - Dark Grey Theme */
	:global(:root) {
		/* Dark grey color scheme */
		--bg-primary: #1a1a1a;
		--bg-secondary: #2d2d2d;
		--bg-tertiary: #3a3a3a;
		--bg-hover: #474747;
		--text-primary: #ffffff;
		--text-secondary: #e0e0e0;
		--text-muted: #b0b0b0;
		--border-color: #555555;
		--accent-color: #4a9eff;
		--accent-hover: #357abd;
		--shadow: rgba(0, 0, 0, 0.3);
		--content-bg: rgba(45, 45, 45, 0.95);
	}

	:global(html) {
		background-image: url('/assets/img/backgrounds/1.png') !important;
		background-size: cover !important;
		background-position: center !important;
		background-repeat: no-repeat !important;
		background-attachment: fixed !important;
		transition: all 0.3s ease;
	}
	
	:global(body) {
		background-image: url('/assets/img/backgrounds/1.png') !important;
		background-size: cover !important;
		background-position: center !important;
		background-repeat: no-repeat !important;
		background-attachment: fixed !important;
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
		background: var(--content-bg);
		border: 1px solid var(--border-color);
		border-radius: 0;
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
		background: var(--bg-primary);
		height: 100%;
		padding: 2rem;
		overflow-y: auto;
		transition: all 0.3s ease;
		position: relative;
	}

	/* Scanline Effect - behind content container */
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



	/* Content styling - static dark theme */
	.content-window {
		background: var(--content-bg);
		border-color: var(--border-color);
	}

	.content-area {
		background: var(--bg-primary);
		color: var(--text-primary);
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
			padding: 1rem;
		}
		
	}

	@media (max-width: 480px) {
		.content-window {
			height: 98vh;
			min-height: 500px;
		}
		
		.content-area {
			padding: 0.75rem;
		}
	}
</style>

