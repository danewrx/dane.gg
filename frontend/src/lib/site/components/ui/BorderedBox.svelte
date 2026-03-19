<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// Define props
	export let padding: string = '16px';
	export let borderColor: string = '';
	export let backgroundColor: string = '';
	export let hoverBackground: string = '';
	export let className: string = '';
	export let showHeader: boolean = false;
	export let headerText: string = '';
	export let subheading: string = '';
	export let subheadingColor: string = '';
	export let contentPadding: boolean = false;
	export let contentBottomPadding: boolean = false;
	export let dynamicHeight: boolean = false;
	export let noContentPaddingOnMobile: boolean = false;

	const dispatch = createEventDispatcher();
</script>

<div 
	class="bordered-box {className}" 
	class:dynamic-height={dynamicHeight}
	class:no-content-padding-mobile={noContentPaddingOnMobile}
	style="
		--padding: {padding};
		{borderColor ? `--box-border-color: ${borderColor};` : ''}
		{backgroundColor ? `--box-background-color: ${backgroundColor};` : ''}
		{hoverBackground ? `--box-hover-background: ${hoverBackground};` : ''}
	"
>
	{#if showHeader && headerText}
		<div class="bordered-box-header">
			<div class="header-text">
				<div class="header-left">
					<slot name="header-icon" />
					{headerText}
					{#if subheading}
						<span class="header-subheading" style:color={subheadingColor || undefined}>
							{subheading}
						</span>
					{/if}
				</div>
				<div class="header-right-wrapper">
					<slot name="header-right" />
				</div>
			</div>
			<div class="header-divider"></div>
		</div>
	{/if}
	<div class="bordered-box-content" class:padded={contentPadding} class:bottom-padded={contentBottomPadding}>
		<slot />
	</div>
</div>

<style>
	:global(*) {
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
	}

	:global(*:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:active) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus-visible) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus-within) {
		box-shadow: none !important;
		outline: none !important;
	}
	.bordered-box {
		width: 100%;
		background: var(--box-background-color, var(--theme-surface, #1a1a1a));
		border: var(--theme-widget-border-width, 2px) solid var(--box-border-color, var(--theme-border, #ffffff));
		border-radius: var(--theme-widget-border-radius, var(--theme-border-radius, 0px));
		padding: 0 12px;
		transition: all 0.3s ease;
		box-sizing: border-box;
		overflow: hidden;
	}
	
	.bordered-box.dynamic-height {
		height: auto;
		min-height: fit-content;
	}

	.bordered-box:hover {
		background: var(--box-hover-background, var(--box-background-color, var(--theme-surface, #1a1a1a)));
	}

	.bordered-box:focus {
		outline: none;
	}

	.bordered-box-header {
		margin-bottom: -2px;
		padding: 8px 0 0 0;
	}
	
	.bordered-box-content {
		margin: 0 -12px 0 -12px;
		padding: 0;
	}
	
	.bordered-box-content.padded {
		margin: 0;
		padding: 0;
	}
	
	.bordered-box-content.bottom-padded {
		padding-bottom: 16px;
	}
	
	@media (max-width: 768px) {
		.bordered-box.no-content-padding-mobile .bordered-box-content.padded {
			margin: 0 -10px 0 -10px;
			padding: 0;
		}
	}

	.header-text {
		font-size: calc(16 * 1em / 14);
		font-weight: bold;
		color: var(--theme-text-primary, var(--text-primary, #ffffff));
		margin: 0 0 4px 0;
		padding: 0;
		line-height: 1.2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		font-family: var(--global-font-family, 'W95FA', 'JetBrains Mono', 'Courier New', monospace);
	}
	
	.header-left {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	
	.header-right-wrapper {
		margin-left: auto;
	}

	.header-subheading {
		font-weight: bold;
		margin-left: 0;
	}

	.header-divider {
		width: 100%;
		height: 2px;
		background: var(--box-border-color, var(--theme-border, #ffffff));
		margin: 0;
		padding: 0;
	}

	/* Theme variables are now handled by ThemeProvider */

	/* Responsive padding */
	@media (max-width: 768px) {
		.bordered-box {
			padding: 0 10px;
		}
		
		.bordered-box-header {
			padding: 6px 0 0 0;
		}
		
		.bordered-box-content {
			margin: 0 -10px 0 -10px;
		}
		
		.bordered-box-content.padded {
			margin: 0;
			padding: 0;
		}
		
		.bordered-box-content.bottom-padded {
			padding-bottom: 12px;
		}
		
		.header-divider {
			margin-left: 0;
			margin-right: 0;
		}
	}

	@media (max-width: 480px) {
		.bordered-box {
			padding: 0 6px;
		}
		
		.bordered-box-header {
			padding: 4px 0 0 0;
		}
		
		.bordered-box-content {
			margin: 0 -6px 0 -6px;
		}
		
		.bordered-box-content.padded {
			margin: 0;
			padding: 0;
		}
		
		.bordered-box-content.bottom-padded {
			padding-bottom: 8px;
		}
		
		.header-divider {
			margin-left: 0;
			margin-right: 0;
		}
	}
</style>
