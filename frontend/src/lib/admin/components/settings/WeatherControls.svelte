<script lang="ts">
	import { weatherSettings, setWeatherType, setWeatherSpeed, weatherConfig, restoreUserPreferences } from '$lib/site/stores/weather';
	import { enforceWeatherEffects } from '$lib/site/stores/siteConfig';

	let { class: className = '' } = $props();

	// Watch for enforcement changes and restore user preferences when turned off
	$effect(() => {
		if (!$enforceWeatherEffects) {
			restoreUserPreferences();
		}
	});

	// Weather type options
	const weatherOptions = [
		{ value: 'none', label: weatherConfig.none.name },
		{ value: 'rain', label: weatherConfig.rain.name },
		{ value: 'snow', label: weatherConfig.snow.name }
	];

	// Handle weather type change
	function handleWeatherTypeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		if (target) {
			setWeatherType(target.value as 'none' | 'rain' | 'snow');
		}
	}

	// Handle speed change
	function handleSpeedChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target) {
			setWeatherSpeed(parseFloat(target.value));
		}
	}
</script>

<div class="weather-controls" class:className>
	<!-- Weather Type -->
	<div class="control-group">
		<label class="control-label" for="weather-type">
			Effect
			{#if $enforceWeatherEffects}
				<span class="enforced-indicator">(Enforced)</span>
			{/if}
		</label>
		<select
			id="weather-type"
			class="weather-select"
			class:disabled={$enforceWeatherEffects}
			value={$weatherSettings?.type || 'none'}
			onchange={handleWeatherTypeChange}
			disabled={$enforceWeatherEffects}
		>
			{#each weatherOptions as option}
				<option value={option.value}>
					{option.label}
				</option>
			{/each}
		</select>
	</div>

		{#if $weatherSettings?.type !== 'none'}
		<!-- Speed -->
		<div class="control-group">
			<label class="control-label" for="weather-speed">
				Speed: {$weatherSettings?.speed?.toFixed(1) || '1.0'}x
				{#if $enforceWeatherEffects}
					<span class="enforced-indicator">(Enforced)</span>
				{/if}
			</label>
			<input
				id="weather-speed"
				type="range"
				class="weather-slider"
				class:disabled={$enforceWeatherEffects}
				min="0.5"
				max="3.0"
				step="0.1"
				value={$weatherSettings?.speed || 1.0}
				oninput={handleSpeedChange}
				disabled={$enforceWeatherEffects}
			/>
		</div>
	{/if}
</div>

<style>
	.weather-controls {
		display: flex;
		flex-direction: column;
		gap: 15px;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.control-label {
		font-size: 11px;
		font-weight: bold;
		color: var(--theme-text-primary, #ffffff);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0;
	}

	.enforced-indicator {
		font-size: 9px;
		color: var(--theme-text-muted, #71717a);
		font-weight: normal;
		text-transform: none;
		margin-left: 4px;
	}

	.weather-select,
	.weather-slider {
		width: 100%;
		max-width: 100%;
		background: var(--theme-background, #0a0a0a);
		border: 2px solid var(--theme-border, #ffffff);
		color: var(--theme-text-primary, #ffffff);
		padding: 4px 6px;
		font-size: 12px;
		height: 28px;
		box-sizing: border-box;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		cursor: pointer;
		outline: none;
		border-radius: 0;
		font-family: inherit;
	}

	.weather-select:focus,
	.weather-slider:focus {
		border-color: var(--theme-accent, #90ee90);
		box-shadow: 0 0 0 1px var(--theme-accent, #90ee90);
	}

	.weather-select:hover {
		background: color-mix(in srgb, var(--theme-background, #0a0a0a) 90%, var(--theme-accent, #90ee90) 10%);
	}

	.weather-select:active {
		border-color: var(--theme-accent, #90ee90);
	}

	.weather-slider {
		padding: 0;
		height: 18px;
		background: var(--theme-surface, #1a1a1a);
		border: 2px solid var(--theme-border, #ffffff);
	}

	.weather-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		background: var(--theme-accent, #90ee90);
		border: 1px solid var(--theme-border, #ffffff);
		cursor: grab;
		border-radius: 0;
		box-shadow: 0 0 10px var(--theme-accent, #90ee90);
	}

	.weather-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		background: var(--theme-accent, #90ee90);
		border: 1px solid var(--theme-border, #ffffff);
		cursor: grab;
		border-radius: 0;
		box-shadow: 0 0 10px var(--theme-accent, #90ee90);
	}

	.weather-slider::-webkit-slider-runnable-track {
		background: transparent;
		border: none;
	}

	.weather-slider::-moz-range-track {
		background: transparent;
		border: none;
	}

	/* Disabled state */
	.weather-select.disabled,
	.weather-slider.disabled {
		background: var(--theme-surface, #1a1a1a);
		color: var(--theme-text-muted, #71717a);
		cursor: not-allowed;
		opacity: 0.6;
	}

	.weather-select.disabled:hover,
	.weather-slider.disabled:hover {
		background: var(--theme-surface, #1a1a1a);
	}

	.weather-select.disabled:focus,
	.weather-slider.disabled:focus {
		border-color: var(--theme-border, #ffffff);
		box-shadow: none;
	}

	/* Responsive design */
	@media (max-width: 480px) {
		.control-label {
			font-size: 10px;
		}

		.weather-select {
			font-size: 11px;
			height: 26px;
		}

		.weather-slider {
			font-size: 11px;
			height: 22px;
		}

		.weather-slider::-webkit-slider-thumb {
			width: 18px;
			height: 18px;
		}

		.weather-slider::-moz-range-thumb {
			width: 18px;
			height: 18px;
		}
	}

	@media (max-width: 360px) {
		.weather-controls {
			gap: 12px;
		}

		.enforced-indicator {
			display: inline;
			margin-left: 2px;
		}
	}
</style>
