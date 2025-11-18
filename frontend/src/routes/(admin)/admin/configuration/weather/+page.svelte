<script lang="ts">
	import { onMount } from 'svelte';
	import { siteConfig, loadSiteConfig } from '$lib/site/stores/siteConfig';
	import { CloudRain } from 'lucide-svelte';

	let localSettings = $state({
		defaultWeatherType: 'none',
		defaultWeatherSpeed: 1.0,
		enforceWeatherEffects: false
	});

	let isSaving = $state(false);
	let saveMessage = $state('');

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
		saveMessage = '';
		
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
					body: JSON.stringify({
						value: update.value,
						dataType: update.key.includes('speed') ? 'number' : 
								 update.key.includes('enforce') ? 'boolean' : 'string'
					})
				});

				if (!response.ok) {
					throw new Error(`Failed to update ${update.key}`);
				}
			}

			// Reload site config
			await loadSiteConfig();
			saveMessage = 'Weather settings saved successfully!';
		} catch (error: any) {
			console.error('Failed to save weather settings:', error);
			saveMessage = `Failed to save weather settings: ${error.message}`;
		} finally {
			isSaving = false;
			setTimeout(() => {
				saveMessage = '';
			}, 3000);
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

	function handleEnforceChange(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		localSettings.enforceWeatherEffects = checkbox.checked;
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
		<p class="form-help">This will be the default weather effect when users first visit your site.</p>
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

	<div class="form-group checkbox-group">
		<label class="checkbox-label">
			<input 
				type="checkbox" 
				class="checkbox-input"
				checked={localSettings.enforceWeatherEffects}
				onchange={handleEnforceChange}
			/>
			<span class="checkbox-text">Enforce weather effects (prevent users from changing)</span>
		</label>
		<p class="form-help">When enabled, users won't be able to change weather settings from the frontend.</p>
	</div>

	<div class="form-actions">
		<button 
			type="button"
			class="save-button" 
			onclick={saveSettings}
			disabled={isSaving}
		>
			{isSaving ? 'Saving...' : 'Save Settings'}
		</button>
		
		{#if saveMessage}
			<div class="save-message" class:error={saveMessage.includes('Failed')}>
				{saveMessage}
			</div>
		{/if}
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
		border-bottom: 1px solid #2a2a2a;
	}

	.settings-description p {
		color: #a1a1aa;
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
		color: #ffffff;
		margin-bottom: 8px;
	}

	.form-select,
	.form-range {
		width: 100%;
		padding: 12px;
		border: 1px solid #3a3a3a;
		border-radius: 6px;
		font-size: 14px;
		transition: all 0.15s ease-in-out;
		background: #1a1a1a;
		color: #ffffff;
	}

	.form-select:focus,
	.form-range:focus {
		outline: none;
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.form-range {
		height: 6px;
		border-radius: 3px;
		background: #3a3a3a;
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
		background: #6366f1;
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.form-range::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #6366f1;
		cursor: pointer;
		border: none;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.range-value {
		text-align: center;
		font-weight: 500;
		color: #6366f1;
		margin-top: 8px;
		font-size: 14px;
	}

	.checkbox-group {
		margin-bottom: 0;
	}

	.checkbox-label {
		display: flex;
		align-items: flex-start;
		cursor: pointer;
		font-size: 14px;
		color: #ffffff;
		gap: 12px;
	}

	.checkbox-input {
		margin: 0;
		width: 16px;
		height: 16px;
		accent-color: #6366f1;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.checkbox-text {
		user-select: none;
		line-height: 1.4;
	}

	.form-help {
		color: #6b7280;
		font-size: 12px;
		margin: 6px 0 0 0;
		line-height: 1.4;
	}

	.form-actions {
		margin-top: 32px;
		padding-top: 20px;
		border-top: 1px solid #2a2a2a;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.save-button {
		background: #8b5cf6;
		color: #ffffff;
		border: none;
		padding: 12px 24px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		align-self: flex-start;
	}

	.save-button:hover:not(:disabled) {
		background: #7c3aed;
		transform: translateY(-1px);
	}

	.save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.save-message {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
		border: 1px solid rgba(16, 185, 129, 0.3);
	}

	.save-message.error {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.3);
	}
</style>
