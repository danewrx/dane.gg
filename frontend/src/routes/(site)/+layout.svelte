<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../../app.css';
	import { theme } from '$lib/stores/theme';
	import SettingsIcon from '$lib/components/settings/SettingsIcon.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();
	let settingsOpen = $state(false);

	onMount(() => {
		// Initialize theme on mount
		theme.init();
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
<div class="main-container" class:light-theme={$theme === 'light'} class:dark-theme={$theme === 'dark'}>
	<div class="content-window">
		<div class="content-area">
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
	/* CSS Variables for theming */
	:global(:root) {
		/* Dark theme (default) */
		--bg-primary: #0a0a0a;
		--bg-secondary: #1a1a1a;
		--bg-tertiary: #2a2a2a;
		--bg-hover: #3a3a3a;
		--text-primary: #ffffff;
		--text-secondary: #cccccc;
		--text-muted: #888888;
		--border-color: #444444;
		--accent-color: #ffffff;
		--accent-hover: #cccccc;
		--shadow: rgba(0, 0, 0, 0.5);
		--content-bg: rgba(0, 0, 0, 0.8);
	}

	:global([data-theme="light"]) {
		/* Light theme */
		--bg-primary: #ffffff;
		--bg-secondary: #f8f9fa;
		--bg-tertiary: #e9ecef;
		--bg-hover: #dee2e6;
		--text-primary: #212529;
		--text-secondary: #495057;
		--text-muted: #6c757d;
		--border-color: #dee2e6;
		--accent-color: #000000;
		--accent-hover: #333333;
		--shadow: rgba(0, 0, 0, 0.1);
		--content-bg: rgba(255, 255, 255, 0.9);
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
	}

	.content-window {
		background: var(--content-bg);
		border: 1px solid var(--border-color);
		border-radius: 0;
		width: 100%;
		max-width: 1200px;
		height: 90vh;
		min-height: 800px;
		max-height: 1000px;
		box-shadow: 0 4px 20px var(--shadow);
		backdrop-filter: blur(10px);
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	.content-area {
		background: var(--bg-primary);
		height: 100%;
		padding: 2rem;
		overflow-y: auto;
		transition: all 0.3s ease;
	}


	/* Light theme specific adjustments */
	.light-theme .content-window {
		background: var(--content-bg);
		border-color: var(--border-color);
	}

	.light-theme .content-area {
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	/* Dark theme specific adjustments */
	.dark-theme .content-window {
		background: var(--content-bg);
		border-color: var(--border-color);
	}

	.dark-theme .content-area {
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

