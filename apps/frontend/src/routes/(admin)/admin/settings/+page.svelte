<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { mode, setMode } from 'mode-watcher';
	import Tabs from '$lib/admin/components/ui/Tabs.svelte';
	import AccentColorPicker from '$lib/admin/components/ui/AccentColorPicker.svelte';
	import {
		Monitor,
		Sun,
		Moon,
		Plus,
		Trash2,
		Key,
		X,
		Copy,
		Check,
		RefreshCw,
		Eye,
		EyeOff,
		AlertTriangle
	} from 'lucide-svelte';
	import { themeService } from '$lib/admin/services/theme';
	import { accentColorService } from '$lib/admin/services/accentColor';
	import { settingsService } from '$lib/admin/services/settings';
	import { user } from '$lib/admin/stores/auth';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
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

	// Theme tabs configuration
	const themeTabs = [
		{ id: 'system', label: 'Auto', value: 'system' },
		{ id: 'light', label: 'Light', value: 'light' },
		{ id: 'dark', label: 'Dark', value: 'dark' }
	];

	// Get current theme preference - start with system as default
	let currentTheme = $state('system');
	let currentAccentColor = $state('#3b82f6');
	let isInitialized = $state(false);

	// API Keys state
	let apiKeys = $state<ApiKey[]>([]);
	let apiKeysLoading = $state(true);
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

	const permissionTabs = [
		{ id: 'full', label: 'Full Access', value: 'full' },
		{ id: 'read', label: 'Read Only', value: 'read' },
		{ id: 'chat', label: 'Chat Only', value: 'chat' },
		{ id: 'webhooks', label: 'Webhooks Only', value: 'webhooks' }
	];

	function handlePermissionChange(tabId: string, value: string) {
		addForm.permissions = value;
	}

	async function loadAppearanceSettings() {
		if ($user) {
			try {
				const [dbTheme, dbAccentColor] = await Promise.all([
					settingsService.getThemePreference(),
					settingsService.getAccentColor()
				]);
				currentTheme = dbTheme;
				setMode(dbTheme as 'light' | 'dark' | 'system');
				currentAccentColor = dbAccentColor;
			} catch (error) {
				logger.error('Failed to load settings from database:', error);
				loadFromLocalStorage();
				currentAccentColor = accentColorService.getCurrentColor();
			}
		} else {
			loadFromLocalStorage();
			currentAccentColor = accentColorService.getCurrentColor();
		}
	}

	// Initialize theme from db (for authenticated users) or localStorage
	onMount(async () => {
		await loadAppearanceSettings();
		isInitialized = true;

		await loadApiKeys();

		setTimeout(() => {
			toast.success('Settings loaded successfully!', {
				description: 'Your preferences are ready to customize'
			});
		}, 500);
	});

	afterNavigate(({ to }) => {
		if (to?.url.pathname === '/admin/settings') {
			void loadAppearanceSettings();
		}
	});

	async function loadApiKeys() {
		try {
			apiKeysLoading = true;
			const response = await fetch('/api/api-keys', {
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to fetch API keys');
			}

			const data = await response.json();
			apiKeys = data.keys || [];
		} catch (err) {
			logger.error('Error loading API keys:', err);
			toast.error('Failed to load API keys', {
				description: err instanceof Error ? err.message : 'Please try refreshing the page'
			});
		} finally {
			apiKeysLoading = false;
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
			const response = await fetch('/api/api-keys', {
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
				description: "Make sure to copy the key - you won't be able to see it again!"
			});
		} catch (err) {
			logger.error('Error creating API key:', err);
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
		} catch {
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
			const response = await fetch(`/api/api-keys/${key.id}`, {
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
			logger.error('Error toggling API key:', err);
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
			const response = await fetch(`/api/api-keys/${key.id}/regenerate`, {
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
			logger.error('Error regenerating API key:', err);
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
			const response = await fetch(`/api/api-keys/${selectedKey.id}`, {
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
			logger.error('Error deleting API key:', err);
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
			case 'full':
				return 'Full Access';
			case 'read':
				return 'Read Only';
			case 'chat':
				return 'Chat Only';
			case 'webhooks':
				return 'Webhooks Only';
			default:
				return permission;
		}
	}

	function loadFromLocalStorage() {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('mode-watcher-mode');
			if (stored && ['light', 'dark', 'system'].includes(stored)) {
				currentTheme = stored;
			}
		}
	}

	// Debug current mode
	$effect(() => {});

	async function handleThemeChange(tabId: string, value: string) {
		currentTheme = value;

		// Use theme service to set and save theme
		try {
			await themeService.setTheme(value);

			// Show success toast
			const themeName =
				value === 'system' ? 'Auto' : value.charAt(0).toUpperCase() + value.slice(1);
			toast.success(`Theme changed to ${themeName}`, {
				description: 'Your preference has been saved to your account'
			});
		} catch (error) {
			logger.error('Failed to set theme:', error);
			// Fallback to local mode setting
			setMode(value as 'light' | 'dark' | 'system');

			// Show error toast
			toast.error('Failed to save theme preference');
		}
	}

	async function handleAccentColorChange(event: CustomEvent<{ color: string }>) {
		const { color } = event.detail;
		currentAccentColor = color;

		// Use accent color service to set and save color
		try {
			await accentColorService.setAccentColor(color);

			// Show success toast
			toast.success(`Accent color updated`, {
				description: `New color ${color.toUpperCase()} applied across the interface`
			});
		} catch (error) {
			logger.error('Failed to set accent color:', error);

			// Show error toast
			toast.error('Failed to save accent color preference');
		}
	}
</script>

<svelte:head>
	<title>{adminPageTitle('Settings')}</title>
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

<div class="settings-page">
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">Admin Settings</h1>
			<p>Manage your admin panel preferences and system settings</p>
		</div>
	</div>

	<div class="page-content">
		<!-- Theme Settings Section -->
		<div class="settings-section">
			<div class="section-header">
				<h2 class="section-title">Appearance</h2>
				<p class="section-description">Customize the look and feel of your admin panel</p>
			</div>

			<div class="setting-group">
				<div class="setting-info">
					<h3 class="setting-title">Theme</h3>
					<p class="setting-description">Choose your preferred color scheme</p>
				</div>

				<div class="setting-control setting-control--tabs">
					<Tabs
						tabs={themeTabs}
						activeTab={currentTheme}
						onTabChange={handleThemeChange}
						variant="default"
						size="md"
						fullWidth={true}
					/>
				</div>
			</div>

			<!-- Accent Color Section -->
			<div class="setting-group accent-color-group">
				<div class="setting-info">
					<h3 class="setting-title">Accent Color</h3>
					<p class="setting-description">Choose a color that reflects your style</p>
				</div>

				<div class="setting-control accent-color-control">
					<AccentColorPicker
						currentColor={currentAccentColor}
						disabled={!isInitialized}
						on:colorChange={handleAccentColorChange}
					/>
				</div>
			</div>

			<!-- Preview Section -->
			<div class="theme-preview">
				<div class="preview-card">
					<div class="preview-header">
						<div class="preview-title">Preview</div>
						<div class="preview-mode">
							{#if mode.current === 'light'}
								<Sun size={16} />
								Light Mode (Active: {currentTheme})
							{:else if mode.current === 'dark'}
								<Moon size={16} />
								Dark Mode (Active: {currentTheme})
							{:else}
								<Monitor size={16} />
								System (Active: {currentTheme})
							{/if}
						</div>
					</div>
					<div class="preview-content">
						<div class="preview-text">
							This is how your admin panel will look with the selected theme and accent color.
						</div>
						<div class="preview-elements">
							<div class="preview-button primary">Primary Button</div>
							<div class="preview-button secondary">Secondary Button</div>
						</div>

						<!-- Test toast buttons - showcasing Sonner features -->
						<div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
							<button
								onclick={() =>
									toast.success('Settings saved!', {
										description: 'Your changes have been applied'
									})}
								style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #22c55e; background: #22c55e; color: white; border-radius: 4px;"
								>Success</button
							>
							<button
								onclick={() =>
									toast.error('Save failed!', { description: 'Please check your connection' })}
								style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #ef4444; background: #ef4444; color: white; border-radius: 4px;"
								>Error</button
							>
							<button
								onclick={() =>
									toast.warning('Unsaved changes', { description: 'You have unsaved changes' })}
								style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #f59e0b; background: #f59e0b; color: white; border-radius: 4px;"
								>Warning</button
							>
							<button
								onclick={() =>
									toast('Export complete', {
										action: {
											label: 'Download',
											onClick: () => toast.success('Download started!')
										},
										cancel: { label: 'Cancel', onClick: () => toast.info('Cancelled') }
									})}
								style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #8b5cf6; background: #8b5cf6; color: white; border-radius: 4px;"
								>Action</button
							>
							<button
								onclick={() =>
									toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
										loading: 'Saving...',
										success: 'Saved!',
										error: 'Failed!'
									})}
								style="padding: 4px 8px; font-size: 0.75rem; border: 1px solid #6366f1; background: #6366f1; color: white; border-radius: 4px;"
								>Promise</button
							>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- API Keys Section -->
		<div class="settings-section">
			<div class="section-header api-keys-section-head">
				<div class="api-keys-section-titles">
					<h2 class="section-title">API Keys</h2>
					<p class="section-description">Manage API keys for bots and external integrations</p>
				</div>
				<button type="button" class="create-button" onclick={openAddModal}>
					<Plus size={18} />
					Create Key
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
					<p class="info-note">
						API keys provide the same access as an admin session. Keep them secure!
					</p>
				</div>
			</div>

			{#if apiKeysLoading}
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
										<span
											class="permission-badge"
											class:full={key.permissions === 'full'}
											class:webhooks={key.permissions === 'webhooks'}
										>
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
	</div>
</div>

<!-- Add API Key Modal -->
{#if showAddModal}
	<div
		class="modal-overlay"
		onclick={closeAddModal}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				closeAddModal();
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
				<h2>Create API Key</h2>
				<button class="close-button" onclick={closeAddModal}>
					<X size={20} />
				</button>
			</div>
			<form
				class="modal-form"
				onsubmit={(e) => {
					e.preventDefault();
					handleCreateKey();
				}}
			>
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
								<span class="permission-hint">All API endpoints — full administrative access</span>
							{:else if addForm.permissions === 'read'}
								<span class="permission-hint"
									>GET/HEAD/OPTIONS only on the HTTP API. No writes, no chat WebSocket.</span
								>
							{:else if addForm.permissions === 'chat'}
								<span class="permission-hint"
									>Chat WebSocket (admin bridge) plus GET/HEAD/OPTIONS on /api/chat, /api/emojis, and
									/api/chat-notification-sounds only.</span
								>
							{:else if addForm.permissions === 'webhooks'}
								<span class="permission-hint"
									>POST (or OPTIONS) on /webhooks/* only — e.g. Discord presence. No other HTTP routes or
									chat WebSocket.</span
								>
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
					<button
						type="button"
						class="cancel-button"
						onclick={closeAddModal}
						disabled={isSubmitting}
					>
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
		<div class="modal modal-key-display" role="dialog" aria-modal="true">
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
					<button class="copy-button" onclick={copyKeyToClipboard} class:copied={copiedKey}>
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
				<button class="save-button" onclick={closeNewKeyModal} class:confirm-copy={!copiedKey}>
					{copiedKey ? 'Done' : "I've saved the key"}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-page {
		padding: 32px;
		max-width: 1000px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 32px;
	}

	.header-content h1 {
		font-size: 2rem;
		font-weight: 700;
		color: #ffffff;
		margin: 0 0 8px 0;
	}

	:global(html:not(.dark)) .header-content h1 {
		color: #1f2937;
	}

	.header-content p {
		color: #9ca3af;
		font-size: 1rem;
		margin: 0;
	}

	:global(html:not(.dark)) .header-content p {
		color: #6b7280;
	}

	.page-content {
		min-height: 400px;
	}

	.settings-section {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 32px;
		margin-bottom: 24px;
	}

	:global(html:not(.dark)) .settings-section {
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.section-header {
		margin-bottom: 32px;
		padding-bottom: 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(html:not(.dark)) .section-header {
		border-bottom-color: rgba(0, 0, 0, 0.1);
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #ffffff;
		margin: 0 0 8px 0;
	}

	:global(html:not(.dark)) .section-title {
		color: #1f2937;
	}

	.section-description {
		color: #9ca3af;
		font-size: 1rem;
		margin: 0;
	}

	:global(html:not(.dark)) .section-description {
		color: #6b7280;
	}

	.setting-group {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 32px;
		margin-bottom: 32px;
	}

	.setting-info {
		flex: 1;
		max-width: 400px;
	}

	.setting-title {
		font-size: 1.1rem;
		font-weight: 600;
		color: #ffffff;
		margin: 0 0 6px 0;
	}

	:global(html:not(.dark)) .setting-title {
		color: #1f2937;
	}

	.setting-description {
		color: #9ca3af;
		font-size: 0.9rem;
		margin: 0;
		line-height: 1.5;
	}

	:global(html:not(.dark)) .setting-description {
		color: #6b7280;
	}

	.setting-control {
		flex-shrink: 0;
		min-width: 0;
	}

	.setting-control--tabs {
		max-width: 100%;
	}

	.api-keys-section-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
		width: 100%;
	}

	.api-keys-section-titles {
		flex: 1 1 200px;
		min-width: 0;
	}

	.api-keys-section-titles .section-title {
		margin-bottom: 8px;
	}

	.api-keys-section-head .create-button {
		flex-shrink: 0;
	}

	.theme-preview {
		margin-top: 24px;
	}

	.preview-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		overflow: hidden;
	}

	:global(html:not(.dark)) .preview-card {
		background: rgba(0, 0, 0, 0.03);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		background: rgba(255, 255, 255, 0.05);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(html:not(.dark)) .preview-header {
		background: rgba(0, 0, 0, 0.05);
		border-bottom-color: rgba(0, 0, 0, 0.1);
	}

	.preview-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: #ffffff;
	}

	:global(html:not(.dark)) .preview-title {
		color: #1f2937;
	}

	.preview-mode {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8rem;
		color: #9ca3af;
	}

	:global(html:not(.dark)) .preview-mode {
		color: #6b7280;
	}

	.preview-content {
		padding: 20px;
	}

	.preview-text {
		color: #e5e7eb;
		font-size: 0.9rem;
		margin-bottom: 16px;
		line-height: 1.5;
	}

	:global(html:not(.dark)) .preview-text {
		color: #374151;
	}

	.preview-elements {
		display: flex;
		gap: 12px;
	}

	.preview-button {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.preview-button.primary {
		background: var(--accent-bg, var(--accent-color, #3b82f6));
		color: var(--accent-fg);
	}

	.preview-button.primary:hover {
		background: var(--accent-bg-hover, var(--accent-color-dark, #2563eb));
		color: var(--accent-fg-hover, var(--accent-fg));
	}

	.preview-button.secondary {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #ffffff;
	}

	:global(html:not(.dark)) .preview-button.secondary {
		background: rgba(0, 0, 0, 0.1);
		border-color: rgba(0, 0, 0, 0.2);
		color: #1f2937;
	}

	.accent-color-group {
		margin-top: 32px;
	}

	.accent-color-control {
		flex: 1;
		min-width: 0;
	}

	/* API Keys Styles */
	.create-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: var(--accent-bg, var(--accent-color, #6366f1));
		color: var(--accent-fg);
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.create-button:hover:not(:disabled) {
		background: var(--accent-bg-hover, var(--accent-color-dark, #4f46e5));
		transform: translateY(-1px);
	}

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
		background: var(--accent-muted-bg, var(--accent-color-light, rgba(99, 102, 241, 0.2)));
		color: var(--accent-muted-fg);
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
		to {
			transform: rotate(360deg);
		}
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
		background: var(--accent-bg, var(--accent-color, #6366f1));
		color: var(--accent-fg);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
	}

	.keys-table-container {
		background: var(--bg-secondary, #2d2d2d);
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.keys-table {
		width: 100%;
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
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
	}

	.permission-badge.webhooks {
		background: rgba(14, 165, 233, 0.2);
		color: #0ea5e9;
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
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
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
	.save-button {
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
		background: var(--accent-bg, var(--accent-color, #6366f1));
		color: var(--accent-fg);
	}

	.save-button:hover:not(:disabled) {
		background: var(--accent-bg-hover, var(--accent-color-dark, #4f46e5));
	}

	.save-button.confirm-copy {
		background: #f59e0b;
	}

	.save-button.confirm-copy:hover:not(:disabled) {
		background: #d97706;
	}

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
		background: var(--accent-bg, var(--accent-color, #6366f1));
		color: var(--accent-fg);
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.copy-button:hover {
		background: var(--accent-bg-hover, var(--accent-color-dark, #4f46e5));
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

	@media (max-width: 768px) {
		.settings-page {
			padding: 16px;
		}

		.settings-section {
			padding: 16px;
		}

		.setting-group {
			flex-direction: column;
			gap: 16px;
			align-items: stretch;
		}

		.setting-info {
			max-width: none;
		}

		.setting-control {
			width: 100%;
			flex-shrink: 1;
		}

		.header-content h1 {
			font-size: 1.5rem;
		}

		.preview-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 10px;
		}

		.preview-mode {
			flex-wrap: wrap;
			font-size: 0.75rem;
		}

		.preview-elements {
			flex-direction: column;
			flex-wrap: wrap;
			gap: 10px;
		}

		.api-keys-section-head .create-button {
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

		.keys-table {
			min-width: 800px;
		}

		.code-examples code {
			overflow-x: auto;
			word-break: break-all;
			max-width: 100%;
		}
	}
</style>
