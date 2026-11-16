<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, X, Download } from 'lucide-svelte';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import FileUpload, { type UploadedFile } from '$lib/admin/components/ui/FileUpload.svelte';
	import { notifySiteConfigConsumers } from '$lib/shared/utils/siteConfigLiveSync';

	interface ButtonLink {
		id: string;
		title: string;
		linkUrl: string;
		imageUrl: string;
		isActive: boolean;
		displayOrder: number;
	}

	const API = '/api/buttons';

	let buttons = $state<ButtonLink[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let mirroring = $state(false);
	let showForm = $state(false);
	let editing = $state<ButtonLink | null>(null);
	let draggedId = $state<string | null>(null);
	let dragOverId = $state<string | null>(null);
	let pendingDelete = $state<ButtonLink | null>(null);
	let showDeleteDialog = $state(false);

	let form = $state({ title: '', linkUrl: '', imageUrl: '', isActive: true });

	const isRemoteImage = $derived(/^https?:\/\//i.test(form.imageUrl.trim()));
	const canSave = $derived(
		Boolean(form.title.trim() && form.linkUrl.trim() && form.imageUrl.trim()) && !saving
	);

	async function api<T = unknown>(path: string, method = 'GET', body?: unknown): Promise<T> {
		const response = await fetch(`${API}${path}`, {
			method,
			credentials: 'include',
			headers: body ? { 'Content-Type': 'application/json' } : undefined,
			body: body ? JSON.stringify(body) : undefined
		});
		const result = await response.json().catch(() => ({}));
		if (!response.ok || !result.success) {
			throw new Error(result.error || 'Request failed');
		}
		return result.data as T;
	}

	function showError(title: string, err: unknown) {
		logger.error(title, err);
		toast.error(title, { description: err instanceof Error ? err.message : 'Please try again' });
	}

	async function loadButtons() {
		try {
			buttons = await api<ButtonLink[]>('/all');
		} catch (err) {
			showError('Failed to load buttons', err);
		} finally {
			loading = false;
		}
	}

	onMount(loadButtons);

	function hostOf(url: string): string {
		try {
			return new URL(url).host;
		} catch {
			return url;
		}
	}

	function startAdd() {
		editing = null;
		form = { title: '', linkUrl: '', imageUrl: '', isActive: true };
		showForm = true;
	}

	function startEdit(button: ButtonLink) {
		editing = button;
		form = {
			title: button.title,
			linkUrl: button.linkUrl,
			imageUrl: button.imageUrl,
			isActive: button.isActive
		};
		showForm = true;
	}

	function closeForm() {
		showForm = false;
		editing = null;
	}

	async function saveButton() {
		if (!canSave) return;
		const payload = {
			title: form.title.trim(),
			linkUrl: form.linkUrl.trim(),
			imageUrl: form.imageUrl.trim(),
			isActive: form.isActive
		};
		try {
			saving = true;
			if (editing) {
				await api(`/${editing.id}`, 'PUT', payload);
			} else {
				await api('', 'POST', payload);
			}
			toast.success(editing ? 'Button updated' : 'Button added');
			closeForm();
			await loadButtons();
			notifySiteConfigConsumers();
		} catch (err) {
			showError('Failed to save button', err);
		} finally {
			saving = false;
		}
	}

	async function toggleActive(button: ButtonLink) {
		try {
			await api(`/${button.id}`, 'PUT', { isActive: !button.isActive });
			await loadButtons();
			notifySiteConfigConsumers();
		} catch (err) {
			showError('Failed to update button', err);
		}
	}

	function requestDelete(button: ButtonLink) {
		pendingDelete = button;
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		if (!pendingDelete) return;
		const { id, title } = pendingDelete;
		try {
			await api(`/${id}`, 'DELETE');
			toast.success('Button deleted', { description: `"${title}" has been removed` });
			await loadButtons();
			notifySiteConfigConsumers();
		} catch (err) {
			showError('Failed to delete button', err);
		} finally {
			pendingDelete = null;
		}
	}

	function handleUpload(file: UploadedFile | UploadedFile[]) {
		const uploaded = Array.isArray(file) ? file[0] : file;
		if (uploaded) form.imageUrl = uploaded.path;
	}

	async function saveLocalCopy() {
		try {
			mirroring = true;
			const { path } = await api<{ path: string }>('/mirror', 'POST', {
				source: form.imageUrl.trim()
			});
			form.imageUrl = path;
			toast.success('Saved a local copy of the image');
		} catch (err) {
			showError('Could not save the image', err);
		} finally {
			mirroring = false;
		}
	}

	// Drag and drop reordering
	function handleDragOver(event: DragEvent, target: ButtonLink) {
		if (!draggedId || draggedId === target.id) return;
		event.preventDefault();
		dragOverId = target.id;
	}

	async function handleDrop(event: DragEvent, target: ButtonLink) {
		event.preventDefault();
		const sourceId = draggedId;
		draggedId = null;
		dragOverId = null;
		if (!sourceId || sourceId === target.id) return;

		const reordered = [...buttons];
		const [moved] = reordered.splice(
			reordered.findIndex((b) => b.id === sourceId),
			1
		);
		reordered.splice(
			reordered.findIndex((b) => b.id === target.id),
			0,
			moved
		);

		try {
			await api('/order', 'PUT', {
				buttons: reordered.map((b, index) => ({ id: b.id, displayOrder: index }))
			});
			notifySiteConfigConsumers();
		} catch (err) {
			showError('Failed to reorder buttons', err);
		} finally {
			await loadButtons();
		}
	}

	function handleDragEnd() {
		draggedId = null;
		dragOverId = null;
	}
</script>

<svelte:head>
	<title>{adminPageTitle('88x31 Buttons')}</title>
</svelte:head>

<ConfirmDialog
	bind:open={showDeleteDialog}
	title="Delete button"
	message={pendingDelete ? `Delete “${pendingDelete.title}”?` : ''}
	detail="It will be removed from the homepage banner."
	variant="danger"
	confirmLabel="Delete button"
	cancelLabel="Cancel"
	onConfirm={confirmDelete}
	onCancel={() => (pendingDelete = null)}
/>

<div class="buttons-settings">
	<div class="settings-description">
		<p>
			Manage the 88x31 buttons that link to other sites in the scrolling top row of the homepage
			button banner. Drag to reorder, or hide a button without deleting it.
		</p>
	</div>

	{#if loading}
		<p class="state-message">Loading buttons...</p>
	{:else if buttons.length === 0}
		<p class="state-message">No buttons yet. Add one to show it in the banner.</p>
	{:else}
		<div class="button-list" role="list">
			{#each buttons as button (button.id)}
				<div
					class="button-row"
					class:inactive={!button.isActive}
					class:dragging={draggedId === button.id}
					class:drag-over={dragOverId === button.id}
					role="listitem"
					aria-label={`Reorder button: ${button.title}`}
					draggable="true"
					ondragstart={() => (draggedId = button.id)}
					ondragover={(e) => handleDragOver(e, button)}
					ondragleave={() => (dragOverId = null)}
					ondrop={(e) => handleDrop(e, button)}
					ondragend={handleDragEnd}
				>
					<span class="drag-handle" title="Drag to reorder"><GripVertical size={16} /></span>
					<img
						class="button-preview"
						src={button.imageUrl}
						alt={button.title}
						width="88"
						height="31"
					/>
					<div class="button-info">
						<span class="button-title">{button.title}</span>
						<span class="button-link">{hostOf(button.linkUrl)}</span>
					</div>
					{#if !button.isActive}<span class="hidden-badge">Hidden</span>{/if}
					<div class="button-actions">
						<button
							type="button"
							class="icon-button"
							onclick={() => toggleActive(button)}
							title={button.isActive ? 'Hide from banner' : 'Show in banner'}
						>
							{#if button.isActive}<Eye size={16} />{:else}<EyeOff size={16} />{/if}
						</button>
						<button
							type="button"
							class="icon-button"
							onclick={() => startEdit(button)}
							title="Edit button"
						>
							<Edit size={16} />
						</button>
						<button
							type="button"
							class="icon-button danger"
							onclick={() => requestDelete(button)}
							title="Delete button"
						>
							<Trash2 size={16} />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if !loading}
		<button type="button" class="add-button-dashed" onclick={startAdd}>
			<Plus size={18} />
			Add Button
		</button>
	{/if}
</div>

{#if showForm}
	<div
		class="modal-overlay"
		onclick={closeForm}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				closeForm();
			}
		}}
	>
		<div
			class="modal"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="modal-header">
				<h3>{editing ? 'Edit Button' : 'Add Button'}</h3>
				<button type="button" class="icon-button" onclick={closeForm} title="Close">
					<X size={18} />
				</button>
			</div>

			<div class="modal-content">
				<div class="form-group">
					<label for="button-title">Title *</label>
					<input
						id="button-title"
						class="form-input"
						type="text"
						maxlength="100"
						placeholder="e.g., Luniiya"
						bind:value={form.title}
					/>
				</div>

				<div class="form-group">
					<label for="button-link">Link URL *</label>
					<input
						id="button-link"
						class="form-input"
						type="url"
						placeholder="https://example.com/"
						bind:value={form.linkUrl}
					/>
				</div>

				<div class="form-group">
					<fieldset class="image-fieldset">
						<legend>Button image *</legend>
						{#if form.imageUrl.trim()}
							<div class="image-row">
								<img
									class="image-preview"
									src={form.imageUrl.trim()}
									alt="Button preview"
									width="88"
									height="31"
								/>
								<button
									type="button"
									class="remove-image-btn"
									onclick={() => (form.imageUrl = '')}
									title="Remove image"
								>
									<X size={16} />
								</button>
								{#if isRemoteImage}
									<button
										type="button"
										class="secondary-button"
										onclick={saveLocalCopy}
										disabled={mirroring}
									>
										<Download size={14} />
										{mirroring ? 'Saving...' : 'Save a local copy'}
									</button>
								{/if}
							</div>
							{#if isRemoteImage}
								<p class="hint">
									If the preview stays blank, that site probably blocks hotlinking. Save a local
									copy to host the image yourself.
								</p>
							{/if}
						{:else}
							<FileUpload
								acceptedTypes={['image']}
								onUpload={handleUpload}
								showPreview={false}
								label="Upload Image"
							/>
						{/if}
					</fieldset>
				</div>

				<div class="form-group toggle-row">
					<Toggle bind:checked={form.isActive} label="Show in banner" />
				</div>
			</div>

			<div class="modal-actions">
				<button type="button" class="cancel-button" onclick={closeForm} disabled={saving}>
					Cancel
				</button>
				<button type="button" class="save-button" onclick={saveButton} disabled={!canSave}>
					{saving ? 'Saving...' : editing ? 'Update' : 'Add'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.buttons-settings {
		width: 100%;
	}

	.settings-description {
		margin-bottom: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.settings-description p {
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-secondary, #a1a1aa);
	}

	.save-button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: var(--accent-bg, var(--accent-color, #6366f1));
		color: var(--accent-fg);
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	.save-button:hover:not(:disabled) {
		background: var(--accent-color-hover, #4f46e5);
	}

	.save-button:disabled,
	.cancel-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.add-button-dashed {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		margin-top: 12px;
		padding: 16px;
		background: transparent;
		border: 2px dashed var(--border-color, #3a3a3a);
		border-radius: 8px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-button-dashed:hover {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
		background: rgba(99, 102, 241, 0.05);
	}

	.state-message {
		padding: 32px 0;
		text-align: center;
		color: var(--text-secondary, #a1a1aa);
	}

	.button-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.button-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		cursor: move;
	}

	.button-row:hover {
		border-color: var(--accent-color, #6366f1);
	}

	.button-row.inactive {
		opacity: 0.6;
	}

	.button-row.dragging {
		opacity: 0.4;
	}

	.button-row.drag-over {
		border-color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.1);
	}

	.drag-handle {
		display: flex;
		color: var(--text-secondary, #a1a1aa);
		flex-shrink: 0;
	}

	.button-preview {
		flex-shrink: 0;
		width: 88px;
		height: 31px;
		image-rendering: pixelated;
		background: var(--bg-primary, #1a1a1a);
	}

	.button-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.button-title {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.button-link {
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.hidden-badge {
		padding: 2px 8px;
		font-size: 11px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 999px;
		color: var(--text-secondary, #a1a1aa);
	}

	.button-actions {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.icon-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 4px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
	}

	.icon-button:hover {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
	}

	.icon-button.danger:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		background: rgba(0, 0, 0, 0.7);
	}

	.modal {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 520px;
		max-height: 90vh;
		overflow: hidden;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18px 24px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.15rem;
		color: var(--text-primary, #ffffff);
	}

	.modal-content {
		flex: 1;
		overflow-y: auto;
		padding: 20px 24px;
	}

	.form-group {
		margin-bottom: 18px;
	}

	.form-group label {
		display: block;
		margin-bottom: 8px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.form-input {
		width: 100%;
		box-sizing: border-box;
		padding: 10px 14px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.hint {
		margin: 8px 0;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
	}

	.image-fieldset {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
		margin: 0;
		padding: 0;
		border: none;
	}

	.image-fieldset legend {
		margin-bottom: 8px;
		padding: 0;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.image-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.image-preview {
		width: 88px;
		height: 31px;
		overflow: hidden; /* keeps a blocked image's alt text inside the box */
		image-rendering: pixelated;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.remove-image-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		background: rgba(239, 68, 68, 0.9);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.remove-image-btn:hover {
		background: rgba(239, 68, 68, 1);
	}

	.secondary-button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 13px;
		cursor: pointer;
	}

	.secondary-button:hover:not(:disabled) {
		border-color: var(--accent-color, #6366f1);
	}

	.secondary-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.toggle-row {
		margin-bottom: 0;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 16px 24px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.cancel-button {
		padding: 10px 18px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		cursor: pointer;
	}
</style>
