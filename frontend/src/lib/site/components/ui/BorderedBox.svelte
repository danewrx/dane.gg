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

	const dispatch = createEventDispatcher();
</script>

<div 
	class="bordered-box {className}"
	style="
		--padding: {padding};
		--border-color: {borderColor};
		--background-color: {backgroundColor};
		--hover-background: {hoverBackground};
	"
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
		box-sizing: border-box;
	}

	.bordered-box:hover {
		background: var(--background-color);
	}

	.bordered-box:focus {
		outline: none;
	}

	.bordered-box-header {
		margin-bottom: -2px;
		padding-top: 8px;
		margin-left: calc(-1 * var(--padding));
		margin-right: calc(-1 * var(--padding));
		padding-left: var(--padding);
		padding-right: var(--padding);
	}
	
	.bordered-box-content {
		margin-top: 0;
		padding-top: 0;
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
			padding: 6px 12px;
		}
		
		.bordered-box-header {
			margin-left: -12px;
			margin-right: -12px;
			padding-left: 12px;
			padding-right: 12px;
		}
		
		.header-divider {
			margin-left: 0;
			margin-right: 0;
		}
		
		.bordered-box-content {
			margin-top: -4px;
		}
	}

	@media (max-width: 480px) {
		.bordered-box {
			padding: 4px 8px;
		}
		
		.bordered-box-header {
			margin-left: -8px;
			margin-right: -8px;
			padding-left: 8px;
			padding-right: 8px;
		}
		
		.header-divider {
			margin-left: 0;
			margin-right: 0;
		}
		
		.bordered-box-content {
			margin-top: -6px;
		}
	}
</style>
