<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { accentHasLowContrastInAnyTheme } from '$lib/admin/theme/color';

	// Props
	export let currentColor = '#3b82f6';
	export let disabled = false;

	$: showContrastWarning = accentHasLowContrastInAnyTheme(currentColor);

	// Event dispatcher
	const dispatch = createEventDispatcher<{
		colorChange: { color: string };
	}>();

	// Preset colors
	const presetColors = [
		{ name: 'Blue', value: '#3b82f6' },
		{ name: 'Purple', value: '#8b5cf6' },
		{ name: 'Pink', value: '#ec4899' },
		{ name: 'Red', value: '#ef4444' },
		{ name: 'Orange', value: '#f97316' },
		{ name: 'Yellow', value: '#eab308' },
		{ name: 'Green', value: '#22c55e' },
		{ name: 'Teal', value: '#14b8a6' },
		{ name: 'Cyan', value: '#06b6d4' },
		{ name: 'Indigo', value: '#6366f1' },
		{ name: 'Violet', value: '#7c3aed' },
		{ name: 'Rose', value: '#f43f5e' },
		{ name: 'Light Blue', value: '#87ceeb' },
		{ name: 'Light Yellow', value: '#ffffe0' },
		{ name: 'Light Gray', value: '#d3d3d3' },
		{ name: 'Dark Gray', value: '#2d2d2d' }
	];

	// Custom color input
	let customColor = currentColor;
	let showCustomInput = false;

	// Handle preset color selection
	function selectPresetColor(color: string) {
		currentColor = color;
		customColor = color;
		showCustomInput = false;
		dispatch('colorChange', { color });
	}

	// Handle custom color input
	function handleCustomColorChange() {
		// Validate hex color format
		const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
		if (hexColorRegex.test(customColor)) {
			currentColor = customColor;
			dispatch('colorChange', { color: customColor });
		}
	}

	// Toggle custom input
	function toggleCustomInput() {
		showCustomInput = !showCustomInput;
		if (showCustomInput) {
			customColor = currentColor;
		}
	}

	// Reset to current color when custom input is cancelled
	function cancelCustomInput() {
		showCustomInput = false;
		customColor = currentColor;
	}
</script>

<div class="accent-color-picker">
	<div class="current-color">
		<div class="color-preview" style="background-color: {currentColor}"></div>
		<span class="color-value">{currentColor.toUpperCase()}</span>
	</div>

	{#if showContrastWarning}
		<p class="contrast-warning" role="status">
			This color has low contrast in at least one admin theme (light or dark). Buttons and labels
			are adjusted automatically for readability.
		</p>
	{/if}

	<div class="preset-colors">
		<h4>Presets</h4>
		<div class="color-grid">
			{#each presetColors as preset}
				<button
					class="preset-color"
					class:active={currentColor === preset.value}
					style="background-color: {preset.value}"
					title={preset.name}
					{disabled}
					onclick={() => selectPresetColor(preset.value)}
				>
					{#if currentColor === preset.value}
						<div class="check-mark">✓</div>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	<div class="custom-color">
		<div class="custom-header">
			<h4>Custom Color</h4>
			<button
				class="toggle-custom"
				class:active={showCustomInput}
				{disabled}
				onclick={toggleCustomInput}
			>
				{showCustomInput ? 'Hide' : 'Custom'}
			</button>
		</div>

		{#if showCustomInput}
			<div class="custom-input-section">
				<div class="color-input-group">
					<input
						type="color"
						bind:value={customColor}
						{disabled}
						onchange={handleCustomColorChange}
						class="color-input"
					/>
					<input
						type="text"
						bind:value={customColor}
						{disabled}
						oninput={handleCustomColorChange}
						placeholder="#3b82f6"
						pattern="^#[0-9A-Fa-f]{6}$"
						class="hex-input"
					/>
				</div>
				<div class="custom-actions">
					<button class="apply-btn" {disabled} onclick={handleCustomColorChange}> Apply </button>
					<button class="cancel-btn" {disabled} onclick={cancelCustomInput}> Cancel </button>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.accent-color-picker {
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		color: #ffffff;
		transition: all 0.2s ease;
	}

	:global(html:not(.dark)) .accent-color-picker {
		color: #1f2937;
	}

	.current-color {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
	}

	.color-preview {
		width: 32px;
		height: 32px;
		border-radius: 6px;
		border: 2px solid rgba(255, 255, 255, 0.15);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		flex-shrink: 0;
	}

	:global(html:not(.dark)) .color-preview {
		border-color: rgba(0, 0, 0, 0.15);
	}

	.color-value {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 13px;
		font-weight: 500;
		color: #9ca3af;
		background: rgba(255, 255, 255, 0.05);
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(html:not(.dark)) .color-value {
		color: #6b7280;
		background: rgba(0, 0, 0, 0.05);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.contrast-warning {
		margin: 0 0 16px;
		padding: 10px 12px;
		border-radius: 8px;
		font-size: 0.82rem;
		line-height: 1.45;
		color: #fbbf24;
		background: rgba(251, 191, 36, 0.12);
		border: 1px solid rgba(251, 191, 36, 0.35);
	}

	:global(html:not(.dark)) .contrast-warning {
		color: #b45309;
		background: rgba(245, 158, 11, 0.12);
		border-color: rgba(245, 158, 11, 0.35);
	}

	.preset-colors h4,
	.custom-color h4 {
		margin: 0 0 12px 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: #ffffff;
	}

	:global(html:not(.dark)) .preset-colors h4,
	:global(html:not(.dark)) .custom-color h4 {
		color: #1f2937;
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
		gap: 8px;
		margin-bottom: 20px;
		width: 100%;
	}

	.preset-color {
		width: 100%;
		aspect-ratio: 1;
		max-width: 44px;
		height: auto;
		justify-self: center;
		border: 2px solid transparent;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.preset-color:hover {
		transform: scale(1.05);
		border-color: rgba(255, 255, 255, 0.3);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	:global(html:not(.dark)) .preset-color:hover {
		border-color: rgba(0, 0, 0, 0.3);
	}

	.preset-color.active {
		border-color: rgba(255, 255, 255, 0.6);
		box-shadow: 0 0 0 2px var(--accent-color, #3b82f6);
	}

	:global(html:not(.dark)) .preset-color.active {
		border-color: rgba(0, 0, 0, 0.6);
	}

	.preset-color:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.check-mark {
		color: white;
		font-weight: bold;
		font-size: 16px;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
	}

	.custom-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 12px;
	}

	.custom-header h4 {
		min-width: 0;
		flex: 1 1 auto;
	}

	.toggle-custom {
		flex-shrink: 0;
		padding: 6px 12px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		background: transparent;
		color: #ffffff;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 500;
	}

	:global(html:not(.dark)) .toggle-custom {
		border-color: rgba(0, 0, 0, 0.2);
		color: #4b5563;
	}

	.toggle-custom:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.3);
	}

	:global(html:not(.dark)) .toggle-custom:hover {
		background: rgba(0, 0, 0, 0.05);
		border-color: rgba(0, 0, 0, 0.3);
	}

	.toggle-custom.active {
		background: var(--accent-bg, var(--accent-color, #3b82f6));
		border-color: var(--accent-color, #3b82f6);
		color: var(--accent-fg);
	}

	.custom-input-section {
		margin-top: 12px;
	}

	.color-input-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
		min-width: 0;
	}

	.color-input {
		width: 48px;
		height: 32px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		background: transparent;
		cursor: pointer;
	}

	:global(html:not(.dark)) .color-input {
		border-color: rgba(0, 0, 0, 0.2);
	}

	.hex-input {
		flex: 1 1 140px;
		min-width: 0;
		padding: 6px 8px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.05);
		color: #ffffff;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 13px;
		height: 32px;
	}

	:global(html:not(.dark)) .hex-input {
		border-color: rgba(0, 0, 0, 0.2);
		background: rgba(0, 0, 0, 0.02);
		color: #1f2937;
	}

	.hex-input:focus {
		outline: none;
		border-color: var(--accent-color, #3b82f6);
		box-shadow: 0 0 0 2px var(--accent-color-light, rgba(59, 130, 246, 0.2));
	}

	.custom-actions {
		display: flex;
		gap: 8px;
	}

	.apply-btn,
	.cancel-btn {
		padding: 8px 16px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 500;
	}

	:global(html:not(.dark)) .apply-btn,
	:global(html:not(.dark)) .cancel-btn {
		border-color: rgba(0, 0, 0, 0.2);
	}

	.apply-btn {
		background: var(--accent-bg, var(--accent-color, #3b82f6));
		border-color: var(--accent-color, #3b82f6);
		color: var(--accent-fg);
	}

	.apply-btn:hover {
		opacity: 0.9;
	}

	.cancel-btn {
		background: transparent;
		color: #ffffff;
	}

	:global(html:not(.dark)) .cancel-btn {
		color: #1f2937;
	}

	.cancel-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	:global(html:not(.dark)) .cancel-btn:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	.apply-btn:disabled,
	.cancel-btn:disabled,
	.toggle-custom:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
