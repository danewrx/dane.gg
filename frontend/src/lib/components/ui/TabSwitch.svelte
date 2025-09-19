<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let options: string[] = [];
	export let selected: string = '';
	export let disabled: boolean = false;

	const dispatch = createEventDispatcher<{
		change: { value: string };
	}>();

	function handleClick(option: string) {
		if (disabled || option === selected) return;
		selected = option;
		dispatch('change', { value: option });
	}

	// Calculate the position and width of the active indicator
	$: activeIndex = options.indexOf(selected);
	$: indicatorStyle = `
		transform: translateX(${activeIndex * 100}%);
		width: ${100 / options.length}%;
	`;
</script>

<div class="tab-switch" class:disabled>
	<div class="tab-container">
		{#each options as option, index}
			<button
				class="tab-option"
				class:active={option === selected}
				on:click={() => handleClick(option)}
				disabled={disabled}
				aria-pressed={option === selected}
			>
				{option}
			</button>
		{/each}
		<div class="active-indicator" style={indicatorStyle}></div>
	</div>
</div>

<style>
	.tab-switch {
		display: inline-block;
		position: relative;
	}

	.tab-container {
		position: relative;
		display: flex;
		background: var(--bg-tertiary);
		border: 2px solid var(--border-color);
		border-radius: 8px;
		padding: 4px;
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.tab-option {
		position: relative;
		z-index: 2;
		flex: 1;
		padding: 8px 16px;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--text-secondary);
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tab-option:hover:not(:disabled) {
		color: var(--text-primary);
		background: rgba(255, 255, 255, 0.05);
	}

	.tab-option.active {
		color: var(--bg-primary);
		font-weight: 600;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
	}

	.tab-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.active-indicator {
		position: absolute;
		top: 4px;
		left: 4px;
		height: calc(100% - 8px);
		background: var(--text-primary);
		border-radius: 6px;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		z-index: 1;
	}

	.disabled .tab-container {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.disabled .tab-option {
		cursor: not-allowed;
	}


	/* Responsive adjustments */
	@media (max-width: 480px) {
		.tab-option {
			padding: 6px 12px;
			font-size: 0.75rem;
		}
	}
</style>
