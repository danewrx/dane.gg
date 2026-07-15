<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { Save, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, Edit2 } from 'lucide-svelte';
	import { siteConfig, loadSiteConfig } from '$lib/site/stores/siteConfig';
	import { toast } from 'svelte-sonner';
	import { notifySiteConfigConsumers } from '$lib/shared/utils/siteConfigLiveSync';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import GitHubContributionsWidget from '$lib/site/components/widgets/GitHubContributionsWidget.svelte';

	let enabled = $state(false);
	let savedEnabled = $state(false);
	let isSaving = $state(false);

	interface GitHubStatus {
		tokenConfigured: boolean;
		username: string;
		usernameSource: 'database' | 'environment';
		connection: { connected: boolean; login?: string; message: string };
	}

	let status = $state<GitHubStatus | null>(null);
	let statusLoading = $state(true);

	// Inline username editing (lives in the status card).
	let editingUsername = $state(false);
	let usernameInput = $state('');
	let savingUsername = $state(false);

	async function loadStatus() {
		statusLoading = true;
		try {
			const response = await fetch(`/api/github/status?ts=${Date.now()}`, {
				credentials: 'include',
				cache: 'no-store'
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			status = (await response.json()) as GitHubStatus;
		} catch (e) {
			logger.error('Error loading GitHub status:', e);
			status = null;
		} finally {
			statusLoading = false;
		}
	}

	const dirty = $derived(enabled !== savedEnabled);

	function syncFromConfig(c: import('$lib/site/stores/siteConfig').SiteConfig) {
		savedEnabled = Boolean(c.github_enabled);
		enabled = savedEnabled;
	}

	function startEditingUsername() {
		usernameInput = status?.username ?? '';
		editingUsername = true;
	}

	function cancelEditingUsername() {
		editingUsername = false;
	}

	async function saveUsername() {
		savingUsername = true;
		try {
			await putConfig('github_username', usernameInput.trim(), 'string');
			await loadSiteConfig();
			notifySiteConfigConsumers();
			editingUsername = false;
			await loadStatus();
			toast.success('GitHub username saved');
		} catch (e) {
			logger.error(e);
			toast.error('Failed to save username', {
				description: e instanceof Error ? e.message : 'Try again'
			});
		} finally {
			savingUsername = false;
		}
	}

	onMount(() => {
		const unsub = siteConfig.subscribe(syncFromConfig);
		loadStatus();
		return unsub;
	});

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
			await putConfig('github_enabled', enabled, 'boolean');
			await loadSiteConfig();
			notifySiteConfigConsumers();
			syncFromConfig(get(siteConfig));
			toast.success('GitHub settings saved');
		} catch (e) {
			logger.error(e);
			toast.error('Failed to save settings', {
				description: e instanceof Error ? e.message : 'Try again'
			});
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>{adminPageTitle('GitHub')}</title>
</svelte:head>

<div class="github-config">
	<p class="page-description">
		Show a GitHub contributions heatmap (the trailing year of commit activity) in the homepage right
		column. Requires a <code>GITHUB_TOKEN</code> environment variable on the backend — any token with
		default scopes can read public contributions.
	</p>

	<div class="status-card">
		<div class="status-header">
			<span class="status-title">Integration status</span>
			<button
				type="button"
				class="refresh-btn"
				onclick={loadStatus}
				disabled={statusLoading}
				aria-label="Refresh status"
			>
				<RefreshCw size={15} class={statusLoading ? 'spinning' : ''} />
			</button>
		</div>

		<div class="status-row">
			<span class="status-label">Username:</span>
			{#if editingUsername}
				<div class="username-edit">
					<input
						type="text"
						bind:value={usernameInput}
						placeholder="GitHub username"
						class="username-input"
						disabled={savingUsername}
						onkeydown={(e) => {
							if (e.key === 'Enter') saveUsername();
							else if (e.key === 'Escape') cancelEditingUsername();
						}}
					/>
					<div class="username-edit-actions">
						<button
							type="button"
							class="icon-button"
							onclick={saveUsername}
							disabled={savingUsername}
							title="Save"
						>
							<CheckCircle2 size={16} />
						</button>
						<button
							type="button"
							class="icon-button"
							onclick={cancelEditingUsername}
							disabled={savingUsername}
							title="Cancel"
						>
							<XCircle size={16} />
						</button>
					</div>
				</div>
			{:else}
				<div class="username-display">
					<span class="status-value">{status?.username || 'Not set'}</span>
					{#if status}
						<span
							class="username-source"
							class:database={status.usernameSource === 'database'}
							class:environment={status.usernameSource === 'environment'}
						>
							({status.usernameSource === 'database' ? 'Database' : 'Environment'})
						</span>
					{/if}
					<button
						type="button"
						class="icon-button small"
						onclick={startEditingUsername}
						title="Edit username"
					>
						<Edit2 size={14} />
					</button>
				</div>
			{/if}
		</div>

		<div class="status-row">
			<span class="status-label">Token:</span>
			{#if statusLoading && !status}
				<span class="status-value muted">Checking…</span>
			{:else if status?.tokenConfigured}
				<span class="status-value ok">Configured</span>
			{:else}
				<span class="status-value bad">Not configured</span>
			{/if}
		</div>

		<div class="status-row connection-row">
			<span class="status-label">Connection:</span>
			{#if statusLoading && !status}
				<div class="connection-badge muted">
					<span>Checking…</span>
				</div>
			{:else if status?.connection}
				<div
					class="connection-badge"
					class:connected={status.connection.connected}
					class:disconnected={!status.connection.connected}
				>
					{#if status.connection.connected}
						<CheckCircle2 size={16} />
					{:else}
						<XCircle size={16} />
					{/if}
					<span class="connection-text">
						{status.connection.connected ? 'Connected' : 'Disconnected'}
					</span>
					<span class="connection-message">{status.connection.message}</span>
				</div>
			{:else}
				<div class="connection-badge disconnected">
					<XCircle size={16} />
					<span class="connection-text">Unavailable</span>
					<span class="connection-message">Could not reach the status endpoint</span>
				</div>
			{/if}
		</div>

		<p class="status-note">
			The token is read from the <code>GITHUB_TOKEN</code> environment variable. To change it, update
			your environment and restart the server.
		</p>
	</div>

	<div class="config-form">
		<div class="form-group">
			<div class="enabled-toggle">
				<div class="toggle-with-icon">
					<Toggle bind:checked={enabled} />
					<span class="toggle-text">
						{#if enabled}
							<Eye size={16} />
							GitHub Widget Enabled
						{:else}
							<EyeOff size={16} />
							GitHub Widget Disabled
						{/if}
					</span>
				</div>
				<p class="help-text">Controls whether the contributions widget is shown on the site.</p>
			</div>
		</div>

		<div class="form-actions">
			<button class="save-button" onclick={saveSettings} disabled={!dirty || isSaving}>
				<Save size={18} />
				{isSaving ? 'Saving...' : 'Save Settings'}
			</button>
		</div>
	</div>

	<div class="preview-section">
		<h2 class="preview-title">Preview</h2>
		<p class="help-text">
			The contribution chart for the configured account (shown here regardless of the enabled toggle
			above).
		</p>
		<div class="preview-frame">
			{#key status?.username}
				<GitHubContributionsWidget />
			{/key}
		</div>
	</div>
</div>

<style>
	.github-config {
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
		line-height: 1.5;
	}

	.page-description code {
		font-family: monospace;
		font-size: 13px;
		background: var(--bg-tertiary, #2d2d2d);
		padding: 1px 5px;
		border-radius: 4px;
	}

	.status-card {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px 20px;
		margin-bottom: 24px;
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 12px;
	}

	.status-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.status-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.refresh-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		padding: 0;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition:
			border-color 0.2s,
			color 0.2s;
	}

	.refresh-btn:hover:not(:disabled) {
		border-color: var(--accent-color, #6366f1);
		color: var(--text-primary, #ffffff);
	}

	.refresh-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.refresh-btn :global(.spinning) {
		animation: gh-spin 0.9s linear infinite;
	}

	@keyframes gh-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.status-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.connection-row {
		flex-direction: column;
		align-items: stretch;
		gap: 8px;
	}

	.status-label {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
		flex-shrink: 0;
	}

	.status-value {
		font-size: 14px;
	}

	.status-value.ok {
		color: #10b981;
	}

	.status-value.bad {
		color: #ef4444;
	}

	.status-value.muted {
		color: var(--text-secondary, #a1a1aa);
	}

	.username-display {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		min-width: 0;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.username-source {
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 4px;
		font-weight: 500;
	}

	.username-source.database {
		background: var(--accent-muted-bg, var(--accent-color-light, rgba(99, 102, 241, 0.2)));
		color: var(--accent-muted-fg, var(--accent-color, #6366f1));
	}

	.username-source.environment {
		background: rgba(156, 163, 175, 0.2);
		color: #9ca3af;
	}

	.icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		padding: 0;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition:
			border-color 0.2s,
			color 0.2s;
	}

	.icon-button.small {
		width: 26px;
		height: 26px;
	}

	.icon-button:hover:not(:disabled) {
		border-color: var(--accent-color, #6366f1);
		color: var(--text-primary, #ffffff);
	}

	.icon-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.username-edit {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		min-width: 0;
		justify-content: flex-end;
		flex-wrap: wrap;
	}

	.username-input {
		flex: 1;
		min-width: 140px;
		background: var(--bg-tertiary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		padding: 8px 12px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.username-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.username-edit-actions {
		display: flex;
		gap: 6px;
	}

	.connection-badge {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 14px;
		flex: 1;
		min-width: 0;
		flex-wrap: wrap;
		box-sizing: border-box;
	}

	.connection-badge.connected {
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.3);
		color: #10b981;
	}

	.connection-badge.disconnected {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.connection-badge.muted {
		border: 1px solid var(--border-color, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
	}

	.connection-text {
		font-weight: 500;
	}

	.connection-message {
		font-size: 12px;
		opacity: 0.85;
		margin-left: auto;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.status-note {
		margin: 0;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		line-height: 1.5;
	}

	.status-note code {
		font-family: monospace;
		font-size: 12px;
		background: var(--bg-tertiary, #2d2d2d);
		padding: 1px 5px;
		border-radius: 4px;
	}

	@media (max-width: 520px) {
		.connection-message {
			margin-left: 0;
			flex-basis: 100%;
		}
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

	.help-text {
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
		margin: 0;
	}

	.enabled-toggle {
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

	.form-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: 8px;
	}

	.preview-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 32px;
		padding-top: 24px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.preview-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.preview-frame {
		margin-top: 8px;
		padding: 12px 16px;
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 12px;

		--theme-accent: var(--accent-color, #6366f1);
		--theme-surface: var(--bg-secondary, #2a2a2a);
		--theme-text-primary: var(--text-primary, #ffffff);
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
		.github-config {
			padding: 16px;
		}
	}
</style>
