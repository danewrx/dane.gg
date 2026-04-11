<script lang="ts">
	interface Tab {
		id: string;
		label: string;
		value: any;
		disabled?: boolean;
	}

	let {
		tabs,
		activeTab,
		onTabChange,
		variant = 'default',
		size = 'md',
		fullWidth = false,
		disabled = false
	}: {
		tabs: Tab[];
		activeTab: string;
		onTabChange: (tabId: string, value: any) => void;
		variant?: 'default' | 'pills' | 'underline';
		size?: 'sm' | 'md' | 'lg';
		fullWidth?: boolean;
		disabled?: boolean;
	} = $props();

	function handleTabClick(tab: Tab) {
		if (disabled || tab.disabled) return;
		onTabChange(tab.id, tab.value);
	}
</script>

<div class="tabs-container" class:full-width={fullWidth} class:disabled>
	<div
		class="tabs"
		class:variant-pills={variant === 'pills'}
		class:variant-underline={variant === 'underline'}
		class:size-sm={size === 'sm'}
		class:size-md={size === 'md'}
		class:size-lg={size === 'lg'}
		role="tablist"
		aria-orientation="horizontal"
	>
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				class="tab"
				class:active={activeTab === tab.id}
				class:disabled={tab.disabled}
				onclick={() => handleTabClick(tab)}
				disabled={disabled || tab.disabled}
				role="tab"
				aria-selected={activeTab === tab.id}
				aria-controls="panel-{tab.id}"
				tabindex={activeTab === tab.id ? 0 : -1}
			>
				{tab.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.tabs-container {
		display: inline-flex;
		width: auto;
		max-width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.tabs-container.full-width {
		display: flex;
		width: 100%;
	}

	.tabs-container.disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	.tabs {
		display: flex;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		padding: 4px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		position: relative;
		gap: 2px;
		min-width: 0;
		box-sizing: border-box;
	}

	:global(.dark) .tabs {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	:global(html:not(.dark)) .tabs {
		background: rgba(0, 0, 0, 0.05);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.tabs.variant-pills {
		background: transparent;
		border: none;
		gap: 4px;
		padding: 0;
	}

	.tabs.variant-underline {
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0;
		padding: 0;
		gap: 0;
	}

	:global(html:not(.dark)) .tabs.variant-underline {
		border-bottom-color: rgba(0, 0, 0, 0.1);
	}

	.tab {
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		white-space: nowrap;
		position: relative;
		flex: 1 1 0;
		min-width: 0;
	}

	:global(html:not(.dark)) .tab {
		color: rgba(0, 0, 0, 0.7);
	}

	/* Size variants */
	.size-sm .tab {
		padding: 6px 12px;
		font-size: 0.8rem;
	}

	.size-md .tab {
		padding: 8px 16px;
		font-size: 0.875rem;
	}

	.size-lg .tab {
		padding: 10px 20px;
		font-size: 0.9rem;
	}

	/* Default variant styles */
	.tab:hover:not(.disabled):not(.active) {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	:global(html:not(.dark)) .tab:hover:not(.disabled):not(.active) {
		background: rgba(0, 0, 0, 0.1);
		color: rgba(0, 0, 0, 0.9);
	}

	.tab.active {
		background: var(--accent-color, #3b82f6);
		color: var(--accent-color-contrast, white);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	/* Pills variant styles */
	.variant-pills .tab {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
	}

	:global(html:not(.dark)) .variant-pills .tab {
		background: rgba(0, 0, 0, 0.05);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.variant-pills .tab:hover:not(.disabled):not(.active) {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	:global(html:not(.dark)) .variant-pills .tab:hover:not(.disabled):not(.active) {
		background: rgba(0, 0, 0, 0.1);
		border-color: rgba(0, 0, 0, 0.2);
	}

	.variant-pills .tab.active {
		background: var(--accent-color, #3b82f6);
		border-color: var(--accent-color, #3b82f6);
		color: var(--accent-color-contrast, white);
	}

	/* Underline variant styles */
	.variant-underline .tab {
		border-radius: 0;
		border-bottom: 2px solid transparent;
		background: transparent;
		padding-bottom: 10px;
		margin-bottom: -1px;
	}

	.variant-underline .tab:hover:not(.disabled):not(.active) {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.05);
	}

	:global(html:not(.dark)) .variant-underline .tab:hover:not(.disabled):not(.active) {
		color: rgba(0, 0, 0, 0.9);
		background: rgba(0, 0, 0, 0.05);
	}

	.variant-underline .tab.active {
		color: var(--accent-color, #3b82f6);
		border-bottom-color: var(--accent-color, #3b82f6);
		background: transparent;
		box-shadow: none;
	}

	/* Disabled states */
	.tab.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Full width */
	.full-width .tabs {
		width: 100%;
	}

	.full-width .tab {
		flex: 1 1 0;
		min-width: 0;
	}

	@media (max-width: 480px) {
		.size-md .tab {
			padding: 8px 6px;
			font-size: 0.8rem;
		}

		.size-sm .tab {
			padding: 6px 8px;
			font-size: 0.75rem;
		}

		.size-lg .tab {
			padding: 8px 12px;
			font-size: 0.85rem;
		}

		.tabs.variant-pills {
			flex-wrap: wrap;
		}
	}

	/* Focus styles */
	.tab:focus-visible {
		outline: 2px solid rgba(99, 102, 241, 0.5);
		outline-offset: 2px;
	}
</style>
