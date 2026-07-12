<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { Megaphone, Save, Loader2, ExternalLink } from 'lucide-svelte';
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

<div class="advert-admin">
	<div class="page-head">
		<Megaphone size={22} class="advert-page-icon" aria-hidden="true" />
		<div>
			<h2 class="page-title">Advertisement</h2>
			<p class="page-desc">
				Manage the image-only advertisement banner shown in the homepage right column, between
				Recent posts and Systems status.
			</p>
		</div>
	</div>

	<section class="advert-panel">
		<div class="field-row">
			<div class="field-label">
				<span class="field-title">Show advertisement</span>
				<span class="field-hint">Controls whether the advert is displayed on the site.</span>
			</div>
			<Toggle bind:checked={pendingEnabled} />
		</div>

		<div class="field-block">
			<label class="field-title" for="advert-link">Link URL</label>
			<span class="field-hint">Opens in a new tab when the advert is clicked. Leave empty for a non-clickable image.</span>
			<input
				id="advert-link"
				class="text-input"
				type="url"
				placeholder="https://example.com"
				bind:value={pendingLinkUrl}
			/>
		</div>

		<div class="field-block">
			<span class="field-title">Advert image</span>
			<span class="field-hint">Upload an image or paste an external URL. Displayed full-width with no border.</span>
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
		</div>

		{#if pendingImageUrl}
			<div class="preview">
				<span class="field-hint">Preview</span>
				<div class="preview-frame">
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

		<div class="actions">
			<button class="save-btn" onclick={saveSettings} disabled={!dirty || isSaving}>
				{#if isSaving}
					<Loader2 size={16} class="spin" aria-hidden="true" />
					Saving…
				{:else}
					<Save size={16} aria-hidden="true" />
					Save changes
				{/if}
			</button>
		</div>
	</section>
</div>

<style>
	.advert-admin {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.page-head {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	:global(.advert-page-icon) {
		color: #f59e0b;
		margin-top: 2px;
	}

	.page-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.page-desc {
		margin: 4px 0 0;
		color: var(--text-secondary, #94a3b8);
		font-size: 0.875rem;
		max-width: 60ch;
	}

	.advert-panel {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 20px;
		border: 1px solid rgba(148, 163, 184, 0.2);
		border-radius: 12px;
		background: rgba(15, 23, 42, 0.35);
	}

	.field-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.field-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.field-label {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.field-title {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.field-hint {
		color: var(--text-secondary, #94a3b8);
		font-size: 0.8rem;
	}

	.text-input {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid rgba(148, 163, 184, 0.25);
		border-radius: 8px;
		background: rgba(2, 6, 23, 0.5);
		color: inherit;
		font-size: 0.9rem;
	}

	.text-input:focus {
		outline: none;
		border-color: #f59e0b;
	}

	.preview {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.preview-frame {
		border: 1px dashed rgba(148, 163, 184, 0.3);
		border-radius: 8px;
		padding: 8px;
		background: rgba(2, 6, 23, 0.4);
	}

	.preview-frame img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 4px;
	}

	.preview-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8rem;
		color: #60a5fa;
		word-break: break-all;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}

	.save-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		border: none;
		border-radius: 8px;
		background: #f59e0b;
		color: #0f172a;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
