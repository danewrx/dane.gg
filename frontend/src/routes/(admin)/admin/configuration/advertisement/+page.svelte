<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { Save, Eye, EyeOff, ExternalLink } from 'lucide-svelte';
	import { siteConfig, loadSiteConfig } from '$lib/site/stores/siteConfig';
	import { toast } from 'svelte-sonner';
	import { notifySiteConfigConsumers } from '$lib/shared/utils/siteConfigLiveSync';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import FileUpload, { type UploadedFile } from '$lib/admin/components/ui/FileUpload.svelte';

	let pendingEnabled = $state(false);
	let pendingImageUrl = $state('');
	let pendingLinkUrl = $state('');

	let savedEnabled = $state(false);
	let savedImageUrl = $state('');
	let savedLinkUrl = $state('');

	let isSaving = $state(false);

	const dirty = $derived(
		pendingEnabled !== savedEnabled ||
			pendingImageUrl !== savedImageUrl ||
			pendingLinkUrl !== savedLinkUrl
	);

	function syncFromConfig(c: import('$lib/site/stores/siteConfig').SiteConfig) {
		savedEnabled = Boolean(c.advert_enabled);
		pendingEnabled = savedEnabled;
		savedImageUrl = c.advert_image_url ?? '';
		pendingImageUrl = savedImageUrl;
		savedLinkUrl = c.advert_link_url ?? '';
		pendingLinkUrl = savedLinkUrl;
	}

	onMount(() => {
		const unsub = siteConfig.subscribe(syncFromConfig);
		return unsub;
	});

	function handleImageUpload(file: UploadedFile | UploadedFile[]) {
		const uploadedFile = Array.isArray(file) ? file[0] : file;
		if (uploadedFile) {
			pendingImageUrl = uploadedFile.path;
			toast.success('Image uploaded');
		}
	}

	function handleUploadError(error: string) {
		toast.error('Upload failed', { description: error });
	}

	async function putConfig(key: string, value: unknown, dataType: string) {
		const response = await fetch(`/api/config/${key}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ value, dataType })
		});
		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data.error || `Failed to update ${key}`);
		}
	}

	async function saveSettings() {
		if (!dirty) return;
		isSaving = true;
		try {
			if (pendingImageUrl !== savedImageUrl) {
				await putConfig('advert_image_url', pendingImageUrl.trim(), 'string');
			}
			if (pendingLinkUrl !== savedLinkUrl) {
				await putConfig('advert_link_url', pendingLinkUrl.trim(), 'string');
			}
			if (pendingEnabled !== savedEnabled) {
				await putConfig('advert_enabled', pendingEnabled, 'boolean');
			}
			await loadSiteConfig();
			notifySiteConfigConsumers();
			syncFromConfig(get(siteConfig));
			toast.success('Advertisement settings saved');
		} catch (e) {
			logger.error(e);
			toast.error('Failed to save advertisement', {
				description: e instanceof Error ? e.message : 'Try again'
			});
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>{adminPageTitle('Advertisement')}</title>
</svelte:head>

<div class="advert-config">
	<p class="page-description">
		Manage the image-only advertisement banner shown in the homepage right column, between Recent
		posts and Systems status.
	</p>

	<div class="config-form">
		<!-- Enabled Toggle -->
		<div class="form-group">
			<div class="advert-enabled-toggle">
				<div class="toggle-with-icon">
					<Toggle bind:checked={pendingEnabled} />
					<span class="toggle-text">
						{#if pendingEnabled}
							<Eye size={16} />
							Advertisement Enabled
						{:else}
							<EyeOff size={16} />
							Advertisement Disabled
						{/if}
					</span>
				</div>
				<p class="help-text">Controls whether the advert is displayed on the public site.</p>
			</div>
		</div>

		<!-- Link URL -->
		<div class="form-group">
			<label for="advert-link">Link URL</label>
			<input
				id="advert-link"
				class="text-input"
				type="url"
				placeholder="https://example.com"
				bind:value={pendingLinkUrl}
			/>
			<p class="help-text">
				Opens in a new tab when the advert is clicked. Leave empty for a non-clickable image.
			</p>
		</div>

		<!-- Advert Image -->
		<div class="form-group">
			<div class="form-group-label">Advert Image</div>
			<FileUpload
				acceptedTypes={['image']}
				onUpload={handleImageUpload}
				onError={handleUploadError}
				showPreview={false}
				label="Upload Image"
			/>
			<input
				class="text-input"
				type="text"
				placeholder="/uploads/advert.png or https://..."
				bind:value={pendingImageUrl}
			/>
			<p class="help-text">
				Upload an image or paste an external URL. Displayed as a full-width banner with no border.
				Use a wide image (e.g. 728&times;90) for best results.
			</p>
		</div>

		<!-- Preview -->
		{#if pendingImageUrl}
			<div class="preview-section">
				<h3>Preview</h3>
				<div class="preview-wrapper">
					<img src={pendingImageUrl} alt="Advertisement preview" />
				</div>
				{#if pendingLinkUrl}
					<a class="preview-link" href={pendingLinkUrl} target="_blank" rel="noopener noreferrer">
						<ExternalLink size={14} aria-hidden="true" />
						{pendingLinkUrl}
					</a>
				{/if}
			</div>
		{/if}

		<!-- Save Button -->
		<div class="form-actions">
			<button class="save-button" onclick={saveSettings} disabled={!dirty || isSaving}>
				<Save size={18} />
				{isSaving ? 'Saving...' : 'Save Configuration'}
			</button>
		</div>
	</div>
</div>

<style>
	.advert-config {
		padding: 24px;
		min-width: 0;
		box-sizing: border-box;
		overflow-x: hidden;
	}

	.page-description {
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		margin: 0 0 24px 0;
		max-width: 60ch;
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
		flex-wrap: wrap;
		min-width: 0;
	}

	.help-text {
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
		margin: 0;
	}

	.advert-enabled-toggle {
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
		flex-wrap: wrap;
		min-width: 0;
		line-height: 1.3;
	}

	.text-input {
		width: 100%;
		box-sizing: border-box;
		background: var(--bg-tertiary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 12px 14px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.text-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.preview-section {
		margin-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.preview-section h3 {
		color: var(--text-primary, #ffffff);
		font-size: 16px;
		margin: 0;
	}

	.preview-wrapper {
		border-radius: 8px;
		border: 1px solid var(--border-color, #3a3a3a);
		overflow: hidden;
	}

	.preview-wrapper img {
		display: block;
		width: 100%;
		height: 90px;
		object-fit: cover;
		object-position: center;
	}

	.preview-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
		word-break: break-all;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 8px;
		min-width: 0;
	}

	.save-button {
		background: var(--accent-bg, var(--accent-color, #6366f1));
		color: var(--accent-fg);
		border: none;
		border-radius: 8px;
		padding: 12px 20px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		transition: all 0.2s ease;
		max-width: 100%;
		box-sizing: border-box;
		text-align: center;
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
		.advert-config {
			padding: 16px;
		}
	}

	@media (max-width: 480px) {
		.form-actions {
			justify-content: stretch;
		}

		.save-button {
			width: 100%;
		}
	}
</style>
