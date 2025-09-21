<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import FontSelector from './FontSelector.svelte';
	import WeatherControls from './WeatherControls.svelte';

	export let isOpen: boolean = false;

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	function handleClose() {
		dispatch('close');
	}
</script>

<!-- Settings Panel -->
{#if isOpen}
	<div 
		class="settings-backdrop" 
		onclick={handleClose}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
		role="button"
		tabindex="-1"
		aria-label="Close settings"
	></div>
{/if}
<div class="settings-panel" class:open={isOpen}>
	<div class="settings-content">
		<div class="settings-section">
			<h3>Appearance</h3>
			<FontSelector />
		</div>

		<div class="settings-section">
			<h3>Weather Effects</h3>
			<WeatherControls />
		</div>
	</div>
</div>

<style>
	.settings-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: transparent;
		z-index: 1000;
		cursor: pointer;
	}

	.settings-panel {
		position: fixed;
		bottom: 20px;
		right: 0;
		width: 280px;
		height: auto;
		background: #1a1a1a;
		border: 1px solid #444444;
		border-right: none;
		border-radius: 6px 0 0 6px;
		box-shadow: -4px 0 12px rgba(0, 0, 0, 0.5);
		z-index: 1001;
		transform: translateX(100%);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.settings-panel.open {
		transform: translateX(0);
	}

	.settings-content {
		padding: 16px;
		background: #1a1a1a;
	}

	.settings-section {
		margin-bottom: 20px;
	}

	.settings-section:last-child {
		margin-bottom: 0;
	}

	.settings-section h3 {
		margin: 0 0 12px 0;
		color: #ffffff;
		font-size: 12px;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Animations */
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* Responsive design */
	@media (max-width: 480px) {
		.settings-panel {
			width: 280px;
		}
		
		.settings-content {
			padding: 12px;
		}
	}
</style>