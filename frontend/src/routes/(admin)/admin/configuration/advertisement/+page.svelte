<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { Save, Eye, EyeOff, Plus, X, Pencil, Trash2, ExternalLink } from 'lucide-svelte';
	import { siteConfig, loadSiteConfig } from '$lib/site/stores/siteConfig';
	import { adverts as advertsStore, loadAdverts, type Advert } from '$lib/site/stores/adverts';
	import { toast } from 'svelte-sonner';
	import { notifySiteConfigConsumers } from '$lib/shared/utils/siteConfigLiveSync';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import FileUpload, { type UploadedFile } from '$lib/admin/components/ui/FileUpload.svelte';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';

	// Global settings (stored in site_config).
	let enabled = $state(false);
	let rotationSeconds = $state(8);
	let savedEnabled = $state(false);
	let savedRotation = $state(8);
	let isSavingSettings = $state(false);
	const settingsDirty = $derived(enabled !== savedEnabled || rotationSeconds !== savedRotation);

	// Adverts (stored in the adverts table, managed via /api/adverts).
	let ads = $state<Advert[]>([]);
	let isLoadingAds = $state(true);

	// Inline editor state. `creating` shows the new-advert form; `editingId`
	// swaps a row for its inline edit form. Only one is open at a time.
	let creating = $state(false);
	let editingId = $state<string | null>(null);
	let draftTitle = $state('');
	let draftDescription = $state('');
	let draftImageUrl = $state('');
	let draftLinkUrl = $state('');
	let draftActive = $state(true);
	let isSavingAdvert = $state(false);

	const canSaveDraft = $derived(Boolean(draftImageUrl.trim()) && !isSavingAdvert);

	// Delete confirmation.
	let confirmOpen = $state(false);
	let pendingDeleteId = $state<string | null>(null);
	let pendingDeleteLabel = $state('');

	function syncSettingsFromConfig(c: import('$lib/site/stores/siteConfig').SiteConfig) {
		savedEnabled = Boolean(c.advert_enabled);
		enabled = savedEnabled;
		savedRotation = Number(c.advert_rotation_seconds) || 8;
		rotationSeconds = savedRotation;
	}

	onMount(() => {
		const unsub = siteConfig.subscribe(syncSettingsFromConfig);
		ads = get(advertsStore);
		refreshAds();
		return unsub;
	});

	async function refreshAds() {
		isLoadingAds = true;
		try {
			const response = await fetch('/api/adverts/all', { credentials: 'include' });
			if (!response.ok) throw new Error(`Failed to load adverts: ${response.statusText}`);
			const data = await response.json();
			ads = data.success && Array.isArray(data.data) ? data.data : [];
		} catch (e) {
			logger.error(e);
			toast.error('Failed to load adverts', {
				description: e instanceof Error ? e.message : 'Try again'
			});
		} finally {
			isLoadingAds = false;
		}
	}

	function resetDraft() {
		draftTitle = '';
		draftDescription = '';
		draftImageUrl = '';
		draftLinkUrl = '';
		draftActive = true;
	}

	function startNew() {
		editingId = null;
		resetDraft();
		creating = true;
	}

	function startEdit(ad: Advert) {
		creating = false;
		editingId = ad.id;
		draftTitle = ad.title ?? '';
		draftDescription = ad.description ?? '';
		draftImageUrl = ad.imageUrl ?? '';
		draftLinkUrl = ad.linkUrl ?? '';
		draftActive = ad.isActive;
	}

	function cancelEdit() {
		if (isSavingAdvert) return;
		creating = false;
		editingId = null;
	}

	function handleDraftImageUpload(file: UploadedFile | UploadedFile[]) {
		const uploadedFile = Array.isArray(file) ? file[0] : file;
		if (uploadedFile) {
			draftImageUrl = uploadedFile.path;
			toast.success('Image uploaded');
		}
	}

	function handleUploadError(error: string) {
		toast.error('Upload failed', { description: error });
	}

	async function submitDraft() {
		if (!draftImageUrl.trim()) return;
		isSavingAdvert = true;
		try {
			const body = {
				title: draftTitle.trim(),
				description: draftDescription.trim(),
				imageUrl: draftImageUrl.trim(),
				linkUrl: draftLinkUrl.trim(),
				isActive: draftActive
			};
			const isCreate = creating;
			const url = isCreate ? '/api/adverts' : `/api/adverts/${editingId}`;
			const method = isCreate ? 'POST' : 'PUT';
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(body)
			});
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || 'Failed to save advert');
			}
			await refreshAds();
			await loadAdverts();
			notifySiteConfigConsumers();
			creating = false;
			editingId = null;
			toast.success(isCreate ? 'Advert added' : 'Advert updated');
		} catch (e) {
			logger.error(e);
			toast.error('Failed to save advert', {
				description: e instanceof Error ? e.message : 'Try again'
			});
		} finally {
			isSavingAdvert = false;
		}
	}

	function requestDelete(ad: Advert, index: number) {
		pendingDeleteId = ad.id;
		pendingDeleteLabel = ad.title.trim() || `Advert ${index + 1}`;
		confirmOpen = true;
	}

	async function confirmDelete() {
		if (!pendingDeleteId) return;
		try {
			const response = await fetch(`/api/adverts/${pendingDeleteId}`, {
				method: 'DELETE',
				credentials: 'include'
			});
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || 'Failed to delete advert');
			}
			if (editingId === pendingDeleteId) {
				editingId = null;
			}
			await refreshAds();
			await loadAdverts();
			notifySiteConfigConsumers();
			toast.success('Advert deleted');
		} catch (e) {
			logger.error(e);
			toast.error('Failed to delete advert', {
				description: e instanceof Error ? e.message : 'Try again'
			});
		} finally {
			pendingDeleteId = null;
			pendingDeleteLabel = '';
		}
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
		if (!settingsDirty) return;
		isSavingSettings = true;
		try {
			if (rotationSeconds !== savedRotation) {
				await putConfig('advert_rotation_seconds', rotationSeconds, 'number');
			}
			if (enabled !== savedEnabled) {
				await putConfig('advert_enabled', enabled, 'boolean');
			}
			await loadSiteConfig();
			notifySiteConfigConsumers();
			syncSettingsFromConfig(get(siteConfig));
			toast.success('Advertisement settings saved');
		} catch (e) {
			logger.error(e);
			toast.error('Failed to save settings', {
				description: e instanceof Error ? e.message : 'Try again'
			});
		} finally {
			isSavingSettings = false;
		}
	}
</script>

<svelte:head>
	<title>{adminPageTitle('Advertisement')}</title>
</svelte:head>

{#snippet advertForm(submitLabel: string)}
	<div class="advert-edit-form">
		<p class="form-hint">
			Full-width banner with no border. Use a wide image (e.g. 728&times;90) for best results. Leave
			the Link URL empty for a non-clickable image.
		</p>

		<div class="advert-field">
			<label class="field-label" for="draft-title">Title</label>
			<input
				id="draft-title"
				class="text-input"
				type="text"
				placeholder="e.g. Summer sale"
				bind:value={draftTitle}
			/>
		</div>

		<div class="advert-field">
			<label class="field-label" for="draft-desc">
				Description <span class="optional-tag">(optional)</span>
			</label>
			<textarea
				id="draft-desc"
				class="text-input textarea-input"
				rows="2"
				placeholder="Short internal note about this advert"
				bind:value={draftDescription}
			></textarea>
		</div>

		<div class="advert-field">
			<span class="field-label">Image</span>
			{#if draftImageUrl}
				<div class="preview-wrapper">
					<img src={draftImageUrl} alt="Advert preview" />
				</div>
			{/if}
			<FileUpload
				acceptedTypes={['image']}
				onUpload={handleDraftImageUpload}
				onError={handleUploadError}
				showPreview={false}
				label="Upload Image"
			/>
		</div>

		<div class="advert-field">
			<label class="field-label" for="draft-link">Link URL</label>
			<input
				id="draft-link"
				class="text-input"
				type="url"
				placeholder="https://example.com"
				bind:value={draftLinkUrl}
			/>
			{#if draftLinkUrl.trim()}
				<a
					class="preview-link"
					href={draftLinkUrl.trim()}
					target="_blank"
					rel="noopener noreferrer"
				>
					<ExternalLink size={14} aria-hidden="true" />
					{draftLinkUrl.trim()}
				</a>
			{/if}
		</div>

		<div class="advert-field toggle-field">
			<Toggle bind:checked={draftActive} label="Active" />
			<span class="help-text">Inactive adverts are hidden from the rotation.</span>
		</div>

		<div class="form-actions edit-actions">
			<button type="button" class="save-button" onclick={submitDraft} disabled={!canSaveDraft}>
				<Save size={16} />
				{isSavingAdvert ? 'Saving...' : submitLabel}
			</button>
			<button type="button" class="cancel-btn" onclick={cancelEdit} disabled={isSavingAdvert}>
				Cancel
			</button>
		</div>
	</div>
{/snippet}

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
				active advert exists.
			</p>
		</div>

		<!-- Settings save -->
		<div class="form-actions">
			<button
				class="save-button"
				onclick={saveSettings}
				disabled={!settingsDirty || isSavingSettings}
			>
				<Save size={18} />
				{isSavingSettings ? 'Saving...' : 'Save Settings'}
			</button>
		</div>

		<!-- Advert List -->
		<div class="form-group">
			<div class="form-group-label">Adverts</div>

			{#if !isLoadingAds}
				{#each ads as advert, i (advert.id)}
					{#if editingId === advert.id}
						<div class="advert-card editing">
							{@render advertForm('Save advert')}
						</div>
					{:else}
						<div class="advert-row" class:inactive={!advert.isActive}>
							<div class="advert-thumb">
								{#if advert.imageUrl}
									<img
										src={advert.imageUrl}
										alt="{advert.title.trim() || `Advert ${i + 1}`} preview"
									/>
								{/if}
							</div>
							<div class="advert-row-info">
								<span class="advert-row-title">
									{advert.title.trim() || `Advert ${i + 1}`}
									{#if !advert.isActive}<span class="inactive-badge">Inactive</span>{/if}
								</span>
								{#if advert.linkUrl.trim()}
									<span class="advert-row-link">{advert.linkUrl.trim()}</span>
								{/if}
							</div>
							<div class="advert-row-actions">
								<button
									type="button"
									class="icon-btn"
									onclick={() => startEdit(advert)}
									aria-label="Edit advert {i + 1}"
								>
									<Pencil size={16} />
								</button>
								<button
									type="button"
									class="icon-btn remove-btn"
									onclick={() => requestDelete(advert, i)}
									aria-label="Delete advert {i + 1}"
								>
									<Trash2 size={16} />
								</button>
							</div>
						</div>
					{/if}
				{/each}
			{/if}

			{#if creating}
				<div class="advert-card editing">
					{@render advertForm('Add advert')}
				</div>
			{:else}
				<button type="button" class="add-btn" onclick={startNew}>
					<Plus size={18} />
					Add Advert
				</button>
			{/if}
		</div>
	</div>
</div>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Delete advert?"
	message="“{pendingDeleteLabel}” will be permanently removed."
	confirmLabel="Delete"
	variant="danger"
	onConfirm={confirmDelete}
/>

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

	/* Advert list rows */
	.advert-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		background: var(--bg-secondary, var(--bg-tertiary, #2d2d2d));
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 10px;
	}

	.advert-row.inactive {
		opacity: 0.65;
	}

	.advert-thumb {
		flex-shrink: 0;
		width: 96px;
		height: 44px;
		border-radius: 6px;
		overflow: hidden;
		background: var(--bg-tertiary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.advert-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}

	.advert-row-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.advert-row-title {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.inactive-badge {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 999px;
		padding: 1px 8px;
	}

	.advert-row-link {
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.advert-row-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.icon-btn {
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

	.icon-btn:hover {
		border-color: var(--accent-color, #6366f1);
		color: var(--text-primary, #ffffff);
	}

	.remove-btn:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	/* Inline edit / new form */
	.advert-card.editing {
		background: var(--bg-secondary, var(--bg-tertiary, #2d2d2d));
		border: 1px solid var(--accent-color, #6366f1);
		border-radius: 10px;
		padding: 16px;
	}

	.advert-edit-form {
		display: flex;
		flex-direction: column;
	}

	.form-hint {
		margin: 0 0 16px 0;
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
		line-height: 1.45;
	}

	.advert-field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.advert-field + .advert-field {
		margin-top: 16px;
	}

	.toggle-field {
		flex-direction: row;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.field-label {
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
		font-weight: 400;
	}

	.optional-tag {
		color: var(--text-secondary, #a1a1aa);
		font-weight: 400;
		font-size: 12px;
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

	.textarea-input {
		resize: vertical;
		min-height: 44px;
		font-family: inherit;
		line-height: 1.4;
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

	.edit-actions {
		gap: 10px;
		margin-top: 20px;
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

	.cancel-btn {
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 12px 20px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-btn:hover:not(:disabled) {
		border-color: var(--accent-color, #6366f1);
		color: var(--text-primary, #ffffff);
	}

	.cancel-btn:disabled {
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

		.form-actions .save-button {
			width: 100%;
		}

		.edit-actions {
			flex-direction: column-reverse;
		}

		.edit-actions .cancel-btn {
			width: 100%;
		}
	}
</style>
