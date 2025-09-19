<script lang="ts">
	import { theme } from '$lib/stores/theme';
	import { onMount } from 'svelte';

	let mounted = false;

	onMount(() => {
		mounted = true;
		// Initialize theme on mount
		theme.init();
	});

	function handleToggle() {
		theme.toggle();
	}
</script>

{#if mounted}
	<button 
		class="theme-toggle" 
		on:click={handleToggle}
		aria-label="Toggle theme"
		title="Toggle between light and dark mode"
	>
		{#if $theme === 'dark'}
			<!-- Sun icon for light mode -->
			<svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="5"/>
				<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
			</svg>
		{:else}
			<!-- Moon icon for dark mode -->
			<svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
			</svg>
		{/if}
	</button>
{/if}

<style>
	.theme-toggle {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
	}

	.theme-toggle:hover {
		background: var(--bg-hover);
		border-color: var(--accent-color);
		transform: translateY(-1px);
	}

	.theme-toggle:active {
		transform: translateY(0);
	}

	.theme-icon {
		width: 20px;
		height: 20px;
		color: var(--text-primary);
		transition: color 0.2s ease;
	}

	.theme-toggle:hover .theme-icon {
		color: var(--accent-color);
	}
</style>
