<script lang="ts">
	import { onMount } from 'svelte';
	import { Save, Eye, EyeOff } from 'lucide-svelte';
	import { 
		getBannerConfig, 
		saveBannerConfig, 
		type BannerConfig 
	} from '$lib/admin/services/bannerService';
	import BannerDisplay from '$lib/site/components/BannerDisplay.svelte';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import MarkdownEditor from '$lib/admin/components/MarkdownEditor.svelte';

	let config = $state<BannerConfig>({
		text: '',
		enabled: false,
		backgroundColor: '#000000',
		textColor: '#ffffff',
		speed: 50,
		transparentBackground: false
	});

	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');

	async function loadConfig() {
		try {
			loading = true;
			error = '';

			const data = await getBannerConfig();
			config = data;
		} catch (err) {
			console.error('Error loading banner config:', err);
			error = err instanceof Error ? err.message : 'Failed to load configuration';
		} finally {
			loading = false;
		}
	}

	async function saveConfig() {
		try {
			saving = true;
			error = '';
			success = '';

			// Validation
			if (!config.text.trim()) {
				error = 'Banner text is required';
				return;
			}

			const data = await saveBannerConfig(config);
			config = data;
			success = 'Banner configuration saved successfully!';
			
			setTimeout(() => {
				success = '';
			}, 3000);
		} catch (err) {
			console.error('Error saving banner config:', err);
			error = err instanceof Error ? err.message : 'Failed to save configuration';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		loadConfig();
	});
</script>

<div class="banner-config">
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading configuration...</p>
		</div>
	{:else}
		<div class="config-form">
			<!-- Banner Text -->
			<div class="form-group">
				<label for="banner-text">
					Banner Text
					<span class="required">*</span>
				</label>
				<MarkdownEditor
					bind:value={config.text}
					placeholder="Enter your scrolling banner text..."
					minHeight="100px"
					enabledTools={['bold', 'italic', 'underline', 'strikethrough']}
					outputFormat="html"
				/>
				<p class="help-text">This text will scroll across the banner. Use the toolbar to format text (bold, italic, underline, strikethrough).</p>
			</div>

			<!-- Enabled Toggle -->
			<div class="form-group">
				<div class="banner-enabled-toggle">
					<div class="toggle-with-icon">
						<Toggle bind:checked={config.enabled} />
						<span class="toggle-text">
							{#if config.enabled}
								<Eye size={16} />
								Banner Enabled
							{:else}
								<EyeOff size={16} />
								Banner Disabled
							{/if}
						</span>
					</div>
					<p class="help-text">Toggle banner visibility on the public site</p>
				</div>
			</div>

			<!-- Color Settings -->
			<div class="form-group">
				<div class="form-group-label">Colors</div>
				<div class="color-settings">
					<!-- Background Color -->
					{#if !config.transparentBackground}
						<div class="color-row">
							<label for="bg-color" class="color-label">Background Color</label>
							<div class="color-input-group">
								<button type="button" class="color-swatch" onclick={() => document.getElementById('bg-color')?.click()} aria-label="Choose background color">
									<div class="color-swatch-inner" style="background-color: {config.backgroundColor};"></div>
									<input
										type="color"
										id="bg-color"
										bind:value={config.backgroundColor}
										class="color-input-hidden"
									/>
								</button>
								<input
									type="text"
									bind:value={config.backgroundColor}
									placeholder="#000000"
									class="color-hex-input"
									maxlength="7"
								/>
							</div>
						</div>
					{/if}

					<!-- Transparent Background Toggle -->
					<div class="toggle-row">
						<Toggle bind:checked={config.transparentBackground} label="Transparent Background" size="small" />
					</div>

					<!-- Text Color -->
					<div class="color-row">
						<label for="text-color" class="color-label">Text Color</label>
						<div class="color-input-group">
							<button type="button" class="color-swatch" onclick={() => document.getElementById('text-color')?.click()} aria-label="Choose text color">
								<div class="color-swatch-inner" style="background-color: {config.textColor};"></div>
								<input
									type="color"
									id="text-color"
									bind:value={config.textColor}
									class="color-input-hidden"
								/>
							</button>
							<input
								type="text"
								bind:value={config.textColor}
								placeholder="#ffffff"
								class="color-hex-input"
								maxlength="7"
							/>
						</div>
					</div>
				</div>
			</div>

			<!-- Speed Setting -->
			<div class="form-group">
			<label for="speed">
				Animation Speed
				<span class="speed-value">{config.speed} px/s</span>
			</label>
			<input
				type="range"
				id="speed"
				value={config.speed}
				oninput={(e) => config.speed = Number((e.target as HTMLInputElement).value)}
				min="20"
				max="300"
				step="10"
				class="range-input"
			/>
			<div class="range-labels">
				<span>Slow</span>
				<span>Fast</span>
			</div>
			</div>

			<!-- Preview -->
			{#if config.text}
				<div class="preview-section">
					<h3>Preview</h3>
					<div class="preview-wrapper">
						<BannerDisplay config={config} />
					</div>
				</div>
			{/if}

			<!-- Messages -->
			{#if error}
				<div class="message error-message">
					{error}
				</div>
			{/if}

			{#if success}
				<div class="message success-message">
					{success}
				</div>
			{/if}

			<!-- Save Button -->
			<div class="form-actions">
				<button
					class="save-button"
					onclick={saveConfig}
					disabled={saving}
				>
					<Save size={18} />
					{saving ? 'Saving...' : 'Save Configuration'}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.banner-config {
		padding: 24px;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 20px;
		color: var(--text-secondary, #a1a1aa);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--border-color, #3a3a3a);
		border-top: 3px solid var(--accent-color, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.config-form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	label,
	.form-group-label {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.required {
		color: #ef4444;
	}

	.speed-value {
		margin-left: auto;
		color: var(--accent-color, #6366f1);
		font-size: 13px;
	}


	.help-text {
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
		margin: 0;
	}

	.banner-enabled-toggle {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.toggle-with-icon {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: var(--bg-tertiary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.toggle-with-icon:hover {
		border-color: var(--accent-color, #6366f1);
	}

	.toggle-text {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	/* Color settings */
	.color-settings {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.color-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.toggle-row {
		display: flex;
		align-items: center;
	}

	.color-label {
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
		font-weight: 400;
	}

	.color-input-group {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.color-swatch {
		width: 48px;
		height: 48px;
		border: 2px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		cursor: pointer;
		position: relative;
		overflow: hidden;
		transition: border-color 0.2s ease;
		padding: 0;
		background-image: 
			linear-gradient(45deg, #555 25%, transparent 25%),
			linear-gradient(-45deg, #555 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #555 75%),
			linear-gradient(-45deg, transparent 75%, #555 75%);
		background-size: 8px 8px;
		background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
		background-color: #333;
	}

	.color-swatch:hover {
		border-color: var(--accent-color, #6366f1);
	}

	.color-swatch-inner {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.color-input-hidden {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		pointer-events: none;
	}

	.color-hex-input {
		flex: 1;
		background: var(--bg-tertiary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 12px 14px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-family: monospace;
	}

	.color-hex-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.range-input {
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: var(--bg-tertiary, #2d2d2d);
		outline: none;
		appearance: none;
		-webkit-appearance: none;
	}

	.range-input::-webkit-slider-thumb {
		appearance: none;
		-webkit-appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--accent-color, #6366f1);
		cursor: pointer;
	}

	.range-input::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--accent-color, #6366f1);
		cursor: pointer;
		border: none;
	}

	.range-labels {
		display: flex;
		justify-content: space-between;
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
	}

	.preview-section {
		margin-top: 8px;
	}

	.preview-section h3 {
		color: var(--text-primary, #ffffff);
		font-size: 16px;
		margin: 0 0 12px 0;
	}

	.preview-wrapper {
		border-radius: 8px;
		border: 1px solid var(--border-color, #3a3a3a);
		overflow: hidden;
	}

	.preview-wrapper :global(.banner-container) {
		border-bottom: none;
	}

	.message {
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 14px;
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.success-message {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 8px;
	}

	.save-button {
		background: var(--accent-color, #6366f1);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 12px 24px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 8px;
		transition: all 0.2s ease;
	}

	.save-button:hover:not(:disabled) {
		background: var(--accent-hover, #5b5bf6);
		transform: translateY(-1px);
	}

	.save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.banner-config {
			padding: 16px;
		}
	}
</style>

