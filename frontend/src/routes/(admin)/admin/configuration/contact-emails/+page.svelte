<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Mail, Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-svelte';

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

	onMount(() => {
		loadContactEmails();
	});

	async function loadContactEmails() {
		try {
			isLoading = true;
			const response = await fetch('/api/config/contact_emails', {
				credentials: 'include'
			});
			const data = await response.json();

			if (data.success && data.data?.value) {
				try {
					contactEmails = JSON.parse(data.data.value);
				} catch (e) {
					contactEmails = [];
				}
			} else {
				contactEmails = [];
			}
		} catch (error) {
			console.error('Error loading contact emails:', error);
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

			if (!editingEmail) {
				formData.id = crypto.randomUUID();
			}

			let updatedEmails: ContactEmail[];
			if (editingEmail) {
				updatedEmails = contactEmails.map(email => 
					email.id === editingEmail.id ? { ...formData, id: editingEmail.id } : email
				);
			} else {
				updatedEmails = [...contactEmails, formData as ContactEmail];
			}

			// Save to config
			const response = await fetch('/api/config/contact_emails', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					value: JSON.stringify(updatedEmails),
					dataType: 'string'
				})
			});

			const data = await response.json();

			if (data.success) {
				toast.success(editingEmail ? 'Contact email updated successfully' : 'Contact email created successfully');
				resetForm();
				await loadContactEmails();
			} else {
				toast.error(data.error || 'Failed to save contact email');
			}
		} catch (error) {
			console.error('Error saving contact email:', error);
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
			displayOrder: 0,
			isActive: true
		};
		showAddForm = false;
	}

	async function deleteEmail(id: string) {
		if (!confirm('Are you sure you want to delete this contact email?')) {
			return;
		}

		try {
			const updatedEmails = contactEmails.filter(email => email.id !== id);

			const response = await fetch('/api/config/contact_emails', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					value: JSON.stringify(updatedEmails),
					dataType: 'string'
				})
			});

			const data = await response.json();

			if (data.success) {
				toast.success('Contact email deleted successfully');
				await loadContactEmails();
			} else {
				toast.error(data.error || 'Failed to delete contact email');
			}
		} catch (error) {
			console.error('Error deleting contact email:', error);
			toast.error('Failed to delete contact email');
		}
	}

	async function toggleActive(id: string) {
		try {
			const updatedEmails = contactEmails.map(email => 
				email.id === id ? { ...email, isActive: !email.isActive } : email
			);

			const response = await fetch('/api/config/contact_emails', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					value: JSON.stringify(updatedEmails),
					dataType: 'string'
				})
			});

			const data = await response.json();

			if (data.success) {
				await loadContactEmails();
			} else {
				toast.error(data.error || 'Failed to toggle contact email status');
			}
		} catch (error) {
			console.error('Error toggling contact email status:', error);
			toast.error('Failed to toggle contact email status');
		}
	}

	function handleDragStart(index: number) {
		if (editingEmail || showAddForm) return;
		draggedIndex = index;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === index) return;
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	async function handleDrop(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === index) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}

		const items = [...contactEmails];
		const [draggedItem] = items.splice(draggedIndex, 1);
		items.splice(index, 0, draggedItem);

		try {
			const updatedEmails = items.map((item, idx) => ({
				...item,
				displayOrder: idx
			}));

			const response = await fetch('/api/config/contact_emails', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					value: JSON.stringify(updatedEmails),
					dataType: 'string'
				})
			});

			const data = await response.json();
			if (data.success) {
				await loadContactEmails();
			} else {
				toast.error('Failed to update order');
			}
		} catch (error) {
			console.error('Error updating order:', error);
			toast.error('Failed to update order');
		}

		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}
</script>

<svelte:head>
	<title>Contact Emails - Site Settings - dane.gg Admin</title>
</svelte:head>

<div class="contact-emails-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-text">
				<h1>Contact Emails</h1>
				<p>Manage email addresses displayed on the contact page</p>
			</div>
			<button 
				class="add-button" 
				onclick={() => { resetForm(); showAddForm = true; }}
				disabled={isSaving}
			>
				<Plus size={20} />
				Add Email
			</button>
		</div>
	</div>

	{#if isLoading}
		<div class="loading">
			<div class="loading-spinner"></div>
			<p>Loading contact emails...</p>
		</div>
	{:else if contactEmails.length === 0}
		<div class="empty-state">
			<Mail size={48} class="empty-icon" />
			<h3>No contact emails yet</h3>
			<p>Add your first email address to get started</p>
			<button 
				class="add-button" 
				onclick={() => { resetForm(); showAddForm = true; }}
			>
				<Plus size={20} />
				Add Your First Email
			</button>
		</div>
	{:else}
		<div class="emails-list">
			{#each contactEmails as email, index (email.id)}
				<div 
					class="email-item"
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
					<div class="drag-handle">
						<GripVertical size={20} />
					</div>
					<div class="email-info">
						<div class="email-details">
							<h3>{email.description}</h3>
							<p class="email-address">{email.email}</p>
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
						<button 
							class="action-button" 
							onclick={() => editEmail(email)}
							title="Edit email"
						>
							<Edit size={16} />
						</button>
						<button 
							class="action-button danger" 
							onclick={() => deleteEmail(email.id)}
							title="Delete email"
						>
							<Trash2 size={16} />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if showAddForm}
		<div class="modal-overlay" onclick={resetForm}>
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h2>{editingEmail ? 'Edit Email' : 'Add New Email'}</h2>
					<button class="close-button" onclick={resetForm}>
						×
					</button>
				</div>

				<form class="modal-form" onsubmit={(e) => { e.preventDefault(); saveEmail(); }}>
					<div class="form-group">
						<label for="description">Description *</label>
						<textarea 
							id="description"
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
							bind:value={formData.email}
							placeholder="me@dane.gg"
							required
						/>
					</div>

					<div class="form-group">
						<label for="displayOrder">Display Order</label>
						<input 
							type="number" 
							id="displayOrder"
							bind:value={formData.displayOrder}
							min="0"
						/>
					</div>

					<div class="form-group checkbox-group">
						<label class="checkbox-label">
							<input 
								type="checkbox" 
								bind:checked={formData.isActive}
							/>
							<span class="checkbox-text">Active (visible on website)</span>
						</label>
					</div>

					<div class="form-actions">
						<button type="button" class="cancel-button" onclick={resetForm}>
							Cancel
						</button>
						<button type="submit" class="save-button" disabled={isSaving}>
							{isSaving ? 'Saving...' : (editingEmail ? 'Update Email' : 'Add Email')}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

<style>
	.contact-emails-page {
		padding: 24px;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 32px;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-text h1 {
		color: var(--text-primary, #ffffff);
		margin: 0 0 8px 0;
		font-size: 28px;
		font-weight: 600;
	}

	.header-text p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0;
		font-size: 14px;
	}

	.add-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 24px;
		background: var(--accent-color, #6366f1);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-button:hover:not(:disabled) {
		background: var(--accent-hover, #5558e3);
		transform: translateY(-1px);
	}

	.add-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.loading,
	.empty-state {
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
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.empty-icon {
		color: var(--text-secondary, #a1a1aa);
		margin-bottom: 16px;
		opacity: 0.5;
	}

	.empty-state h3 {
		color: var(--text-primary, #ffffff);
		margin: 0 0 8px 0;
		font-size: 20px;
	}

	.empty-state p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0 0 24px 0;
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
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.email-info {
		flex: 1;
	}

	.email-details h3 {
		color: var(--text-primary, #ffffff);
		margin: 0 0 8px 0;
		font-size: 16px;
		font-weight: 500;
	}

	.email-address {
		color: var(--text-secondary, #a1a1aa);
		margin: 0 0 8px 0;
		font-size: 14px;
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

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
	}

	.modal {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 12px;
		width: 100%;
		max-width: 600px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.modal-header h2 {
		color: var(--text-primary, #ffffff);
		margin: 0;
		font-size: 20px;
		font-weight: 600;
	}

	.close-button {
		background: none;
		border: none;
		color: var(--text-secondary, #a1a1aa);
		font-size: 28px;
		cursor: pointer;
		line-height: 1;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.close-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.modal-form {
		padding: 24px;
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

	.checkbox-group {
		margin-top: 24px;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	.checkbox-label input[type="checkbox"] {
		width: auto;
		cursor: pointer;
	}

	.checkbox-text {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 32px;
		padding-top: 24px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.cancel-button,
	.save-button {
		padding: 12px 24px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
	}

	.cancel-button {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.cancel-button:hover {
		background: var(--bg-hover, #474747);
	}

	.save-button {
		background: var(--accent-color, #6366f1);
		color: white;
	}

	.save-button:hover:not(:disabled) {
		background: var(--accent-hover, #5558e3);
	}

	.save-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
