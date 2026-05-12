<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let isOpen: boolean = false;

	const dispatch = createEventDispatcher<{
		toggle: void;
	}>();

	function handleClick() {
		dispatch('toggle');
	}
</script>

<button
	class="settings-icon"
	class:open={isOpen}
	on:click={handleClick}
	aria-label="Open settings"
	title="Settings"
>
	<svg class="gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
		<circle cx="12" cy="12" r="3"></circle>
		<path
			d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
		></path>
	</svg>
</button>

<style>
	.settings-icon {
		position: fixed;
		bottom: max(20px, env(safe-area-inset-bottom, 0px));
		right: max(0px, env(safe-area-inset-right, 0px));
		width: 48px;
		height: 48px;
		background: var(--bg-secondary);
		border: 2px solid var(--border-color);
		border-right: none;
		border-radius: 0;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
		z-index: 1100;
		outline: none;
	}

	.settings-icon:focus {
		outline: none;
		box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
	}

	.settings-icon:hover {
		background: var(--bg-hover);
		transform: translateX(-2px);
		box-shadow: -4px 0 12px rgba(0, 0, 0, 0.3);
	}

	.settings-icon:active {
		transform: translateX(0);
	}

	.settings-icon.open {
		background: var(--bg-hover);
		z-index: 90;
	}

	.gear-icon {
		width: 24px;
		height: 24px;
		color: var(--text-primary);
		transition: all 0.3s ease;
	}

	.settings-icon:hover .gear-icon {
		color: var(--text-primary);
		animation: spin 2s linear infinite;
	}

	.settings-icon.open .gear-icon {
		color: var(--text-primary);
		animation: none;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.settings-icon {
			bottom: max(15px, env(safe-area-inset-bottom, 0px));
			right: max(12px, env(safe-area-inset-right, 0px));
			width: 44px;
			height: 44px;
		}

		.gear-icon {
			width: 20px;
			height: 20px;
		}
	}

	@media (max-width: 360px) {
		.settings-icon {
			bottom: max(10px, env(safe-area-inset-bottom, 0px));
			right: max(8px, env(safe-area-inset-right, 0px));
			width: 42px;
			height: 42px;
		}
	}
</style>
