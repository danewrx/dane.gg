<script lang="ts">
	import { mode, setMode, userPrefersMode } from 'mode-watcher';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { Monitor, Sun, Moon } from 'lucide-svelte';
	import { authService } from '$lib/services/auth';
	import { themeService } from '$lib/services/theme';
	import { user } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	// Theme tabs configuration
	const themeTabs = [
		{ id: 'system', label: 'Auto', value: 'system' },
		{ id: 'light', label: 'Light', value: 'light' },
		{ id: 'dark', label: 'Dark', value: 'dark' }
	];

	// Get current theme preference - start with system as default
	let currentTheme = $state('system');
	let isInitialized = $state(false);

	// Initialize theme from database (for authenticated users) or localStorage
	onMount(async () => {
		console.log('Settings page mounted, user:', $user);
		
		if ($user) {
			// Load from database if user is authenticated
			try {
				const dbTheme = await authService.getThemePreference();
				console.log('Loaded theme from database:', dbTheme);
				currentTheme = dbTheme;
				setMode(dbTheme as 'light' | 'dark' | 'system');
			} catch (error) {
				console.error('Failed to load theme from database:', error);
				// Fallback to localStorage
				loadFromLocalStorage();
			}
		} else {
			// Fallback to localStorage for non-authenticated users
			loadFromLocalStorage();
		}
		
		isInitialized = true;
	});

	function loadFromLocalStorage() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('mode-watcher-mode');
			if (stored && ['light', 'dark', 'system'].includes(stored)) {
				console.log('Loading stored theme from localStorage:', stored);
				currentTheme = stored;
			}
		}
	}

	// Debug current mode
	$effect(() => {
		console.log('Current resolved mode:', mode.current);
		console.log('User preference:', userPrefersMode.current);
		
		// Debug HTML classes
		if (typeof window !== 'undefined') {
			console.log('HTML classes:', document.documentElement.classList.toString());
			console.log('HTML has dark class:', document.documentElement.classList.contains('dark'));
		}
	});

	async function handleThemeChange(tabId: string, value: string) {
		console.log('Theme change requested:', { tabId, value });
		currentTheme = value;

		// Use theme service to set and save theme
		try {
			await themeService.setTheme(value);
			console.log('Theme set and saved successfully:', value);
		} catch (error) {
			console.error('Failed to set theme:', error);
			// Fallback to local mode setting
			setMode(value as 'light' | 'dark' | 'system');
		}
	}
</script>

<svelte:head>
	<title>Admin Settings - dane.gg</title>
</svelte:head>

<div class="settings-page">
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">Admin Settings</h1>
			<p>Manage your admin panel preferences and system settings</p>
		</div>
	</div>

	<div class="page-content">
		<!-- Theme Settings Section -->
		<div class="settings-section">
			<div class="section-header">
				<h2 class="section-title">Appearance</h2>
				<p class="section-description">Customize the look and feel of your admin panel</p>
			</div>

			<div class="setting-group">
				<div class="setting-info">
					<h3 class="setting-title">Theme</h3>
					<p class="setting-description">Choose your preferred color scheme</p>
				</div>
				
				<div class="setting-control">
					<Tabs
						tabs={themeTabs}
						activeTab={currentTheme}
						onTabChange={handleThemeChange}
						variant="default"
						size="md"
					/>
				</div>
			</div>

			<div class="theme-preview">
				<div class="preview-card">
					<div class="preview-header">
						<div class="preview-title">Preview</div>
						<div class="preview-mode">
							{#if mode.current === 'light'}
								<Sun size={16} />
								Light Mode (Active: {currentTheme})
							{:else if mode.current === 'dark'}
								<Moon size={16} />
								Dark Mode (Active: {currentTheme})
							{:else}
								<Monitor size={16} />
								System (Active: {currentTheme})
							{/if}
						</div>
					</div>
					<div class="preview-content">
						<div class="preview-text">
							This is how your admin panel will look with the selected theme.
						</div>
						<div class="preview-elements">
							<div class="preview-button primary">Primary Button</div>
							<div class="preview-button secondary">Secondary Button</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.settings-page {
		padding: 32px;
		max-width: 1000px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 32px;
	}

	.header-content h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #ffffff;
		margin: 0 0 8px 0;
	}

	:global(html:not(.dark)) .header-content h1 {
		color: #1f2937;
	}

	.header-content p {
		color: #9ca3af;
		font-size: 1rem;
		margin: 0;
	}

	:global(html:not(.dark)) .header-content p {
		color: #6b7280;
	}

	.page-content {
		min-height: 400px;
	}

	.settings-section {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 32px;
		margin-bottom: 24px;
	}

	:global(html:not(.dark)) .settings-section {
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.section-header {
		margin-bottom: 32px;
		padding-bottom: 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	
	:global(html:not(.dark)) .section-header {
		border-bottom-color: rgba(0, 0, 0, 0.1);
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #ffffff;
		margin: 0 0 8px 0;
	}

	
	:global(html:not(.dark)) .section-title {
		color: #1f2937;
	}

	.section-description {
		color: #9ca3af;
		font-size: 1rem;
		margin: 0;
	}

	
	:global(html:not(.dark)) .section-description {
		color: #6b7280;
	}

	.setting-group {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 32px;
		margin-bottom: 32px;
	}

	.setting-info {
		flex: 1;
		max-width: 400px;
	}

	.setting-title {
		font-size: 1.1rem;
		font-weight: 600;
		color: #ffffff;
		margin: 0 0 6px 0;
	}

	
	:global(html:not(.dark)) .setting-title {
		color: #1f2937;
	}

	.setting-description {
		color: #9ca3af;
		font-size: 0.9rem;
		margin: 0;
		line-height: 1.5;
	}

	
	:global(html:not(.dark)) .setting-description {
		color: #6b7280;
	}

	.setting-control {
		flex-shrink: 0;
	}

	.theme-preview {
		margin-top: 24px;
	}

	.preview-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		overflow: hidden;
	}

	
	:global(html:not(.dark)) .preview-card {
		background: rgba(0, 0, 0, 0.03);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		background: rgba(255, 255, 255, 0.05);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	
	:global(html:not(.dark)) .preview-header {
		background: rgba(0, 0, 0, 0.05);
		border-bottom-color: rgba(0, 0, 0, 0.1);
	}

	.preview-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: #ffffff;
	}

	
	:global(html:not(.dark)) .preview-title {
		color: #1f2937;
	}

	.preview-mode {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8rem;
		color: #9ca3af;
	}

	
	:global(html:not(.dark)) .preview-mode {
		color: #6b7280;
	}

	.preview-content {
		padding: 20px;
	}

	.preview-text {
		color: #e5e7eb;
		font-size: 0.9rem;
		margin-bottom: 16px;
		line-height: 1.5;
	}

	
	:global(html:not(.dark)) .preview-text {
		color: #374151;
	}

	.preview-elements {
		display: flex;
		gap: 12px;
	}

	.preview-button {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.preview-button.primary {
		background: #6366f1;
		color: white;
	}

	.preview-button.secondary {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #ffffff;
	}

	
	:global(html:not(.dark)) .preview-button.secondary {
		background: rgba(0, 0, 0, 0.1);
		border-color: rgba(0, 0, 0, 0.2);
		color: #1f2937;
	}

	@media (max-width: 768px) {
		.settings-page {
			padding: 16px;
		}

		.settings-section {
			padding: 20px;
		}

		.setting-group {
			flex-direction: column;
			gap: 16px;
		}

		.setting-info {
			max-width: none;
		}

		.header-content h1 {
			font-size: 1.5rem;
		}

		.preview-elements {
			flex-direction: column;
		}
	}
</style>
