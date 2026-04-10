<script lang="ts">
	import { onMount } from 'svelte';
	import { siteConfig, loadSiteConfig } from '$lib/site/stores/siteConfig';
	import { CloudRain } from 'lucide-svelte';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import { toast } from 'svelte-sonner';
	import { notifySiteConfigConsumers } from '$lib/shared/utils/siteConfigLiveSync';

	let localSettings = $state({
		defaultWeatherType: 'none',
		defaultWeatherSpeed: 1.0,
		enforceWeatherEffects: false
	});

	let isSaving = $state(false);

	onMount(() => {
		// Load current settings from site config
		siteConfig.subscribe((config) => {
			localSettings.defaultWeatherType = config.default_weather_type;
			localSettings.defaultWeatherSpeed = config.default_weather_speed;
			localSettings.enforceWeatherEffects = config.enforce_weather_effects;
		});
	});

	async function saveSettings() {
		isSaving = true;

		try {
			// Update site configuration
			const updates = [
				{ key: 'default_weather_type', value: localSettings.defaultWeatherType },
				{ key: 'default_weather_speed', value: localSettings.defaultWeatherSpeed },
				{ key: 'enforce_weather_effects', value: localSettings.enforceWeatherEffects }
			];

			for (const update of updates) {
				const response = await fetch(`/api/config/${update.key}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include',
					body: JSON.stringify({
						value: update.value,
						dataType: update.key.includes('speed')
							? 'number'
							: update.key.includes('enforce')
								? 'boolean'
								: 'string'
					})
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || `Failed to update ${update.key}`);
				}
			}

			// Reload site config
			await loadSiteConfig();
			notifySiteConfigConsumers();
			toast.success('Weather settings saved successfully');
		} catch (error: any) {
			console.error('Failed to save weather settings:', error);
			toast.error('Failed to save weather settings', {
				description: error.message || 'Please try again'
			});
		} finally {
			isSaving = false;
		}
	}

	function handleWeatherTypeChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		localSettings.defaultWeatherType = select.value;
	}

	function handleSpeedChange(event: Event) {
		const input = event.target as HTMLInputElement;
		localSettings.defaultWeatherSpeed = parseFloat(input.value);
	}
</script>

<div class="weather-settings">
	<div class="settings-description">
		<p>Configure the default weather effects and user permissions for your website.</p>
	</div>

	<div class="form-group">
		<label for="weather-type">Default Weather Type</label>
		<select
			id="weather-type"
			class="form-select"
			value={localSettings.defaultWeatherType}
			onchange={handleWeatherTypeChange}
		>
			<option value="none">Disabled</option>
			<option value="rain">Rain</option>
			<option value="snow">Snow</option>
		</select>
		<p class="form-help">
			This will be the default weather effect when users first visit your site.
		</p>
	</div>

	<div class="form-group">
		<label for="weather-speed">Default Weather Speed</label>
		<input
			type="range"
			id="weather-speed"
			class="form-range"
			min="0.5"
			max="3.0"
			step="0.1"
			value={localSettings.defaultWeatherSpeed}
			oninput={handleSpeedChange}
		/>
		<div class="range-value">{localSettings.defaultWeatherSpeed}x</div>
		<p class="form-help">Adjust the default speed of weather effects (0.5x = slow, 3.0x = fast).</p>
	</div>

	<div class="form-group toggle-group">
		<div class="toggle-wrapper">
			<Toggle bind:checked={localSettings.enforceWeatherEffects} />
			<span class="toggle-label"
				>Enforce weather effects <span class="toggle-label-subtext"
					>(prevent users from changing)</span
				></span
			>
		</div>
		<p class="form-help">
			When enabled, users won't be able to change weather settings from the frontend.
		</p>
	</div>

	<div class="form-actions">
		<button type="button" class="save-button" onclick={saveSettings} disabled={isSaving}>
			{isSaving ? 'Saving...' : 'Save Settings'}
		</button>
	</div>
</div>

<style>
	.weather-settings {
		width: 100%;
		box-sizing: border-box;
	}

	.settings-description {
		margin-bottom: 24px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.settings-description p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
	}

	.form-group {
		margin-bottom: 24px;
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.form-group label {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
		margin-bottom: 8px;
	}

	.form-select {
		width: 100%;
		padding: 12px 16px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		font-size: 14px;
		transition: all 0.15s ease-in-out;
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #ffffff);
		cursor: pointer;
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 16px center;
		padding-right: 44px;
	}

	.form-select:hover {
		border-color: var(--border-color-hover, #4a4a4a);
	}

	.form-select:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.form-select option {
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #ffffff);
		padding: 12px;
	}

	.form-range {
		width: 100%;
		transition: all 0.15s ease-in-out;
	}

	.form-range:focus {
		outline: none;
	}

	.form-range {
		height: 6px;
		border-radius: 3px;
		background: var(--bg-tertiary, #3a3a3a);
		outline: none;
		-webkit-appearance: none;
		appearance: none;
		padding: 0;
	}

	.form-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--accent-color, #6366f1);
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.form-range::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--accent-color, #6366f1);
		cursor: pointer;
		border: none;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.range-value {
		text-align: center;
		font-weight: 500;
		color: var(--accent-color, #6366f1);
		margin-top: 8px;
		font-size: 14px;
	}

	.toggle-group {
		margin-bottom: 0;
	}

	.toggle-wrapper {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		flex-wrap: wrap;
	}

	.toggle-label {
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		line-height: 1.4;
		min-width: 0;
		flex: 1 1 10rem;
		overflow-wrap: anywhere;
	}

	.toggle-label-subtext {
		color: var(--text-secondary, #a1a1aa);
	}

	.form-help {
		color: var(--text-muted, #6b7280);
		font-size: 12px;
		margin: 6px 0 0 0;
		line-height: 1.4;
	}

	.form-actions {
		margin-top: 32px;
		padding-top: 20px;
		border-top: 1px solid var(--border-color, #3a3a3a);
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.save-button {
		background: var(--accent-color, #6366f1);
		color: #ffffff;
		border: none;
		padding: 12px 24px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		align-self: flex-start;
	}

	.save-button:hover:not(:disabled) {
		background: var(--accent-color-dark, #4f46e5);
	}

	.save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 480px) {
		.save-button {
			align-self: stretch;
			width: 100%;
			text-align: center;
		}

		.settings-description p {
			font-size: 13px;
		}
	}
</style>
