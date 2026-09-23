<script lang="ts">
	import { TotpService } from '../../services/totp';
	import { toast } from 'svelte-sonner';
	import { Shield, Key, Loader2, AlertTriangle } from 'lucide-svelte';

	export let onVerified: () => void;
	export let onCancel: () => void;
	export let username: string = '';

	let verificationCode = '';
	let backupCode = '';
	let showBackupForm = false;
	let isVerifying = false;
	let verificationError = '';

	function switchToBackup() {
		showBackupForm = true;
		verificationCode = '';
		verificationError = '';
	}

	function switchToCode() {
		showBackupForm = false;
		backupCode = '';
		verificationError = '';
	}

	async function verifyCode() {
		if (!verificationCode.trim()) {
			verificationError = 'Please enter the verification code';
			return;
		}

		if (!TotpService.validateTokenFormat(verificationCode)) {
			verificationError = 'Invalid code format. Please enter a 6-digit code.';
			return;
		}

		isVerifying = true;
		verificationError = '';

		try {
			const result = await TotpService.verifyToken(verificationCode);

			if (result.valid) {
				toast.success('Authentication successful!');
				onVerified();
			} else {
				verificationError = result.error || 'Invalid verification code';
			}
		} catch (error: any) {
			verificationError = error.message || 'Verification failed';
		} finally {
			isVerifying = false;
		}
	}

	async function verifyBackup() {
		if (!backupCode.trim()) {
			verificationError = 'Please enter a backup code';
			return;
		}

		isVerifying = true;
		verificationError = '';

		try {
			const cleanedCode = TotpService.cleanBackupCode(backupCode);
			const result = await TotpService.verifyBackupCode(cleanedCode);

			if (result.valid) {
				toast.success('Authentication successful!');
				onVerified();
			} else {
				verificationError = result.error || 'Invalid or already used backup code';
			}
		} catch (error: any) {
			verificationError = error.message || 'Verification failed';
		} finally {
			isVerifying = false;
		}
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		if (showBackupForm) {
			verifyBackup();
		} else {
			verifyCode();
		}
	}
</script>

<div class="totp-verification">
	<div class="verification-header">
		<div class="header-icon">
			{#if showBackupForm}
				<Key size={32} />
			{:else}
				<Shield size={32} />
			{/if}
		</div>
		<div class="header-content">
			<h2>Two-Factor Authentication</h2>
			<p>
				{#if showBackupForm}
					Enter one of your backup codes
				{:else}
					Enter the 6-digit code from your authenticator app
				{/if}
			</p>
			{#if username}
				<span class="username-indicator">Signing in as: <strong>{username}</strong></span>
			{/if}
		</div>
	</div>

	<form onsubmit={handleSubmit} class="verification-form">
		{#if showBackupForm}
			<!-- Backup Code Form -->
			<div class="form-group">
				<label for="backup-code">Backup Code</label>
				<input
					id="backup-code"
					type="text"
					bind:value={backupCode}
					placeholder="XXXX-XXXX"
					disabled={isVerifying}
					class="form-input"
					autocomplete="one-time-code"
				/>
				<p class="input-help">Enter one of your backup codes (with or without dashes)</p>
			</div>
		{:else}
			<!-- TOTP Code Form -->
			<div class="form-group">
				<label for="verification-code">Verification Code</label>
				<input
					id="verification-code"
					type="text"
					bind:value={verificationCode}
					placeholder="000000"
					maxlength="6"
					pattern="[0-9]{6}"
					disabled={isVerifying}
					class="form-input code-input"
					autocomplete="one-time-code"
				/>
				<p class="input-help">Enter the 6-digit code from your authenticator app</p>
			</div>
		{/if}

		{#if verificationError}
			<div class="error-message">
				<AlertTriangle size={16} />
				{verificationError}
			</div>
		{/if}

		<div class="form-actions">
			<button
				type="submit"
				class="verify-button"
				disabled={isVerifying ||
					(!verificationCode && !showBackupForm) ||
					(!backupCode && showBackupForm)}
			>
				{#if isVerifying}
					<Loader2 size={16} class="spin" />
					Verifying...
				{:else}
					<Shield size={16} />
					Verify
				{/if}
			</button>
		</div>

		<div class="alternative-options">
			{#if showBackupForm}
				<button type="button" class="switch-method" onclick={switchToCode}>
					<Shield size={16} />
					Use Authenticator Code
				</button>
			{:else}
				<button type="button" class="switch-method" onclick={switchToBackup}>
					<Key size={16} />
					Use Backup Code
				</button>
			{/if}
			<button type="button" class="cancel-button" onclick={onCancel}> Cancel </button>
		</div>
	</form>
</div>

<style>
	.totp-verification {
		max-width: 400px;
		margin: 0 auto;
		padding: 2rem;
		background: var(--bg-secondary);
		border-radius: 16px;
		border: 1px solid var(--border-color);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
	}

	.verification-header {
		text-align: center;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.header-icon {
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
		padding: 1rem;
		border-radius: 12px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.header-icon :global(svg) {
		stroke: currentColor;
		fill: none;
	}

	.header-content h2 {
		color: var(--text-primary);
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.header-content p {
		color: var(--text-secondary);
		margin: 0 0 1rem 0;
		line-height: 1.5;
	}

	.username-indicator {
		font-size: 0.875rem;
		color: var(--text-secondary);
		background: var(--bg-tertiary);
		padding: 0.5rem 1rem;
		border-radius: 8px;
		display: inline-block;
		border: 1px solid var(--border-color);
	}

	.username-indicator strong {
		color: var(--text-primary);
	}

	.verification-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-weight: 600;
		letter-spacing: -0.025em;
	}

	.form-input {
		background: var(--bg-primary);
		border: 2px solid var(--border-color);
		border-radius: 10px;
		padding: 1rem;
		color: var(--text-primary);
		font-size: 0.95rem;
		font-weight: 500;
		transition: all 0.3s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.form-input.code-input {
		font-size: 1.25rem;
		font-weight: 600;
		text-align: center;
		letter-spacing: 0.5em;
		font-family: 'Courier New', monospace;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--accent-color);
		box-shadow:
			0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1)),
			0 2px 8px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.form-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.input-help {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin: 0;
		font-style: italic;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #dc2626;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 8px;
		padding: 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.form-actions {
		margin-top: 0.5rem;
	}

	.verify-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--accent-bg, var(--accent-color, #3b82f6));
		color: var(--accent-fg);
		border: none;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.verify-button:hover:not(:disabled) {
		background: var(--accent-color-dark);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.verify-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.verify-button :global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.alternative-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}

	.switch-method,
	.cancel-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
		font-size: 0.9rem;
	}

	.switch-method {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.switch-method:hover {
		background: var(--bg-hover);
		transform: translateY(-1px);
	}

	.cancel-button {
		background: transparent;
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.cancel-button:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}

	/* Light mode support */
	:global(html:not(.dark)) .totp-verification {
		background: #ffffff;
		border-color: #e9ecef;
	}

	:global(html:not(.dark)) .username-indicator {
		background: #f8f9fa;
		border-color: #e9ecef;
	}

	:global(html:not(.dark)) .form-input {
		background: #ffffff;
		border-color: #d1d5db;
		color: #212529;
	}

	:global(html:not(.dark)) .switch-method {
		background: #f8f9fa;
		border-color: #e9ecef;
	}

	@media (max-width: 768px) {
		.totp-verification {
			padding: 1.5rem;
		}

		.verification-header {
			margin-bottom: 1.5rem;
			padding-bottom: 1rem;
		}

		.header-content h2 {
			font-size: 1.25rem;
		}
	}
</style>
