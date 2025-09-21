<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { TotpService, type TotpStatus } from '../../services/totp';
	import TotpSetup from './TotpSetup.svelte';
	import { Shield, ShieldCheck, ShieldX, Key, RotateCcw, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-svelte';

	let totpStatus: TotpStatus | null = null;
	let isLoading = true;
	let showSetup = false;
	let showDisableForm = false;
	let showRegenerateForm = false;
	let disablePassword = '';
	let regeneratePassword = '';
	let showDisablePassword = false;
	let showRegeneratePassword = false;
	let isDisabling = false;
	let isRegenerating = false;
	let newBackupCodes: string[] = [];

	onMount(async () => {
		await loadTotpStatus();
	});

	async function loadTotpStatus() {
		isLoading = true;
		try {
			totpStatus = await TotpService.getStatus();
		} catch (error: any) {
			toast.error('Failed to load 2FA status', {
				description: error.message
			});
		} finally {
			isLoading = false;
		}
	}

	function startSetup() {
		showSetup = true;
	}

	function cancelSetup() {
		showSetup = false;
	}

	async function onSetupComplete() {
		showSetup = false;
		await loadTotpStatus();
		toast.success('Two-factor authentication has been successfully enabled!');
	}

	function startDisable() {
		showDisableForm = true;
		disablePassword = '';
	}

	function cancelDisable() {
		showDisableForm = false;
		disablePassword = '';
		showDisablePassword = false;
	}

	async function confirmDisable() {
		if (!disablePassword.trim()) {
			toast.error('Please enter your current password');
			return;
		}

		isDisabling = true;
		try {
			const result = await TotpService.disableTotp(disablePassword);
			
			if (result.success) {
				toast.success('Two-factor authentication has been disabled');
				showDisableForm = false;
				disablePassword = '';
				await loadTotpStatus();
			} else {
				toast.error('Failed to disable 2FA', {
					description: result.error || 'Invalid password'
				});
			}
		} catch (error: any) {
			toast.error('Failed to disable 2FA', {
				description: error.message
			});
		} finally {
			isDisabling = false;
		}
	}

	function startRegenerate() {
		showRegenerateForm = true;
		regeneratePassword = '';
		newBackupCodes = [];
	}

	function cancelRegenerate() {
		showRegenerateForm = false;
		regeneratePassword = '';
		showRegeneratePassword = false;
		newBackupCodes = [];
	}

	async function confirmRegenerate() {
		if (!regeneratePassword.trim()) {
			toast.error('Please enter your current password');
			return;
		}

		isRegenerating = true;
		try {
			const result = await TotpService.regenerateBackupCodes(regeneratePassword);
			
			if (result.backupCodes) {
				newBackupCodes = result.backupCodes;
				toast.success('Backup codes have been regenerated');
				await loadTotpStatus();
			} else {
				toast.error('Failed to regenerate backup codes', {
					description: result.error || 'Invalid password'
				});
			}
		} catch (error: any) {
			toast.error('Failed to regenerate backup codes', {
				description: error.message
			});
		} finally {
			isRegenerating = false;
		}
	}

	function downloadBackupCodes() {
		if (!newBackupCodes.length) return;

		const content = [
			'TOTP Backup Codes for dane.gg',
			'Generated: ' + new Date().toLocaleString(),
			'',
			'Important: Store these codes in a safe place. Each code can only be used once.',
			'',
			...newBackupCodes.map((code, index) => `${index + 1}. ${code}`)
		].join('\n');

		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'dane.gg-backup-codes.txt';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		toast.success('Backup codes downloaded');
	}

	function closeRegenerateSuccess() {
		showRegenerateForm = false;
		regeneratePassword = '';
		showRegeneratePassword = false;
		newBackupCodes = [];
	}
</script>

{#if showSetup}
	<TotpSetup onComplete={onSetupComplete} onCancel={cancelSetup} />
{:else}
	<div class="totp-manager">
		<div class="manager-header">
			<div class="header-icon" class:enabled={totpStatus?.enabled} class:disabled={!totpStatus?.enabled}>
				{#if totpStatus?.enabled}
					<ShieldCheck size={32} />
				{:else}
					<Shield size={32} />
				{/if}
			</div>
			<div class="header-content">
				<h2>Two-Factor Authentication</h2>
				<p class="status-text" class:enabled={totpStatus?.enabled}>
					{#if isLoading}
						Loading...
					{:else if totpStatus?.enabled}
						Enabled - Your account is protected with 2FA
					{:else}
						Disabled - Add an extra layer of security to your account
					{/if}
				</p>
			</div>
		</div>

		{#if isLoading}
			<div class="loading-state">
				<Loader2 size={32} class="spin" />
				<p>Loading 2FA status...</p>
			</div>
		{:else if totpStatus}
			<div class="manager-content">
				{#if totpStatus.enabled}
					<!-- Enabled State -->
					<div class="status-card enabled">
						<div class="status-info">
							<div class="status-icon">
								<ShieldCheck size={24} />
							</div>
							<div>
								<h3>Two-Factor Authentication is Enabled</h3>
								<p>Your account is protected with TOTP-based two-factor authentication.</p>
								{#if totpStatus.backupCodesCount > 0}
									<p class="backup-info">
										<Key size={16} />
										You have {totpStatus.backupCodesCount} unused backup codes
									</p>
								{:else}
									<p class="backup-warning">
										<AlertTriangle size={16} />
										You have no unused backup codes remaining
									</p>
								{/if}
							</div>
						</div>
						
						<div class="status-actions">
							<button 
								type="button" 
								class="action-button regenerate"
								onclick={startRegenerate}
							>
								<RotateCcw size={16} />
								Regenerate Backup Codes
							</button>
							<button 
								type="button" 
								class="action-button disable"
								onclick={startDisable}
							>
								<ShieldX size={16} />
								Disable 2FA
							</button>
						</div>
					</div>
				{:else}
					<!-- Disabled State -->
					<div class="status-card disabled">
						<div class="status-info">
							<div class="status-icon">
								<Shield size={24} />
							</div>
							<div>
								<h3>Two-Factor Authentication is Disabled</h3>
								<p>Protect your account by enabling two-factor authentication. This adds an extra layer of security by requiring a code from your mobile device when signing in.</p>
							</div>
						</div>
						
						<div class="status-actions">
							<button 
								type="button" 
								class="action-button enable"
								onclick={startSetup}
							>
								<ShieldCheck size={16} />
								Enable 2FA
							</button>
						</div>
					</div>
				{/if}

				<!-- Disable Form Modal -->
				{#if showDisableForm}
					<div class="modal-overlay">
						<div class="modal">
							<div class="modal-header">
								<h3>Disable Two-Factor Authentication</h3>
								<p>This will remove the extra security layer from your account. Are you sure you want to continue?</p>
							</div>
							
							<div class="modal-content">
								<div class="form-group">
									<label for="disable-password">Current Password</label>
									<div class="password-input-group">
										<input 
											id="disable-password"
											type={showDisablePassword ? 'text' : 'password'}
											bind:value={disablePassword}
											placeholder="Enter your current password"
											disabled={isDisabling}
											class="form-input"
										/>
										<button 
											type="button" 
											class="password-toggle"
											onclick={() => showDisablePassword = !showDisablePassword}
										>
											{#if showDisablePassword}
												<EyeOff size={16} />
											{:else}
												<Eye size={16} />
											{/if}
										</button>
									</div>
								</div>
							</div>
							
							<div class="modal-actions">
								<button 
									type="button" 
									class="modal-button cancel"
									onclick={cancelDisable}
									disabled={isDisabling}
								>
									Cancel
								</button>
								<button 
									type="button" 
									class="modal-button danger"
									onclick={confirmDisable}
									disabled={isDisabling || !disablePassword.trim()}
								>
									{#if isDisabling}
										<Loader2 size={16} class="spin" />
										Disabling...
									{:else}
										<ShieldX size={16} />
										Disable 2FA
									{/if}
								</button>
							</div>
						</div>
					</div>
				{/if}

				<!-- Regenerate Backup Codes Modal -->
				{#if showRegenerateForm}
					<div class="modal-overlay">
						<div class="modal">
							{#if newBackupCodes.length > 0}
								<!-- Success State -->
								<div class="modal-header">
									<h3>New Backup Codes Generated</h3>
									<div class="warning-box">
										<AlertTriangle size={20} />
										<div>
											<strong>Important:</strong> Your old backup codes are no longer valid. Save these new codes securely.
										</div>
									</div>
								</div>
								
								<div class="modal-content">
									<div class="backup-codes-display">
										{#each newBackupCodes as code, index}
											<div class="backup-code-item">
												<span class="code-number">{index + 1}.</span>
												<span class="code-value">{code}</span>
											</div>
										{/each}
									</div>
								</div>
								
								<div class="modal-actions">
									<button 
										type="button" 
										class="modal-button secondary"
										onclick={downloadBackupCodes}
									>
										<Key size={16} />
										Download Codes
									</button>
									<button 
										type="button" 
										class="modal-button primary"
										onclick={closeRegenerateSuccess}
									>
										Done
									</button>
								</div>
							{:else}
								<!-- Input State -->
								<div class="modal-header">
									<h3>Regenerate Backup Codes</h3>
									<p>This will generate new backup codes and invalidate your existing ones. Make sure to save the new codes securely.</p>
								</div>
								
								<div class="modal-content">
									<div class="form-group">
										<label for="regenerate-password">Current Password</label>
										<div class="password-input-group">
											<input 
												id="regenerate-password"
												type={showRegeneratePassword ? 'text' : 'password'}
												bind:value={regeneratePassword}
												placeholder="Enter your current password"
												disabled={isRegenerating}
												class="form-input"
											/>
											<button 
												type="button" 
												class="password-toggle"
												onclick={() => showRegeneratePassword = !showRegeneratePassword}
											>
												{#if showRegeneratePassword}
													<EyeOff size={16} />
												{:else}
													<Eye size={16} />
												{/if}
											</button>
										</div>
									</div>
								</div>
								
								<div class="modal-actions">
									<button 
										type="button" 
										class="modal-button cancel"
										onclick={cancelRegenerate}
										disabled={isRegenerating}
									>
										Cancel
									</button>
									<button 
										type="button" 
										class="modal-button primary"
										onclick={confirmRegenerate}
										disabled={isRegenerating || !regeneratePassword.trim()}
									>
										{#if isRegenerating}
											<Loader2 size={16} class="spin" />
											Generating...
										{:else}
											<RotateCcw size={16} />
											Generate New Codes
										{/if}
									</button>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.totp-manager {
		max-width: 800px;
		margin: 0 auto;
	}

	.manager-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.header-icon {
		padding: 1rem;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s ease;
	}

	.header-icon.enabled {
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
	}

	.header-icon.disabled {
		background: var(--accent-color-light, rgba(59, 130, 246, 0.1));
		color: var(--accent-color);
	}

	.header-content h2 {
		color: var(--text-primary);
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.status-text {
		margin: 0;
		font-size: 0.95rem;
		transition: color 0.3s ease;
	}

	.status-text.enabled {
		color: #22c55e;
		font-weight: 500;
	}

	.status-text:not(.enabled) {
		color: var(--text-secondary);
	}

	.loading-state {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--text-secondary);
	}

	.loading-state :global(.spin) {
		color: var(--accent-color);
		margin-bottom: 1rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.status-card {
		background: var(--bg-secondary);
		border-radius: 16px;
		padding: 2rem;
		border: 1px solid var(--border-color);
		transition: all 0.3s ease;
	}

	.status-card.enabled {
		border-color: rgba(34, 197, 94, 0.3);
		background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(34, 197, 94, 0.05) 100%);
	}

	.status-info {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.status-icon {
		background: var(--bg-tertiary);
		padding: 0.75rem;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.status-card.enabled .status-icon {
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
	}

	.status-card.disabled .status-icon {
		background: var(--accent-color-light, rgba(59, 130, 246, 0.1));
		color: var(--accent-color);
	}

	.status-info h3 {
		color: var(--text-primary);
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.status-info p {
		color: var(--text-secondary);
		margin: 0 0 0.5rem 0;
		line-height: 1.5;
	}

	.backup-info, .backup-warning {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.backup-info {
		color: #22c55e;
	}

	.backup-warning {
		color: #f59e0b;
	}

	.status-actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.action-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		border-radius: 10px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		border: none;
		position: relative;
		overflow: hidden;
	}

	.action-button::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s;
	}

	.action-button:hover::before {
		left: 100%;
	}

	.action-button.enable {
		background: var(--accent-color);
		color: var(--accent-color-contrast, white);
	}

	.action-button.enable:hover {
		background: var(--accent-color-dark);
		transform: translateY(-1px);
	}

	.action-button.regenerate {
		background: #f59e0b;
		color: white;
	}

	.action-button.regenerate:hover {
		background: #d97706;
		transform: translateY(-1px);
	}

	.action-button.disable {
		background: #ef4444;
		color: white;
	}

	.action-button.disable:hover {
		background: #dc2626;
		transform: translateY(-1px);
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: var(--bg-secondary);
		border-radius: 16px;
		border: 1px solid var(--border-color);
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		padding: 2rem 2rem 1rem 2rem;
		border-bottom: 1px solid var(--border-color);
	}

	.modal-header h3 {
		color: var(--text-primary);
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
	}

	.modal-header p {
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.modal-content {
		padding: 1.5rem 2rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.password-input-group {
		position: relative;
		display: flex;
		background: var(--bg-primary);
		border: 2px solid var(--border-color);
		border-radius: 10px;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.password-input-group:focus-within {
		border-color: var(--accent-color);
		box-shadow: 0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1));
	}

	.form-input {
		flex: 1;
		padding: 1rem;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font-size: 0.95rem;
	}

	.form-input:focus {
		outline: none;
	}

	.password-toggle {
		padding: 1rem;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
	}

	.password-toggle:hover {
		color: var(--text-primary);
	}

	.warning-box {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: rgba(234, 179, 8, 0.1);
		border: 1px solid rgba(234, 179, 8, 0.3);
		border-radius: 8px;
		margin-top: 1rem;
	}

	.warning-box :global(svg) {
		color: #ca8a04;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.warning-box strong {
		color: var(--text-primary);
	}

	.backup-codes-display {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.backup-code-item {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--bg-tertiary);
		border-radius: 8px;
		border: 1px solid var(--border-color);
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
	}

	.code-number {
		color: var(--text-secondary);
		font-weight: 600;
		min-width: 1.5rem;
	}

	.code-value {
		color: var(--text-primary);
		font-weight: 500;
	}

	.modal-actions {
		padding: 1rem 2rem 2rem 2rem;
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.modal-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		border-radius: 10px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		border: none;
	}

	.modal-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.modal-button.cancel {
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.modal-button.cancel:hover:not(:disabled) {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.modal-button.primary {
		background: var(--accent-color);
		color: var(--accent-color-contrast, white);
	}

	.modal-button.primary:hover:not(:disabled) {
		background: var(--accent-color-dark);
		transform: translateY(-1px);
	}

	.modal-button.secondary {
		background: #6b7280;
		color: white;
	}

	.modal-button.secondary:hover:not(:disabled) {
		background: #4b5563;
		transform: translateY(-1px);
	}

	.modal-button.danger {
		background: #ef4444;
		color: white;
	}

	.modal-button.danger:hover:not(:disabled) {
		background: #dc2626;
		transform: translateY(-1px);
	}

	@media (max-width: 768px) {
		.status-actions {
			flex-direction: column;
		}

		.action-button {
			width: 100%;
			justify-content: center;
		}

		.modal-actions {
			flex-direction: column;
		}

		.modal-button {
			width: 100%;
			justify-content: center;
		}

		.backup-codes-display {
			grid-template-columns: 1fr;
		}
	}

	/* Light mode support */
	:global(html:not(.dark)) .status-card {
		background: #f8f9fa;
		border-color: #e9ecef;
	}

	:global(html:not(.dark)) .status-card.enabled {
		background: linear-gradient(135deg, #f8f9fa 0%, rgba(34, 197, 94, 0.05) 100%);
	}

	:global(html:not(.dark)) .modal {
		background: #ffffff;
		border-color: #e9ecef;
	}

	:global(html:not(.dark)) .backup-code-item {
		background: #f8f9fa;
	}
</style>
