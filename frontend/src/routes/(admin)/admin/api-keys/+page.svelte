<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Trash2, Key, X, Copy, Check, RefreshCw, Eye, EyeOff, AlertTriangle } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import Tabs from '$lib/admin/components/ui/Tabs.svelte';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';

	interface ApiKey {
		id: string;
		name: string;
		keyPrefix: string;
		permissions: string;
		isActive: boolean;
		lastUsedAt: string | null;
		expiresAt: string | null;
		createdAt: string;
	}

	let apiKeys = $state<ApiKey[]>([]);
	let loading = $state(true);
	let showAddModal = $state(false);
	let showDeleteConfirm = $state(false);
	let selectedKey = $state<ApiKey | null>(null);
	let isSubmitting = $state(false);

	let newlyCreatedKey = $state<string | null>(null);
	let showNewKeyModal = $state(false);
	let copiedKey = $state(false);
	let showDiscardKeyDialog = $state(false);
	let showRegenerateKeyDialog = $state(false);
	let keyPendingRegenerate = $state<ApiKey | null>(null);

	let addForm = $state({
		name: '',
		permissions: 'full',
		expiresAt: ''
	});

	// Permission tab config
	const permissionTabs = [
		{ id: 'full', label: 'Full Access', value: 'full' },
		{ id: 'read', label: 'Read Only', value: 'read' },
		{ id: 'chat', label: 'Chat Only', value: 'chat' }
	];

	function handlePermissionChange(tabId: string, value: string) {
		addForm.permissions = value;
	}

	const API_BASE = 'http://localhost:3001';

	onMount(async () => {
		await loadApiKeys();
	});

	async function loadApiKeys() {
		try {
			loading = true;
			const response = await fetch(`${API_BASE}/api/api-keys`, {
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to fetch API keys');
			}

			const data = await response.json();
			apiKeys = data.keys || [];
		} catch (err) {
			console.error('Error loading API keys:', err);
			toast.error('Failed to load API keys', {
				description: err instanceof Error ? err.message : 'Please try refreshing the page'
			});
		} finally {
			loading = false;
		}
	}

	function openAddModal() {
		addForm = { name: '', permissions: 'full', expiresAt: '' };
		showAddModal = true;
	}

	function closeAddModal() {
		showAddModal = false;
		addForm = { name: '', permissions: 'full', expiresAt: '' };
	}

	async function handleCreateKey() {
		if (!addForm.name.trim()) {
			toast.error('Validation failed', {
				description: 'Name is required'
			});
			return;
		}

		try {
			isSubmitting = true;
			const response = await fetch(`${API_BASE}/api/api-keys`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					name: addForm.name.trim(),
					permissions: addForm.permissions,
					expiresAt: addForm.expiresAt || null
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create API key');
			}

			const data = await response.json();
			
			newlyCreatedKey = data.key;
			showNewKeyModal = true;
			copiedKey = false;
			
			closeAddModal();
			await loadApiKeys();
			
			toast.success('API key created', {
				description: 'Make sure to copy the key - you won\'t be able to see it again!'
			});
		} catch (err) {
			console.error('Error creating API key:', err);
			toast.error('Failed to create API key', {
				description: err instanceof Error ? err.message : 'Please try again'
			});
		} finally {
			isSubmitting = false;
		}
	}

	async function copyKeyToClipboard() {
		if (!newlyCreatedKey) return;
		
		try {
			await navigator.clipboard.writeText(newlyCreatedKey);
			copiedKey = true;
			toast.success('Copied to clipboard');
			
			setTimeout(() => {
				copiedKey = false;
			}, 3000);
		} catch (err) {
			toast.error('Failed to copy to clipboard');
		}
	}

	function closeNewKeyModal() {
		if (!copiedKey) {
			showDiscardKeyDialog = true;
			return;
		}
		showNewKeyModal = false;
		newlyCreatedKey = null;
	}

	function cancelDiscardKey() {
		showDiscardKeyDialog = false;
	}

	function confirmDiscardNewKey() {
		showDiscardKeyDialog = false;
		showNewKeyModal = false;
		newlyCreatedKey = null;
	}

	async function toggleKeyStatus(key: ApiKey) {
		try {
			const response = await fetch(`${API_BASE}/api/api-keys/${key.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ isActive: !key.isActive })
			});

			if (!response.ok) {
				throw new Error('Failed to update API key');
			}

			await loadApiKeys();
			toast.success(key.isActive ? 'API key deactivated' : 'API key activated');
		} catch (err) {
			console.error('Error toggling API key:', err);
			toast.error('Failed to update API key');
		}
	}

	function requestRegenerateKey(key: ApiKey) {
		keyPendingRegenerate = key;
		showRegenerateKeyDialog = true;
	}

	function cancelRegenerateKey() {
		showRegenerateKeyDialog = false;
		keyPendingRegenerate = null;
	}

	async function confirmRegenerateKey() {
		if (!keyPendingRegenerate) return;
		const key = keyPendingRegenerate;
		try {
			isSubmitting = true;
			const response = await fetch(`${API_BASE}/api/api-keys/${key.id}/regenerate`, {
				method: 'POST',
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to regenerate API key');
			}

			const data = await response.json();

			newlyCreatedKey = data.key;
			showNewKeyModal = true;
			copiedKey = false;

			await loadApiKeys();
			toast.success('API key regenerated');
		} catch (err) {
			console.error('Error regenerating API key:', err);
			toast.error('Failed to regenerate API key');
		} finally {
			isSubmitting = false;
			cancelRegenerateKey();
		}
	}

	function confirmDelete(key: ApiKey) {
		selectedKey = key;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		selectedKey = null;
	}

	async function handleDelete() {
		if (!selectedKey) return;

		try {
			isSubmitting = true;
			const response = await fetch(`${API_BASE}/api/api-keys/${selectedKey.id}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to delete API key');
			}

			toast.success('API key deleted', {
				description: `"${selectedKey.name}" has been deleted`
			});
			cancelDelete();
			await loadApiKeys();
		} catch (err) {
			console.error('Error deleting API key:', err);
			toast.error('Failed to delete API key');
		} finally {
			isSubmitting = false;
		}
	}

	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Never';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function isExpired(expiresAt: string | null): boolean {
		if (!expiresAt) return false;
		return new Date(expiresAt) < new Date();
	}

	function getPermissionLabel(permission: string): string {
		switch (permission) {
			case 'full': return 'Full Access';
			case 'read': return 'Read Only';
			case 'chat': return 'Chat Only';
			default: return permission;
		}
	}
</script>

<svelte:head>
	<title>API Keys - Admin Panel</title>
	<meta name="description" content="Manage API keys for external integrations" />
</svelte:head>

<ConfirmDialog
	bind:open={showDiscardKeyDialog}
	title="Close without copying?"
	message="You have not copied this API key yet. You will not be able to see it again after closing."
	variant="default"
	confirmLabel="Discard key"
	cancelLabel="Go back"
	onConfirm={confirmDiscardNewKey}
	onCancel={cancelDiscardKey}
/>

<ConfirmDialog
	bind:open={showRegenerateKeyDialog}
	title="Regenerate API key"
	message={keyPendingRegenerate
		? `Regenerate “${keyPendingRegenerate.name}”? The old key will stop working immediately.`
		: ''}
	variant="danger"
	confirmLabel="Regenerate"
	cancelLabel="Cancel"
	loading={isSubmitting}
	onConfirm={confirmRegenerateKey}
	onCancel={cancelRegenerateKey}
/>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete API key"
	message={selectedKey ? `Delete “${selectedKey.name}”?` : ''}
	detail="Any applications using this key will immediately lose access."
	variant="danger"
	confirmLabel="Delete key"
	cancelLabel="Cancel"
	loading={isSubmitting}
	onConfirm={handleDelete}
	onCancel={cancelDelete}
/>

<div class="api-keys-page">
	<div class="header">
		<div>
			<h1>API Keys</h1>
			<p class="subtitle">Manage API keys for bots and external integrations</p>
		</div>
		<button class="create-button" onclick={openAddModal}>
			<Plus size={20} />
			Create API Key
		</button>
	</div>

	<!-- Usage instructions -->
	<div class="info-card">
		<div class="info-icon">
			<Key size={20} />
		</div>
		<div class="info-content">
			<h3>Using API Keys</h3>
			<p>Include your API key in requests using one of these methods:</p>
			<div class="code-examples">
				<code>Authorization: Bearer dk_your_key_here</code>
				<code>X-Api-Key: dk_your_key_here</code>
			</div>
			<p class="info-note">API keys provide the same access as an admin session. Keep them secure!</p>
		</div>
	</div>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading API keys...</p>
		</div>
	{:else if apiKeys.length === 0}
		<div class="empty-state">
			<Key size={48} />
			<p>No API keys yet</p>
			<button onclick={openAddModal}>Create your first API key</button>
		</div>
	{:else}
		<div class="keys-table-container">
			<table class="keys-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Key Prefix</th>
						<th>Permissions</th>
						<th>Status</th>
						<th>Last Used</th>
						<th>Expires</th>
						<th class="actions-column">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each apiKeys as key (key.id)}
						<tr class:inactive={!key.isActive} class:expired={isExpired(key.expiresAt)}>
							<td class="name-cell">
								<span class="key-name">{key.name}</span>
							</td>
							<td>
								<code class="key-prefix">{key.keyPrefix}...</code>
							</td>
							<td>
								<span class="permission-badge" class:full={key.permissions === 'full'}>
									{getPermissionLabel(key.permissions)}
								</span>
							</td>
							<td>
								{#if isExpired(key.expiresAt)}
									<span class="status-badge expired">
										<AlertTriangle size={14} />
										Expired
									</span>
								{:else if key.isActive}
									<span class="status-badge active">
										<Check size={14} />
										Active
									</span>
								{:else}
									<span class="status-badge inactive">
										<X size={14} />
										Inactive
									</span>
								{/if}
							</td>
							<td class="date-cell">{formatDate(key.lastUsedAt)}</td>
							<td class="date-cell">{key.expiresAt ? formatDate(key.expiresAt) : 'Never'}</td>
							<td class="actions-cell">
								<div class="action-buttons">
									<button
										class="action-button toggle"
										onclick={() => toggleKeyStatus(key)}
										title={key.isActive ? 'Deactivate key' : 'Activate key'}
									>
										{#if key.isActive}
											<EyeOff size={16} />
										{:else}
											<Eye size={16} />
										{/if}
									</button>
									<button
										class="action-button regenerate"
										onclick={() => requestRegenerateKey(key)}
										title="Regenerate key"
									>
										<RefreshCw size={16} />
									</button>
									<button
										class="action-button delete"
										onclick={() => confirmDelete(key)}
										title="Delete key"
									>
										<Trash2 size={16} />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Add API Key Modal -->
{#if showAddModal}
	<div class="modal-overlay" onclick={closeAddModal}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Create API Key</h2>
				<button class="close-button" onclick={closeAddModal}>
					<X size={20} />
				</button>
			</div>
			<form class="modal-form" onsubmit={(e) => { e.preventDefault(); handleCreateKey(); }}>
				<div class="form-content">
					<div class="form-group">
						<label for="key-name">Name *</label>
						<input
							id="key-name"
							type="text"
							bind:value={addForm.name}
							placeholder="e.g., Discord Bot, External Service"
							required
							disabled={isSubmitting}
						/>
						<span class="form-hint">A descriptive name to identify this key</span>
					</div>

					<div class="form-group">
						<label for="key-permissions">Permissions</label>
						<div class="permissions-tabs-wrapper">
							<Tabs
								tabs={permissionTabs}
								activeTab={addForm.permissions}
								onTabChange={handlePermissionChange}
								variant="default"
								size="md"
								fullWidth={true}
								disabled={isSubmitting}
							/>
						</div>
						<div class="permission-descriptions">
							{#if addForm.permissions === 'full'}
								<span class="permission-hint">All API endpoints - Full administrative access</span>
							{:else if addForm.permissions === 'read'}
								<span class="permission-hint">GET requests only - Read-only access to data</span>
							{:else if addForm.permissions === 'chat'}
								<span class="permission-hint">WebSocket chat access - Send and receive chat messages</span>
							{/if}
						</div>
					</div>

					<div class="form-group">
						<label for="key-expires">Expiration (optional)</label>
						<input
							id="key-expires"
							type="datetime-local"
							bind:value={addForm.expiresAt}
							disabled={isSubmitting}
						/>
						<span class="form-hint">Leave empty for no expiration</span>
					</div>
				</div>

				<div class="modal-actions">
					<button type="button" class="cancel-button" onclick={closeAddModal} disabled={isSubmitting}>
						Cancel
					</button>
					<button type="submit" class="save-button" disabled={isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Create Key'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- New Key Display Modal -->
{#if showNewKeyModal && newlyCreatedKey}
	<div class="modal-overlay">
		<div class="modal modal-key-display" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>API Key Created</h2>
			</div>
			<div class="key-display-content">
				<div class="warning-banner">
					<AlertTriangle size={20} />
					<span>Copy this key now! You won't be able to see it again.</span>
				</div>
				
				<div class="key-display">
					<code class="full-key">{newlyCreatedKey}</code>
					<button 
						class="copy-button" 
						onclick={copyKeyToClipboard}
						class:copied={copiedKey}
					>
						{#if copiedKey}
							<Check size={18} />
							Copied!
						{:else}
							<Copy size={18} />
							Copy
						{/if}
					</button>
				</div>
			</div>
			<div class="modal-actions">
				<button 
					class="save-button" 
					onclick={closeNewKeyModal}
					class:confirm-copy={!copiedKey}
				>
					{copiedKey ? 'Done' : 'I\'ve saved the key'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.api-keys-page {
		padding: 24px;
		max-width: 1400px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 24px;
	}

	.header h1 {
		margin: 0 0 8px 0;
		font-size: 28px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.subtitle {
		margin: 0;
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
	}

	.create-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: var(--accent-color, #6366f1);
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.create-button:hover:not(:disabled) {
		background: var(--accent-color-dark, #4f46e5);
		transform: translateY(-1px);
	}

	/* Info Card */
	.info-card {
		display: flex;
		gap: 16px;
		padding: 20px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 12px;
		margin-bottom: 24px;
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
	}

	.info-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--accent-color-light, rgba(99, 102, 241, 0.2));
		color: var(--accent-color, #6366f1);
		border-radius: 8px;
		flex-shrink: 0;
	}

	.info-content {
		min-width: 0;
		flex: 1;
	}

	.info-content h3 {
		margin: 0 0 8px 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.info-content p {
		margin: 0 0 12px 0;
		font-size: 14px;
		color: var(--text-secondary, #a1a1aa);
	}

	.code-examples {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 12px;
	}

	.code-examples code {
		display: block;
		padding: 8px 12px;
		background: var(--bg-primary, #1a1a1a);
		border-radius: 6px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 13px;
		color: var(--text-primary, #ffffff);
		overflow-x: auto;
		max-width: 100%;
		box-sizing: border-box;
		word-break: break-word;
		overflow-wrap: anywhere;
	}

	.info-note {
		font-size: 13px !important;
		color: var(--text-tertiary, #71717a) !important;
		margin-bottom: 0 !important;
	}

	/* Loading & Empty States */
	.loading {
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
		border-top-color: var(--accent-color, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 20px;
		text-align: center;
		color: var(--text-secondary, #a1a1aa);
	}

	.empty-state :global(svg) {
		margin-bottom: 16px;
		opacity: 0.5;
	}

	.empty-state button {
		margin-top: 16px;
		padding: 10px 20px;
		background: var(--accent-color, #6366f1);
		color: #ffffff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
	}

	/* Table Styles */
	.keys-table-container {
		background: var(--bg-secondary, #2d2d2d);
		border-radius: 12px;
		overflow-x: auto;
		overflow-y: hidden;
		-webkit-overflow-scrolling: touch;
		max-width: 100%;
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.keys-table {
		width: 100%;
		min-width: 720px;
		border-collapse: collapse;
	}

	.keys-table thead {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.keys-table th {
		padding: 16px;
		text-align: left;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-secondary, #a1a1aa);
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.keys-table td {
		padding: 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		vertical-align: middle;
	}

	.keys-table tbody tr:hover {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.keys-table tbody tr:last-child td {
		border-bottom: none;
	}

	.keys-table tbody tr.inactive {
		opacity: 0.6;
	}

	.keys-table tbody tr.expired {
		background: rgba(239, 68, 68, 0.05);
	}

	.key-name {
		font-weight: 500;
	}

	.key-prefix {
		padding: 4px 8px;
		background: var(--bg-primary, #1a1a1a);
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
	}

	.permission-badge {
		display: inline-flex;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
	}

	.permission-badge.full {
		background: var(--accent-color-light, rgba(99, 102, 241, 0.2));
		color: var(--accent-color, #6366f1);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
	}

	.status-badge.active {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.status-badge.inactive {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
	}

	.status-badge.expired {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.date-cell {
		color: var(--text-secondary, #a1a1aa);
		white-space: nowrap;
		font-size: 13px;
	}

	.actions-column {
		width: 150px;
	}

	.actions-cell {
		text-align: right;
	}

	.action-buttons {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-button:hover:not(:disabled) {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
	}

	.action-button.delete:hover:not(:disabled) {
		border-color: #ef4444;
		color: #ef4444;
	}

	/* Modal Styles */
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
		border-radius: 12px;
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
		border: 1px solid var(--border-color, #3a3a3a);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
	}

	.modal-small {
		max-width: 400px;
	}

	.modal-key-display {
		max-width: 600px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.close-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.modal-content {
		padding: 24px;
	}

	.modal-content p {
		margin: 0 0 12px 0;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		line-height: 1.5;
	}

	.warning-text {
		color: #ef4444 !important;
		font-size: 13px !important;
	}

	.modal-form {
		padding: 0;
	}

	.form-content {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form-group label {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.form-group input {
		padding: 10px 12px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.form-hint {
		font-size: 12px;
		color: var(--text-tertiary, #71717a);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 24px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.cancel-button,
	.save-button,
	.delete-button {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-button {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.cancel-button:hover:not(:disabled) {
		background: var(--bg-primary, #1a1a1a);
	}

	.save-button {
		background: var(--accent-color, #6366f1);
		color: #ffffff;
	}

	.save-button:hover:not(:disabled) {
		background: var(--accent-color-dark, #4f46e5);
	}

	.save-button.confirm-copy {
		background: #f59e0b;
	}

	.save-button.confirm-copy:hover:not(:disabled) {
		background: #d97706;
	}

	.delete-button {
		background: #ef4444;
		color: #ffffff;
	}

	.delete-button:hover:not(:disabled) {
		background: #dc2626;
	}

	/* Key Display Modal */
	.key-display-content {
		padding: 24px;
	}

	.warning-banner {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: rgba(245, 158, 11, 0.2);
		border: 1px solid rgba(245, 158, 11, 0.4);
		border-radius: 8px;
		color: #f59e0b;
		font-size: 14px;
		font-weight: 500;
		margin-bottom: 20px;
	}

	.key-display {
		display: flex;
		gap: 12px;
		align-items: stretch;
	}

	.full-key {
		flex: 1;
		padding: 16px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		word-break: break-all;
		line-height: 1.5;
	}

	.copy-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 20px;
		background: var(--accent-color, #6366f1);
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.copy-button:hover {
		background: var(--accent-color-dark, #4f46e5);
	}

	.copy-button.copied {
		background: #22c55e;
	}

	.permissions-tabs-wrapper {
		margin-top: 4px;
	}

	.permission-descriptions {
		margin-top: 8px;
		min-height: 20px;
	}

	.permission-hint {
		display: block;
		font-size: 12px;
		color: var(--text-tertiary, #71717a);
		line-height: 1.4;
	}

	@media (max-width: 640px) {
		.api-keys-page {
			padding: 16px;
		}

		.header {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}

		.create-button {
			width: 100%;
			justify-content: center;
		}

		.info-card {
			flex-direction: column;
			padding: 16px;
		}

		.keys-table-container {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			max-width: 100%;
		}

		.key-display {
			flex-direction: column;
		}

		.copy-button {
			width: 100%;
			justify-content: center;
		}
	}
</style>

