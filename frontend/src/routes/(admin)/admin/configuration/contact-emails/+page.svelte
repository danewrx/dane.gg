<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Edit2, Check, X } from 'lucide-svelte';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';

	interface ContactEmail {
		id: string;
		description: string;
		email: string;
		displayOrder: number;
		isActive: boolean;
	}

	let contactEmails: ContactEmail[] = $state([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let showAddForm = $state(false);
	let editingEmail: ContactEmail | null = $state(null);
	let emailsHeader = $state('');
	let isEditingHeader = $state(false);
	let tempHeaderText = $state('');

	let formData = $state<{
		id?: string;
		description: string;
		email: string;
		displayOrder: number;
		isActive: boolean;
	}>({
		description: '',
		email: '',
		displayOrder: 0,
		isActive: true
	});

	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	let showDeleteEmailDialog = $state(false);
	let pendingDeleteEmailId = $state<string | null>(null);

	onMount(() => {
		Promise.all([loadContactEmails(), loadEmailsHeader()]);
	});

	async function loadContactEmails() {
		try {
			isLoading = true;
			const response = await fetch('/api/contact/emails/all', {
				credentials: 'include'
			});
			const data = await response.json();

			if (data.success && data.data) {
				contactEmails = data.data;
			} else {
				contactEmails = [];
			}
		} catch (error) {
			logger.error('Error loading contact emails:', error);
			contactEmails = [];
		} finally {
			isLoading = false;
		}
	}

	async function saveEmail() {
		try {
			isSaving = true;

			if (!formData.description || !formData.email) {
				toast.error('Description and email are required');
				return;
			}

			const currentEditingEmail = editingEmail;
			let response;

			if (currentEditingEmail) {
				// Update existing email
				response = await fetch(`/api/contact/emails/${currentEditingEmail.id}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include',
					body: JSON.stringify({
						description: formData.description,
						email: formData.email,
						isActive: formData.isActive
					})
				});
			} else {
				// Create new email
				response = await fetch('/api/contact/emails', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include',
					body: JSON.stringify({
						description: formData.description,
						email: formData.email,
						isActive: formData.isActive
					})
				});
			}

			const data = await response.json();

			if (data.success) {
				toast.success(
					editingEmail ? 'Contact email updated successfully' : 'Contact email created successfully'
				);
				resetForm();
				await loadContactEmails();
			} else {
				toast.error(data.error || 'Failed to save contact email');
			}
		} catch (error) {
			logger.error('Error saving contact email:', error);
			toast.error('Failed to save contact email');
		} finally {
			isSaving = false;
		}
	}

	function editEmail(email: ContactEmail) {
		editingEmail = email;
		formData = {
			description: email.description,
			email: email.email,
			displayOrder: email.displayOrder,
			isActive: email.isActive
		};
		showAddForm = true;
	}

	function resetForm() {
		editingEmail = null;
		formData = {
			description: '',
			email: '',
			displayOrder: contactEmails.length,
			isActive: true
		};
		showAddForm = false;
	}

	function requestDeleteEmail(id: string) {
		pendingDeleteEmailId = id;
		showDeleteEmailDialog = true;
	}

	function cancelDeleteEmail() {
		showDeleteEmailDialog = false;
		pendingDeleteEmailId = null;
	}

	async function confirmDeleteEmail() {
		if (!pendingDeleteEmailId) return;
		const id = pendingDeleteEmailId;
		try {
			const response = await fetch(`/api/contact/emails/${id}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			const data = await response.json();

			if (data.success) {
				toast.success('Contact email deleted successfully');
				await loadContactEmails();
			} else {
				toast.error(data.error || 'Failed to delete contact email');
			}
		} catch (error) {
			logger.error('Error deleting contact email:', error);
			toast.error('Failed to delete contact email');
		} finally {
			cancelDeleteEmail();
		}
	}

	async function toggleActive(id: string) {
		try {
			const email = contactEmails.find((e) => e.id === id);
			if (!email) return;

			const response = await fetch(`/api/contact/emails/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					isActive: !email.isActive
				})
			});

			const data = await response.json();

			if (data.success) {
				await loadContactEmails();
			} else {
				toast.error(data.error || 'Failed to toggle contact email status');
			}
		} catch (error) {
			logger.error('Error toggling contact email status:', error);
			toast.error('Failed to toggle contact email status');
		}
	}

	function handleDragStart(index: number) {
		if (editingEmail || showAddForm) return;
		draggedIndex = index;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (editingEmail || showAddForm || draggedIndex === null || draggedIndex === index) return;
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	async function handleDrop(e: DragEvent, index: number) {
		e.preventDefault();
		if (editingEmail || showAddForm || draggedIndex === null || draggedIndex === index) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}

		const items = [...contactEmails];
		const [draggedItem] = items.splice(draggedIndex, 1);
		items.splice(index, 0, draggedItem);

		try {
			const updatedEmails = items.map((item, idx) => ({
				id: item.id,
				displayOrder: idx
			}));

			const response = await fetch('/api/contact/emails/order', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					emails: updatedEmails
				})
			});

			const data = await response.json();
			if (data.success) {
				await loadContactEmails();
			} else {
				toast.error('Failed to update order');
			}
		} catch (error) {
			logger.error('Error updating order:', error);
			toast.error('Failed to update order');
		}

		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	async function loadEmailsHeader() {
		try {
			const response = await fetch('/api/contact/settings/emails_header', {
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.data?.value) {
					emailsHeader = data.data.value;
				}
			}
		} catch (error) {
			logger.error('Error loading emails header:', error);
		}
	}

	function startEditingHeader() {
		tempHeaderText = emailsHeader;
		isEditingHeader = true;
	}

	function cancelEditingHeader() {
		tempHeaderText = '';
		isEditingHeader = false;
	}

	async function saveHeader() {
		try {
			const response = await fetch('/api/contact/settings/emails_header', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					value: tempHeaderText
				})
			});

			const data = await response.json();

			if (data.success) {
				emailsHeader = tempHeaderText;
				isEditingHeader = false;
				tempHeaderText = '';
				toast.success('Header text saved successfully');
			} else {
				toast.error('Failed to save header text');
			}
		} catch (error) {
			logger.error('Error saving header:', error);
			toast.error('Failed to save header text');
		}
	}
</script>

<svelte:head>
	<title>{adminPageTitle('Contact emails')}</title>
</svelte:head>

<ConfirmDialog
	bind:open={showDeleteEmailDialog}
	title="Delete contact email"
	message="Remove this address from the contact page?"
	detail="This cannot be undone."
	variant="danger"
	confirmLabel="Delete email"
	cancelLabel="Cancel"
	onConfirm={confirmDeleteEmail}
	onCancel={cancelDeleteEmail}
/>

<div class="contact-emails-page">
	<div class="settings-description">
		<p>
			Manage email addresses displayed on the contact page and customize the header text for the
			email addresses section.
		</p>
	</div>

	<div class="form-group header-form-group">
		{#if isEditingHeader}
			<label for="contact-emails-header-input">Header</label>
			<div class="header-edit-container">
				<input
					id="contact-emails-header-input"
					type="text"
					bind:value={tempHeaderText}
					placeholder="e.g., Email"
					class="header-input"
				/>
				<div class="header-edit-actions">
					<button
						type="button"
						class="icon-button save-icon-button"
						onclick={saveHeader}
						title="Save"
					>
						<Check size={16} />
					</button>
					<button
						type="button"
						class="icon-button cancel-icon-button"
						onclick={cancelEditingHeader}
						title="Cancel"
					>
						<X size={16} />
					</button>
				</div>
			</div>
			<p class="field-hint">This text will appear above the email addresses on the contact page.</p>
		{:else}
			<span class="field-label-static">Header</span>
			<div class="header-view-container">
				<div class="header-view-text">
					{#if emailsHeader}
						{emailsHeader}
					{:else}
						<span class="empty-text">No header text set. Click edit to add one.</span>
					{/if}
				</div>
				<button
					type="button"
					class="icon-button edit-icon-button"
					onclick={startEditingHeader}
					title="Edit header"
				>
					<Edit2 size={16} />
				</button>
			</div>
			<p class="field-hint">This text will appear above the email addresses on the contact page.</p>
		{/if}
	</div>

	{#if isLoading}
		<div class="loading">
			<div class="loading-spinner"></div>
			<p>Loading contact emails...</p>
		</div>
	{:else}
		<div class="emails-list" role="list">
			{#if contactEmails.length > 0}
				{#each contactEmails as email, index (email.id)}
					<div
						class="email-item"
						role="listitem"
						aria-label={`Reorder contact email: ${email.email}`}
						class:dragging={draggedIndex === index}
						class:drag-over={dragOverIndex === index}
						class:not-draggable={editingEmail !== null || showAddForm}
						draggable={editingEmail === null && !showAddForm}
						ondragstart={() => handleDragStart(index)}
						ondragover={(e) => handleDragOver(e, index)}
						ondragleave={handleDragLeave}
						ondrop={(e) => handleDrop(e, index)}
						ondragend={handleDragEnd}
					>
						{#if editingEmail === null && !showAddForm}
							<div class="drag-handle" title="Drag to reorder">
								<GripVertical size={20} />
							</div>
						{/if}
						<div class="email-info">
							<div class="email-details">
								<h3 class="email-address">{email.email}</h3>
								<p class="email-description">{email.description}</p>
								<div class="email-meta">
									<span class="display-order">Order: {email.displayOrder}</span>
								</div>
							</div>
						</div>
						<div class="email-actions">
							<button
								class="action-button"
								onclick={() => toggleActive(email.id)}
								title={email.isActive ? 'Hide email' : 'Show email'}
							>
								{#if email.isActive}
									<Eye size={16} />
								{:else}
									<EyeOff size={16} />
								{/if}
							</button>
							<button class="action-button" onclick={() => editEmail(email)} title="Edit email">
								<Edit size={16} />
							</button>
							<button
								class="action-button danger"
								onclick={() => requestDeleteEmail(email.id)}
								title="Delete email"
							>
								<Trash2 size={16} />
							</button>
						</div>
					</div>
				{/each}
			{/if}

			{#if showAddForm}
				<div class="new-email-form">
					<h3>{editingEmail ? 'Edit Email' : 'New Email'}</h3>
					<form
						onsubmit={(e) => {
							e.preventDefault();
							saveEmail();
						}}
					>
						<div class="form-group">
							<label for="description">Description *</label>
							<textarea
								id="description"
								class="edit-input"
								bind:value={formData.description}
								placeholder="e.g., If you would like to reach out to me for most things:"
								required
								rows="3"
							></textarea>
						</div>

						<div class="form-group">
							<label for="email">Email Address *</label>
							<input
								type="email"
								id="email"
								class="edit-input"
								bind:value={formData.email}
								placeholder="me@dane.gg"
								required
							/>
						</div>

						<div class="form-group">
							<label class="checkbox-label">
								<input type="checkbox" bind:checked={formData.isActive} />
								<span>Active (visible on website)</span>
							</label>
						</div>

						<div class="form-actions">
							<button type="submit" class="save-btn" disabled={isSaving}>
								{isSaving ? 'Saving...' : editingEmail ? 'Update Email' : 'Add Email'}
							</button>
							<button type="button" class="cancel-btn" onclick={resetForm}> Cancel </button>
						</div>
					</form>
				</div>
			{:else}
				<button
					class="add-email-btn"
					onclick={() => {
						resetForm();
						showAddForm = true;
					}}
					disabled={isSaving || editingEmail !== null}
				>
					<Plus size={18} />
					Add Email
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.contact-emails-page {
		width: 100%;
		max-width: 800px;
		min-width: 0;
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

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 64px 24px;
		text-align: center;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--border-color, #3a3a3a);
		border-top: 3px solid var(--accent-color, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.emails-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.email-item {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		transition: all 0.2s ease;
		cursor: move;
		min-width: 0;
		box-sizing: border-box;
	}

	.email-item:hover {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.email-item.dragging {
		opacity: 0.5;
	}

	.email-item.drag-over {
		border-color: var(--accent-color, #6366f1);
		background: var(--bg-tertiary, #3a3a3a);
	}

	.email-item.not-draggable {
		cursor: default;
	}

	.drag-handle {
		color: var(--text-secondary, #a1a1aa);
		cursor: grab;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.email-info {
		flex: 1;
		min-width: 0;
	}

	.email-details {
		min-width: 0;
	}

	.email-details .email-address {
		color: var(--text-primary, #ffffff);
		margin: 0 0 4px 0;
		font-size: 16px;
		font-weight: 500;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.email-details .email-description {
		color: var(--text-secondary, #a1a1aa);
		margin: 0 0 8px 0;
		font-size: 14px;
		overflow-wrap: anywhere;
	}

	.email-meta {
		display: flex;
		gap: 16px;
		font-size: 12px;
		color: var(--text-muted, #b0b0b0);
	}

	.email-actions {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
		margin-left: auto;
	}

	@media (max-width: 560px) {
		.email-item {
			flex-direction: column;
			align-items: stretch;
			padding: 16px;
			gap: 12px;
		}

		.email-actions {
			width: 100%;
			margin-left: 0;
			justify-content: flex-end;
			flex-wrap: wrap;
		}
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
		border-color: var(--accent-color, #6366f1);
	}

	.action-button.danger:hover {
		background: rgba(239, 68, 68, 0.1);
		border-color: #ef4444;
		color: #ef4444;
	}

	.new-email-form {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 24px;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.new-email-form h3 {
		margin: 0;
		color: var(--text-primary, #ffffff);
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 4px;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: block;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 500;
		margin-bottom: 8px;
	}

	.field-label-static {
		display: block;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 500;
		margin-bottom: 8px;
	}

	.edit-input {
		width: 100%;
		padding: 12px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-family: inherit;
		box-sizing: border-box;
	}

	.edit-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.edit-input[rows] {
		resize: vertical;
		min-height: 80px;
	}

	textarea.edit-input {
		resize: vertical;
		min-height: 80px;
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 12px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-family: inherit;
		box-sizing: border-box;
	}

	.form-group textarea {
		resize: vertical;
		min-height: 80px;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		width: auto;
		cursor: pointer;
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 0;
		padding-top: 0;
		border-top: none;
	}

	@media (max-width: 520px) {
		.form-actions {
			flex-direction: column-reverse;
		}

		.form-actions .save-btn,
		.form-actions .cancel-btn {
			width: 100%;
			justify-content: center;
		}
	}

	.save-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: var(--accent-color, #6366f1);
		color: #ffffff;
		border: none;
		padding: 10px 20px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.save-btn:hover:not(:disabled) {
		background: var(--accent-color-dark, #4f46e5);
	}

	.save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.cancel-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		border: 1px solid var(--border-color, #3a3a3a);
		padding: 10px 20px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-btn:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
		border-color: var(--accent-color, #6366f1);
	}

	.add-email-btn {
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

	.add-email-btn:hover:not(:disabled) {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.05);
	}

	.add-email-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.form-group > label {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
		margin-bottom: 8px;
	}

	.field-hint {
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
		margin-top: 6px;
		margin-bottom: 0;
		line-height: 1.4;
	}

	.header-form-group {
		margin-bottom: 24px;
	}

	.header-view-container {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		min-height: 48px;
	}

	.header-view-text {
		flex: 1;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		line-height: 1.5;
		word-wrap: break-word;
	}

	.header-view-text .empty-text {
		color: var(--text-secondary, #a1a1aa);
		font-style: italic;
	}

	.header-edit-container {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.header-input {
		flex: 1;
		min-width: 0;
		width: 100%;
		padding: 12px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-family: inherit;
		box-sizing: border-box;
	}

	.header-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.header-edit-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.icon-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-primary, #1a1a1a);
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.icon-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: var(--accent-color, #6366f1);
		color: var(--text-primary, #ffffff);
	}

	.edit-icon-button {
		margin-top: 0;
	}

	.save-icon-button:hover {
		background: rgba(34, 197, 94, 0.1);
		border-color: #22c55e;
		color: #22c55e;
	}

	.cancel-icon-button:hover {
		background: rgba(239, 68, 68, 0.1);
		border-color: #ef4444;
		color: #ef4444;
	}
</style>
