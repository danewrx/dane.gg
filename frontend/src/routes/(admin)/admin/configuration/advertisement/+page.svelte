<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { Save, Eye, EyeOff, Plus, Trash2, ExternalLink } from 'lucide-svelte';
	import {
		siteConfig,
		loadSiteConfig,
		type AdvertItem
	} from '$lib/site/stores/siteConfig';
	import { toast } from 'svelte-sonner';
	import { notifySiteConfigConsumers } from '$lib/shared/utils/siteConfigLiveSync';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import FileUpload, { type UploadedFile } from '$lib/admin/components/ui/FileUpload.svelte';

	// Local advert row carries a client-only id for stable #each keying.
	interface AdvertRow extends AdvertItem {
		id: number;
	}

	let nextId = 0;

	let enabled = $state(false);
	let rotationSeconds = $state(8);
	let adverts = $state<AdvertRow[]>([]);

	let isSaving = $state(false);

	function toRows(items: AdvertItem[]): AdvertRow[] {
		return (items ?? []).map((item) => ({
			id: nextId++,
			imageUrl: item?.imageUrl ?? '',
			linkUrl: item?.linkUrl ?? ''
		}));
	}

	function syncFromConfig(c: import('$lib/site/stores/siteConfig').SiteConfig) {
		enabled = Boolean(c.advert_enabled);
		rotationSeconds = Number(c.advert_rotation_seconds) || 8;
		adverts = toRows(c.advert_items);
	}

	onMount(() => {
		const unsub = siteConfig.subscribe(syncFromConfig);
		return unsub;
	});

	function addAdvert() {
		adverts = [...adverts, { id: nextId++, imageUrl: '', linkUrl: '' }];
	}

	function removeAdvert(id: number) {
		adverts = adverts.filter((a) => a.id !== id);
	}

	function handleImageUpload(id: number, file: UploadedFile | UploadedFile[]) {
		const uploadedFile = Array.isArray(file) ? file[0] : file;
		if (uploadedFile) {
			adverts = adverts.map((a) => (a.id === id ? { ...a, imageUrl: uploadedFile.path } : a));
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
		isSaving = true;
		try {
			// Drop rows with no image; trim the rest.
			const items: AdvertItem[] = adverts
				.map((a) => ({ imageUrl: a.imageUrl.trim(), linkUrl: a.linkUrl.trim() }))
				.filter((a) => a.imageUrl);

			await putConfig('advert_items', items, 'json');
			await putConfig('advert_rotation_seconds', rotationSeconds, 'number');
			await putConfig('advert_enabled', enabled, 'boolean');

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
		posts and Systems status. Add multiple adverts and the banner rotates between them.
	</p>

	<div class="config-form">
		<!-- Enabled Toggle -->
		<div class="form-group">
			<div class="advert-enabled-toggle">
				<div class="toggle-with-icon">
					<Toggle bind:checked={enabled} />
					<span class="toggle-text">
						{#if enabled}
							<Eye size={16} />
							Advertisement Enabled
						{:else}
							<EyeOff size={16} />
							Advertisement Disabled
						{/if}
					</span>
				</div>
				<p class="help-text">Controls whether the advert banner is displayed on the public site.</p>
			</div>
		</div>

		<!-- Rotation Speed -->
		<div class="form-group">
			<label for="rotation">
				Rotation Interval
				<span class="rotation-value">{rotationSeconds}s</span>
			</label>
			<input
				type="range"
				id="rotation"
				value={rotationSeconds}
				oninput={(e) => (rotationSeconds = Number((e.target as HTMLInputElement).value))}
				min="2"
				max="30"
				step="1"
				class="range-input"
			/>
			<div class="range-labels">
				<span>2s</span>
				<span>30s</span>
			</div>
			<p class="help-text">
				How long each advert is shown before switching to the next. Only applies when more than one
				advert is added.
			</p>
		</div>

		<!-- Advert List -->
		<div class="form-group">
			<div class="form-group-label">Adverts</div>
			{#if adverts.length === 0}
				<p class="empty-adverts">No adverts yet. Add one to get started.</p>
			{/if}

			{#each adverts as advert, i (advert.id)}
				<div class="advert-card">
					<div class="advert-card-header">
						<span class="advert-card-title">Advert {i + 1}</span>
						<button
							type="button"
							class="remove-btn"
							onclick={() => removeAdvert(advert.id)}
							aria-label="Remove advert {i + 1}"
						>
							<Trash2 size={16} />
						</button>
					</div>

					{#if advert.imageUrl}
						<div class="preview-wrapper">
							<img src={advert.imageUrl} alt="Advert {i + 1} preview" />
						</div>
					{/if}

					<div class="advert-field">
						<span class="field-label">Image</span>
						<FileUpload
							acceptedTypes={['image']}
							onUpload={(f) => handleImageUpload(advert.id, f)}
							onError={handleUploadError}
							showPreview={false}
							label="Upload Image"
						/>
					</div>

					<div class="advert-field">
						<label class="field-label" for="advert-link-{advert.id}">Link URL</label>
						<input
							id="advert-link-{advert.id}"
							class="text-input"
							type="url"
							placeholder="https://example.com"
							bind:value={advert.linkUrl}
						/>
						{#if advert.linkUrl}
							<a
								class="preview-link"
								href={advert.linkUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink size={14} aria-hidden="true" />
								{advert.linkUrl}
							</a>
						{/if}
					</div>
				</div>
			{/each}

			<button type="button" class="add-btn" onclick={addAdvert}>
				<Plus size={18} />
				Add Advert
			</button>
			<p class="help-text">
				Each advert is a full-width banner with no border. Use a wide image (e.g. 728&times;90) for
				best results. Adverts without an image are ignored. Leave a Link URL empty for a
				non-clickable image.
			</p>
		</div>

		<!-- Save Button -->
		<div class="form-actions">
			<button class="save-button" onclick={saveSettings} disabled={isSaving}>
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

	.rotation-value {
		margin-left: auto;
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
		font-size: 13px;
		white-space: nowrap;
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
		background: var(--accent-bg, var(--accent-color, #6366f1));
		cursor: pointer;
	}

	.range-input::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--accent-bg, var(--accent-color, #6366f1));
		cursor: pointer;
		border: none;
	}

	.range-labels {
		display: flex;
		justify-content: space-between;
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
	}

	.empty-adverts {
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
		margin: 0;
		padding: 16px;
		border: 1px dashed var(--border-color, #3a3a3a);
		border-radius: 8px;
		text-align: center;
	}

	.advert-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		background: var(--bg-secondary, var(--bg-tertiary, #2d2d2d));
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 10px;
	}

	.advert-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.advert-card-title {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 600;
	}

	.remove-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.remove-btn:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	.advert-field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.field-label {
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
		font-weight: 400;
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

	.add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 16px;
		background: transparent;
		border: 2px dashed var(--border-color, #3a3a3a);
		border-radius: 8px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;
		margin-top: 12px;
	}

	.add-btn:hover {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
		background: rgba(99, 102, 241, 0.05);
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
