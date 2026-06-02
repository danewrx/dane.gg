<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';
	import { onMount } from 'svelte';
	import NotificationCard from '$lib/admin/components/notifications/NotificationCard.svelte';
	import TestNotificationPanel from '$lib/admin/components/notifications/TestNotificationPanel.svelte';
	import NotificationEditModal from '$lib/admin/components/notifications/NotificationEditModal.svelte';
	import type { NotificationSettings } from '$lib/admin/types/ntfy';
	import { toast } from 'svelte-sonner';
	import { CheckCircle2, XCircle, RotateCcw } from 'lucide-svelte';

	interface SettingsResponse {
		configured: boolean;
		defaultTopic: string | null;
		ntfyUrl: string;
		authConfigured: boolean;
		envNote: string;
		settings: NotificationSettings;
		defaults: NotificationSettings;
	}

	let loading = $state(true);
	let saving = $state(false);
	let sendingTest = $state(false);
	let configured = $state(false);
	let authConfigured = $state(false);
	let defaultTopic = $state<string | null>(null);
	let ntfyUrl = $state('');
	let envNote = $state('');
	let settings = $state<NotificationSettings | null>(null);
	let settingsRevision = $state(0);

	let defaults: NotificationSettings | null = null;
	let hasDefaults = $state(false);

	let editOpen = $state(false);
	let editTitle = $state('');
	let editPlaceholders = $state<string[]>([]);
	let editShowFailedLoginMode = $state(false);
	let editingAppearance = $state<NotificationSettings['adminLogin']['success'] | null>(null);

	function openEditor(
		title: string,
		appearance: NotificationSettings['adminLogin']['success'],
		placeholders: string[],
		showFailedLoginMode = false
	) {
		editTitle = title;
		editingAppearance = appearance;
		editPlaceholders = placeholders;
		editShowFailedLoginMode = showFailedLoginMode;
		editOpen = true;
	}

	function closeEditor() {
		editOpen = false;
		editShowFailedLoginMode = false;
		editingAppearance = null;
	}

	async function loadSettings() {
		try {
			loading = true;
			const response = await fetch(`/api/notifications/settings?ts=${Date.now()}`, {
				credentials: 'include',
				cache: 'no-store'
			});

			if (!response.ok) {
				throw new Error('Failed to load notification settings');
			}

			const data: SettingsResponse = await response.json();
			configured = data.configured;
			authConfigured = data.authConfigured;
			defaultTopic = data.defaultTopic;
			ntfyUrl = data.ntfyUrl;
			envNote = data.envNote;
			settings = structuredClone(data.settings);
			defaults = structuredClone(data.defaults);
			hasDefaults = true;
			settingsRevision += 1;
		} catch (err) {
			logger.error('Error loading notification settings:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to load settings');
		} finally {
			loading = false;
		}
	}

	async function saveSettings() {
		if (!settings) return;

		try {
			saving = true;
			const response = await fetch('/api/notifications/settings', {
				method: 'PUT',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ settings })
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || 'Failed to save settings');
			}

			const data = await response.json();
			settings = structuredClone(data.settings);
			settingsRevision += 1;
			toast.success('Notification settings saved');
		} catch (err) {
			logger.error('Error saving notification settings:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to save settings');
		} finally {
			saving = false;
		}
	}

	async function sendTestNotification() {
		try {
			sendingTest = true;
			const response = await fetch('/api/notifications/send', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ useTestPreset: true })
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.error || 'Failed to send test notification');
			}

			toast.success('Test notification sent');
		} catch (err) {
			logger.error('Error sending test notification:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to send test');
		} finally {
			sendingTest = false;
		}
	}

	function resetToDefaults() {
		if (!defaults) return;
		settings = structuredClone(defaults);
		settingsRevision += 1;
		toast.message('Restored default values — click Save to apply');
	}

	onMount(() => {
		loadSettings();
	});
</script>

<svelte:head>
	<title>{adminPageTitle('Push Notifications')}</title>
</svelte:head>

<div class="notifications-settings">
	{#if loading}
		<p class="loading-text">Loading notification settings…</p>
	{:else if settings}
		{#key settingsRevision}
			<div class="settings-description">
				<p>
					Configure ntfy push alerts per event. Use each card’s toggle to enable or disable alerts,
					or Edit to customize message, title, tags, and appearance.
				</p>
			</div>

			<section class="card status-card">
				<h2 class="section-title">Server connection</h2>
				<p class="env-note">{envNote}</p>
				<ul class="status-list">
					<li>
						{#if configured}
							<CheckCircle2 size={16} class="status-ok" />
						{:else}
							<XCircle size={16} class="status-bad" />
						{/if}
						<span>Topic: <code>{defaultTopic ?? 'not set'}</code></span>
					</li>
					<li>
						<span>Server: <code>{ntfyUrl}</code></span>
					</li>
					<li>
						{#if authConfigured}
							<CheckCircle2 size={16} class="status-ok" />
						{:else}
							<XCircle size={16} class="status-bad" />
						{/if}
						<span>Auth token / credentials configured</span>
					</li>
				</ul>
				<p class="form-help">
					Set <code>NTFY_TOPIC</code>, <code>NTFY_URL</code>, and <code>NTFY_TOKEN</code> in server
					<code>.env</code>, then restart the backend.
				</p>
			</section>

			<section class="card test-section">
				<h2 class="section-title">Test notification</h2>
				<p class="category-help">
					Verify your ntfy connection with a fixed preset message before configuring event alerts.
				</p>
				<TestNotificationPanel
					onSend={sendTestNotification}
					sendDisabled={!configured}
					sending={sendingTest}
				/>
			</section>

			<section class="card category-card">
				<h2 class="section-title">Admin login alerts</h2>

				<div class="notification-grid">
					<NotificationCard
						bind:appearance={settings.adminLogin.success}
						title="Successful login"
						description="Sent when an admin user signs in successfully, including IP and 2FA status."
						onedit={() =>
							openEditor('Successful login', settings!.adminLogin.success, [
								'username',
								'ip',
								'totp',
								'time'
							])}
					/>
					<NotificationCard
						bind:appearance={settings.adminLogin.lockout}
						title="Login lockout"
						description="Sent when an IP is locked out after too many failed admin login attempts."
						onedit={() =>
							openEditor('Login lockout', settings!.adminLogin.lockout, [
								'ip',
								'attemptCount',
								'lockoutMinutes',
								'username',
								'time'
							])}
					/>
					<NotificationCard
						bind:appearance={settings.adminLogin.failed}
						title="Failed login attempt"
						description="Sent on failed logins. Edit to configure alert timing and appearance."
						onedit={() =>
							openEditor(
								'Failed login attempt',
								settings!.adminLogin.failed,
								['ip', 'attemptCount', 'maxAttempts', 'username', 'time'],
								true
							)}
					/>
				</div>
			</section>

			<section class="card category-card">
				<h2 class="section-title">Twitter connection alerts</h2>
				<p class="category-help">
					Notifies you when the Twitter API connection fails or is restored during health checks.
				</p>

				<div class="notification-grid">
					<NotificationCard
						bind:appearance={settings.twitter.failure}
						title="Connection failed"
						description="Sent when the Twitter API connection drops or returns an error."
						onedit={() =>
							openEditor('Connection failed', settings!.twitter.failure, ['error', 'time'])}
					/>
					<NotificationCard
						bind:appearance={settings.twitter.restored}
						title="Connection restored"
						description="Sent when the Twitter API connection recovers after a failure."
						onedit={() =>
							openEditor('Connection restored', settings!.twitter.restored, ['time'])}
					/>
				</div>
			</section>

			<div class="form-actions">
				<button type="button" class="secondary-button" onclick={resetToDefaults} disabled={!hasDefaults}>
					<RotateCcw size={16} />
					Reset to defaults
				</button>
				<button type="button" class="save-button" onclick={saveSettings} disabled={saving}>
					{saving ? 'Saving…' : 'Save settings'}
				</button>
			</div>
		{/key}

		{#if editingAppearance && settings}
			<NotificationEditModal
				bind:open={editOpen}
				title={editTitle}
				bind:appearance={editingAppearance}
				placeholders={editPlaceholders}
				showFailedLoginMode={editShowFailedLoginMode}
				bind:failedMode={settings.adminLogin.failedMode}
				onclose={closeEditor}
			/>
		{/if}
	{:else}
		<p class="loading-text">Unable to load settings.</p>
	{/if}
</div>

<style>
	.notifications-settings {
		width: 100%;
		box-sizing: border-box;
	}

	.loading-text {
		color: var(--text-secondary, #a1a1aa);
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

	.card {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 20px;
		margin-bottom: 20px;
	}

	.test-section .category-help {
		margin-bottom: 16px;
	}

	.section-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #fff);
	}

	.env-note {
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
		margin: 0 0 12px;
	}

	.status-list {
		list-style: none;
		padding: 0;
		margin: 0 0 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.status-list li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: var(--text-primary, #fff);
	}

	:global(.status-ok) {
		color: #22c55e;
		flex-shrink: 0;
	}

	:global(.status-bad) {
		color: #ef4444;
		flex-shrink: 0;
	}

	code {
		font-size: 12px;
		background: var(--bg-tertiary, #3a3a3a);
		padding: 2px 6px;
		border-radius: 4px;
	}

	.form-help,
	.category-help {
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		margin: 8px 0 0;
		line-height: 1.4;
	}

	.notification-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 14px;
		margin-top: 16px;
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		justify-content: flex-end;
		margin-top: 8px;
	}

	.save-button,
	.secondary-button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		border: none;
	}

	.save-button {
		background: var(--accent-bg, #6366f1);
		color: var(--accent-fg, #fff);
	}

	.save-button:disabled,
	.secondary-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.secondary-button {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #fff);
		border: 1px solid var(--border-color, #3a3a3a);
	}
</style>
