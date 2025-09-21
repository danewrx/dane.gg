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
			Weather Effects
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
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.control-label {
		font-size: 11px;
		font-weight: bold;
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0;
	}

	.enforced-indicator {
		font-size: 9px;
		color: var(--text-muted);
		font-weight: normal;
		text-transform: none;
		margin-left: 4px;
	}

	.weather-select,
	.weather-slider {
		background: #ffffff;
		border: 2px inset #c0c0c0;
		color: #000000;
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
		border-color: #000080;
		box-shadow: 0 0 0 1px #000080;
	}

	.weather-select:hover {
		background: #e0e0e0;
	}

	.weather-select:active {
		border: 2px inset #808080;
	}

	.weather-slider {
		padding: 0;
		height: 18px;
		background: #c0c0c0;
		border: 2px inset #808080;
	}

	.weather-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		background: #000080;
		border: 1px outset #c0c0c0;
		cursor: grab;
		border-radius: 0;
	}

	.weather-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		background: #000080;
		border: 1px outset #c0c0c0;
		cursor: grab;
		border-radius: 0;
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
		background: #e0e0e0;
		color: #888888;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.weather-select.disabled:hover,
	.weather-slider.disabled:hover {
		background: #e0e0e0;
	}

	.weather-select.disabled:focus,
	.weather-slider.disabled:focus {
		border-color: #c0c0c0;
		box-shadow: none;
	}

	/* Responsive design */
	@media (max-width: 480px) {
		.control-label {
			font-size: 10px;
		}

		.weather-select,
		.weather-slider {
			font-size: 11px;
			height: 26px;
		}
	}
</style>
