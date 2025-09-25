<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// Define props
	export let padding: string = '16px';
	export let borderColor: string = '#ffffff';
	export let backgroundColor: string = '#1a1a1a';
	export let hoverBackground: string = '#222222';
	export let className: string = '';
	export let showHeader: boolean = false;
	export let headerText: string = '';

	// Create event dispatcher for any events
	const dispatch = createEventDispatcher();

	// Handle click events
	function handleClick(event: MouseEvent | KeyboardEvent) {
		dispatch('click', event);
	}
</script>

<div 
	class="bordered-box {className}"
	style="
		--padding: {padding};
		--border-color: {borderColor};
		--background-color: {backgroundColor};
		--hover-background: {hoverBackground};
	"
	on:click={handleClick}
	on:keydown={(e) => e.key === 'Enter' && handleClick(e)}
	role="button"
	tabindex="0"
>
	{#if showHeader && headerText}
		<div class="bordered-box-header">
			<div class="header-text">
				<slot name="header-icon" />
				{headerText}
			</div>
			<div class="header-divider"></div>
		</div>
	{/if}
	<div class="bordered-box-content">
		<slot />
	</div>
</div>

<style>
	.bordered-box {
		width: 100%;
		background: var(--background-color);
		border: 1px solid var(--border-color);
		padding: var(--padding);
		transition: all 0.3s ease;
		cursor: pointer;
		box-sizing: border-box;
	}

	.bordered-box:hover {
		background: var(--hover-background);
	}

	.bordered-box:focus {
		outline: 2px solid var(--border-color);
		outline-offset: 2px;
	}

	.bordered-box-header {
		margin-bottom: -2px;
		padding-top: 8px;
	}

	.header-text {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin: 0 0 4px 0;
		padding: 0;
		line-height: 1.2;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-divider {
		width: 100%;
		height: 2px;
		background: var(--border-color, #ffffff);
		margin: 0;
		padding: 0;
	}

	/* Dark mode support */
	:global(html.dark) .bordered-box {
		--background-color: #1a1a1a;
		--border-color: #ffffff;
		--hover-background: #222222;
	}

	:global(html:not(.dark)) .bordered-box {
		--background-color: #f0f0f0;
		--border-color: #000000;
		--hover-background: #e0e0e0;
	}

	/* Responsive padding */
	@media (max-width: 768px) {
		.bordered-box {
			padding: calc(var(--padding) * 0.75);
		}
	}

	@media (max-width: 480px) {
		.bordered-box {
			padding: calc(var(--padding) * 0.5);
		}
	}
</style>
