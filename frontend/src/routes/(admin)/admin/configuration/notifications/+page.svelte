<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';
	import { onMount } from 'svelte';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import NtfyAppearanceFields from '$lib/admin/components/notifications/NtfyAppearanceFields.svelte';
	import type { NotificationSettings } from '$lib/admin/types/ntfy';
	import { toast } from 'svelte-sonner';
	import { CheckCircle2, XCircle, Send, RotateCcw } from 'lucide-svelte';

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
	let defaults = $state<NotificationSettings | null>(null);

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
			defaults = data.defaults;
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
		<div class="settings-description">
			<p>
				Configure ntfy push alerts per event. Customize the message body with placeholders like
				<code>{'{username}'}</code>, and set title, priority, tags, icon, and click URL.
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
			<div class="test-row">
				<button
					type="button"
					class="secondary-button"
					disabled={!configured || sendingTest}
					onclick={sendTestNotification}
				>
					<Send size={16} />
					{sendingTest ? 'Sending…' : 'Send test notification'}
				</button>
			</div>
		</section>

		<section class="card">
			<h2 class="section-title">Admin login alerts</h2>

			<div class="form-group toggle-group">
				<div class="toggle-wrapper">
					<Toggle bind:checked={settings.adminLogin.successEnabled} />
					<span class="toggle-label">Notify on successful login</span>
				</div>
			</div>

			<div class="form-group">
				<label for="failed-mode">Failed login alerts</label>
				<select id="failed-mode" class="form-select" bind:value={settings.adminLogin.failedMode}>
					<option value="lockout">Only when IP is locked out (default)</option>
					<option value="each">Every failed attempt</option>
					<option value="off">Off</option>
				</select>
			</div>

			<h3 class="subsection-title">Appearance</h3>

			<div class="appearance-stack">
				<div class="appearance-block">
					<NtfyAppearanceFields
						bind:appearance={settings.adminLogin.success}
						heading="Successful login"
						placeholders={['username', 'ip', 'totp', 'time']}
					/>
				</div>
				<div class="appearance-block">
					<NtfyAppearanceFields
						bind:appearance={settings.adminLogin.lockout}
						heading="Lockout"
						placeholders={['ip', 'attemptCount', 'lockoutMinutes', 'username', 'time']}
					/>
				</div>
				<div class="appearance-block">
					<NtfyAppearanceFields
						bind:appearance={settings.adminLogin.failed}
						heading="Each failed attempt"
						placeholders={['ip', 'attemptCount', 'maxAttempts', 'username', 'time']}
					/>
				</div>
			</div>
		</section>

		<section class="card">
			<h2 class="section-title">Twitter connection alerts</h2>

			<div class="form-group toggle-group">
				<div class="toggle-wrapper">
					<Toggle bind:checked={settings.twitter.enabled} />
					<span class="toggle-label">Notify when Twitter API connection fails or is restored</span>
				</div>
			</div>

			<h3 class="subsection-title">Appearance</h3>

			<div class="appearance-stack">
				<div class="appearance-block">
					<NtfyAppearanceFields
						bind:appearance={settings.twitter.failure}
						heading="Connection failed"
						placeholders={['error', 'time']}
					/>
				</div>
				<div class="appearance-block">
					<NtfyAppearanceFields
						bind:appearance={settings.twitter.restored}
						heading="Connection restored"
						placeholders={['time']}
					/>
				</div>
			</div>
		</section>

		<section class="card">
			<h2 class="section-title">Test notification</h2>
			<p class="form-help">
				Used by the “Send test notification” button above. Test sends use sample placeholder values.
			</p>
			<div class="appearance-block">
				<NtfyAppearanceFields
					bind:appearance={settings.test}
					placeholders={[
						'time',
						'username',
						'ip',
						'totp',
						'attemptCount',
						'maxAttempts',
						'lockoutMinutes',
						'error'
					]}
				/>
			</div>
		</section>

		<div class="form-actions">
			<button type="button" class="secondary-button" onclick={resetToDefaults} disabled={!defaults}>
				<RotateCcw size={16} />
				Reset to defaults
			</button>
			<button type="button" class="save-button" onclick={saveSettings} disabled={saving}>
				{saving ? 'Saving…' : 'Save settings'}
			</button>
		</div>
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

	.settings-description a {
		color: var(--accent-color, #818cf8);
	}

	.card {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 20px;
		margin-bottom: 20px;
	}

	.section-title {
		margin: 0 0 16px;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #fff);
	}

	.subsection-title {
		margin: 20px 0 12px;
		font-size: 14px;
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

	.form-group {
		margin-bottom: 16px;
	}

	.form-group label {
		display: block;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary, #fff);
		margin-bottom: 8px;
	}

	.form-select {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		font-size: 14px;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #fff);
		box-sizing: border-box;
	}

	.form-help {
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		margin: 8px 0 0;
		line-height: 1.4;
	}

	.toggle-group .toggle-wrapper {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.toggle-label {
		font-size: 14px;
		color: var(--text-primary, #fff);
	}

	.appearance-stack {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.appearance-block {
		background: var(--bg-tertiary, #3a3a3a);
		border-radius: 6px;
		padding: 14px;
	}

	.test-row {
		margin-top: 12px;
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
