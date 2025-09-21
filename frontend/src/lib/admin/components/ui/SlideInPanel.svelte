<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { X } from 'lucide-svelte';

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	let { 
		isOpen = false,
		title = '',
		icon = null,
		showCloseButton = true,
		children
	} = $props();

	let isClosing = $state(false);

	function closePanel() {
		isClosing = true;
		setTimeout(() => {
			isClosing = false;
			dispatch('close');
		}, 300); // Match animation duration
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			closePanel();
		}
	}

	// Handle overlay click
	function handleOverlayClick(event: MouseEvent | KeyboardEvent) {
		if (event.target === event.currentTarget) {
			closePanel();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Panel Overlay -->
{#if isOpen}
	<div 
		class="panel-overlay" 
		onclick={handleOverlayClick}
		onkeydown={(e) => e.key === 'Enter' && handleOverlayClick(e)}
		role="button"
		tabindex="0"
		aria-label="Close panel"
	>
		<div 
			class="slide-panel" 
			class:closing={isClosing}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="0"
		>
			{#if showCloseButton}
				<div class="panel-header">
					<div class="panel-title">
						{#if icon}
							{@const IconComponent = icon}
							<IconComponent size={20} />
						{/if}
						{#if title}
							<span>{title}</span>
						{/if}
					</div>
					<button class="close-button" onclick={closePanel} aria-label="Close panel">
						<X size={20} />
					</button>
				</div>
			{/if}
			
			<div class="panel-content">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}

<style>
	.panel-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		display: flex;
		justify-content: flex-end;
		align-items: stretch;
		backdrop-filter: blur(4px);
	}

	.slide-panel {
		background: #1a1a1a;
		border-left: 1px solid #2a2a2a;
		display: flex;
		flex-direction: column;
		animation: slideIn 0.3s ease-out;
		max-height: 100vh;
		overflow: hidden;
		width: 50% !important; /* Force 50% width on desktop */
		min-width: 0; /* Prevent flex items from overflowing */
		max-width: 50% !important; /* Ensure it doesn't exceed 50% */
	}

	.slide-panel.closing {
		animation: slideOut 0.3s ease-in;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	@keyframes slideOut {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(100%);
		}
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 24px;
		border-bottom: 1px solid #2a2a2a;
		flex-shrink: 0;
	}

	.panel-title {
		display: flex;
		align-items: center;
		gap: 12px;
		color: #ffffff;
		font-size: 18px;
		font-weight: 600;
	}

	.close-button {
		background: none;
		border: none;
		color: #a1a1aa;
		cursor: pointer;
		padding: 8px;
		border-radius: 4px;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-button:hover {
		background: #2a2a2a;
		color: #ffffff;
	}

	.close-button:focus {
		outline: 2px solid #6366f1;
		outline-offset: 2px;
	}

	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 24px;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.slide-panel {
			width: 100% !important;
			max-width: 100% !important;
		}
	}
</style>
