<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { X } from 'lucide-svelte';

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	let { isOpen = false, title = '', icon = null, showCloseButton = true, children } = $props();

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
		max-height: min(100vh, 100dvh);
		overflow: hidden;
		width: 50% !important;
		min-width: 0;
		max-width: 50% !important;
		box-sizing: border-box;
	}

	:global(html:not(.dark)) .slide-panel {
		background: #ffffff;
		border-left-color: #e5e7eb;
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
		gap: 12px;
		padding: 20px max(16px, env(safe-area-inset-right, 0px)) 20px
			max(16px, env(safe-area-inset-left, 0px));
		border-bottom: 1px solid #2a2a2a;
		flex-shrink: 0;
		min-width: 0;
	}

	:global(html:not(.dark)) .panel-header {
		border-bottom-color: #e5e7eb;
	}

	.panel-title {
		display: flex;
		align-items: center;
		gap: 12px;
		color: #ffffff;
		font-size: 18px;
		font-weight: 600;
		min-width: 0;
		flex: 1;
	}

	.panel-title span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.panel-title :global(svg) {
		flex-shrink: 0;
	}

	:global(html:not(.dark)) .panel-title {
		color: #1f2937;
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
		flex-shrink: 0;
	}

	:global(html:not(.dark)) .close-button {
		color: #6b7280;
	}

	.close-button:hover {
		background: #2a2a2a;
		color: #ffffff;
	}

	:global(html:not(.dark)) .close-button:hover {
		background: #f3f4f6;
		color: #1f2937;
	}

	.close-button:focus {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: 2px;
	}

	.panel-content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		-webkit-overflow-scrolling: touch;
		padding: 24px max(24px, env(safe-area-inset-right, 0px))
			max(24px, env(safe-area-inset-bottom, 0px)) max(24px, env(safe-area-inset-left, 0px));
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		min-width: 0;
	}

	@media (max-width: 768px) {
		.panel-content {
			padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px));
		}
	}

	@media (max-width: 1023px) {
		.slide-panel {
			width: 100% !important;
			max-width: 100% !important;
		}
	}

	@media (max-width: 480px) {
		.panel-header {
			padding: 16px max(14px, env(safe-area-inset-right, 0px)) 16px
				max(14px, env(safe-area-inset-left, 0px));
		}

		.panel-title {
			font-size: 16px;
			gap: 10px;
		}

		.panel-content {
			padding: 16px max(16px, env(safe-area-inset-right, 0px))
				calc(100px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
		}
	}

	@media (max-width: 360px) {
		.panel-content {
			padding: 14px max(12px, env(safe-area-inset-right, 0px))
				calc(100px + env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px));
		}
	}
</style>
