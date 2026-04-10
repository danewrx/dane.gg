<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { TotpService, type TotpSetupData } from '../../services/totp';
	import { getErrorMessage } from '$lib/shared/utils/errorUtils';
	import {
		Eye,
		EyeOff,
		Copy,
		Check,
		Shield,
		Key,
		Download,
		AlertTriangle,
		Loader2
	} from 'lucide-svelte';

	export let onComplete: () => void;
	export let onCancel: () => void;

	let setupData: TotpSetupData | null = null;
	let currentStep = 1;
	let verificationToken = '';
	let showSecret = false;
	let isLoading = false;
	let isVerifying = false;
	let copied = false;
	let backupCodesCopied = false;

	const steps = [
		{
			title: 'Install Authenticator App',
			description:
				'Download and install a TOTP authenticator app like Google Authenticator, Authy, or 1Password.'
		},
		{
			title: 'Scan QR Code',
			description:
				'Use your authenticator app to scan the QR code or manually enter the secret key.'
		},
		{
			title: 'Save Backup Codes',
			description:
				'Download and securely store these backup codes. You can use them to access your account if you lose your device.'
		},
		{
			title: 'Verify Setup',
			description: 'Enter the 6-digit code from your authenticator app to complete the setup.'
		}
	];

	onMount(async () => {
		await generateSetup();
	});

	async function generateSetup() {
		isLoading = true;
		try {
			setupData = await TotpService.generateSetup();
		} catch (error: any) {
			toast.error('Failed to generate TOTP setup', {
				description: getErrorMessage(error, 'Unable to generate setup data')
			});
		} finally {
			isLoading = false;
		}
	}

	async function copyToClipboard(text: string, type: 'secret' | 'backup') {
		try {
			await navigator.clipboard.writeText(text);
			if (type === 'secret') {
				copied = true;
				setTimeout(() => (copied = false), 2000);
			} else {
				backupCodesCopied = true;
				setTimeout(() => (backupCodesCopied = false), 2000);
			}
			toast.success('Copied to clipboard');
		} catch {
			toast.error('Failed to copy to clipboard');
		}
	}

	function downloadBackupCodes() {
		if (!setupData?.backupCodes) return;

		const content = [
			'TOTP Backup Codes for dane.gg',
			'Generated: ' + new Date().toLocaleString(),
			'',
			'Important: Store these codes in a safe place. Each code can only be used once.',
			'',
			...setupData.backupCodes.map((code, index) => `${index + 1}. ${code}`)
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

	async function verifyAndEnable() {
		if (!setupData || !verificationToken.trim()) {
			toast.error('Please enter the verification code');
			return;
		}

		if (!TotpService.validateTokenFormat(verificationToken)) {
			toast.error('Invalid token format. Please enter a 6-digit code.');
			return;
		}

		isVerifying = true;
		try {
			const result = await TotpService.enableTotp(
				setupData.secret,
				verificationToken,
				setupData.backupCodes
			);

			if (result.success) {
				toast.success('Two-factor authentication enabled successfully!');
				onComplete();
			} else {
				toast.error('Failed to enable 2FA', {
					description: result.error || 'Invalid verification code'
				});
			}
		} catch (error: any) {
			toast.error('Failed to enable 2FA', {
				description: getErrorMessage(error, 'Unable to enable 2FA')
			});
		} finally {
			isVerifying = false;
		}
	}

	function nextStep() {
		if (currentStep < steps.length) {
			currentStep++;
		}
	}

	function previousStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}
</script>

<div class="totp-setup">
	<div class="setup-header">
		<div class="header-icon">
			<Shield size={32} />
		</div>
		<div class="header-content">
			<h2>Enable Two-Factor Authentication</h2>
			<p>Add an extra layer of security to your account</p>
		</div>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<Loader2 size={32} class="spin" />
			<p>Generating setup data...</p>
		</div>
	{:else if setupData}
		<!-- Step Progress -->
		<div class="step-progress">
			{#each steps as step, index}
				<div
					class="step"
					class:active={currentStep === index + 1}
					class:completed={currentStep > index + 1}
				>
					<div class="step-number">
						{#if currentStep > index + 1}
							<Check size={16} />
						{:else}
							{index + 1}
						{/if}
					</div>
					<div class="step-info">
						<h4>{step.title}</h4>
						<p>{step.description}</p>
					</div>
				</div>
			{/each}
		</div>

		<!-- Step Content -->
		<div class="step-content">
			{#if currentStep === 1}
				<!-- Install App Step -->
				<div class="step-section">
					<h3>
						<Key size={20} />
						Install an Authenticator App
					</h3>
					<p>You'll need a TOTP authenticator app on your mobile device. We recommend:</p>
					<div class="app-list">
						<div class="app-item recommended">
							<strong>Ente Auth (recommended)</strong> - Open source, privacy-focused
						</div>
						<div class="app-item">
							<strong>2FAS Authenticator</strong> - Free, secure, and user-friendly
						</div>
						<div class="app-item">
							<strong>Google Authenticator</strong> - Simple and widely used
						</div>
					</div>
				</div>
			{:else if currentStep === 2}
				<!-- QR Code Step -->
				<div class="step-section">
					<h3>
						<Shield size={20} />
						Scan QR Code
					</h3>
					<p>Use your authenticator app to scan this QR code:</p>

					<div class="qr-section">
						<div class="qr-code">
							<img src={setupData.qrCodeUrl} alt="TOTP QR Code" />
						</div>

						<div class="manual-entry">
							<h4>Can't scan? Enter manually:</h4>
							<div class="secret-display">
								<div class="secret-input">
									<input
										type={showSecret ? 'text' : 'password'}
										value={setupData.secret}
										readonly
									/>
									<button
										type="button"
										class="toggle-visibility"
										onclick={() => (showSecret = !showSecret)}
										aria-label={showSecret ? 'Hide secret' : 'Show secret'}
									>
										{#if showSecret}
											<EyeOff size={16} />
										{:else}
											<Eye size={16} />
										{/if}
									</button>
									<button
										type="button"
										class="copy-button"
										onclick={() => copyToClipboard(setupData!.secret, 'secret')}
										aria-label="Copy secret"
									>
										{#if copied}
											<Check size={16} />
										{:else}
											<Copy size={16} />
										{/if}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			{:else if currentStep === 3}
				<!-- Backup Codes Step -->
				<div class="step-section">
					<h3>
						<Download size={20} />
						Save Backup Codes
					</h3>
					<div class="warning-box">
						<AlertTriangle size={20} />
						<div>
							<strong>Important:</strong> Store these backup codes securely. Each code can only be used
							once and will help you regain access if you lose your authenticator device.
						</div>
					</div>

					<div class="backup-codes">
						<div class="codes-grid">
							{#each setupData.backupCodes as code, index}
								<div class="backup-code">
									<span class="code-number">{index + 1}.</span>
									<span class="code-value">{code}</span>
								</div>
							{/each}
						</div>

						<div class="backup-actions">
							<button type="button" class="backup-action-btn" onclick={downloadBackupCodes}>
								<Download size={16} />
								Download Codes
							</button>
							<button
								type="button"
								class="backup-action-btn"
								onclick={() => copyToClipboard(setupData!.backupCodes.join('\n'), 'backup')}
							>
								{#if backupCodesCopied}
									<Check size={16} />
									Copied!
								{:else}
									<Copy size={16} />
									Copy All
								{/if}
							</button>
						</div>
					</div>
				</div>
			{:else if currentStep === 4}
				<!-- Verification Step -->
				<div class="step-section">
					<h3>
						<Shield size={20} />
						Verify Setup
					</h3>
					<p>Enter the 6-digit code from your authenticator app to complete the setup:</p>

					<div class="verification-form">
						<div class="token-input-group">
							<input
								type="text"
								bind:value={verificationToken}
								placeholder="000000"
								maxlength="6"
								pattern="[0-9]{6}"
								class="token-input"
								disabled={isVerifying}
								autocomplete="one-time-code"
							/>
						</div>

						<button
							type="button"
							class="verify-button"
							onclick={verifyAndEnable}
							disabled={!verificationToken || isVerifying}
						>
							{#if isVerifying}
								<Loader2 size={16} class="spin" />
								Verifying...
							{:else}
								<Shield size={16} />
								Enable 2FA
							{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Navigation -->
		<div class="setup-navigation">
			<div class="nav-left">
				{#if currentStep > 1}
					<button type="button" class="nav-button secondary" onclick={previousStep}>
						Previous
					</button>
				{/if}
				<button type="button" class="nav-button cancel" onclick={onCancel}> Cancel </button>
			</div>
			<div class="nav-right">
				{#if currentStep < 4}
					<button type="button" class="nav-button primary" onclick={nextStep}> Next </button>
				{/if}
			</div>
		</div>
	{:else}
		<div class="error-state">
			<AlertTriangle size={32} />
			<p>Failed to generate setup data. Please try again.</p>
			<button type="button" class="retry-button" onclick={generateSetup}> Retry </button>
		</div>
	{/if}
</div>

<style>
	.totp-setup {
		max-width: 600px;
		width: 100%;
		margin: 0 auto;
		padding: 2rem;
		box-sizing: border-box;
		background: var(--bg-secondary);
		border-radius: 16px;
		border: 1px solid var(--border-color);
		min-width: 0;
	}

	.setup-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.header-icon {
		background: var(--accent-color-light, rgba(59, 130, 246, 0.1));
		color: var(--accent-color);
		padding: 1rem;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.header-content h2 {
		color: var(--text-primary);
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.header-content p {
		color: var(--text-secondary);
		margin: 0;
		font-size: 0.95rem;
	}

	.loading-state,
	.error-state {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--text-secondary);
	}

	.loading-state :global(.spin),
	.error-state :global(svg) {
		color: var(--accent-color);
		margin-bottom: 1rem;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.loading-state :global(.spin) {
		animation: spin 1s linear infinite;
	}

	.step-progress {
		margin-bottom: 2rem;
	}

	.step {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		border-radius: 12px;
		margin-bottom: 0.5rem;
		transition: all 0.3s ease;
	}

	.step.active {
		background: var(--accent-color-light, rgba(59, 130, 246, 0.1));
		border: 1px solid var(--accent-color);
	}

	.step.completed {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
	}

	.step-number {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.step.active .step-number {
		background: var(--accent-color);
		color: var(--accent-color-contrast, white);
	}

	.step.completed .step-number {
		background: #22c55e;
		color: white;
	}

	.step:not(.active):not(.completed) .step-number {
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.step-info h4 {
		color: var(--text-primary);
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0 0 0.25rem 0;
	}

	.step-info p {
		color: var(--text-secondary);
		font-size: 0.875rem;
		margin: 0;
		line-height: 1.4;
	}

	.step-content {
		margin-bottom: 2rem;
		min-width: 0;
	}

	.step-section h3 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-primary);
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
	}

	.step-section h3 :global(svg) {
		color: var(--accent-color);
	}

	.step-section > p {
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
		line-height: 1.5;
	}

	.step-section {
		min-width: 0;
	}

	.app-list {
		display: grid;
		gap: 0.75rem;
	}

	.app-item {
		padding: 1rem;
		background: var(--bg-tertiary);
		border-radius: 8px;
		border: 1px solid var(--border-color);
		transition: all 0.2s ease;
	}

	.app-item.recommended {
		background: var(--accent-color-light, rgba(59, 130, 246, 0.1));
		border-color: var(--accent-color, #3b82f6);
		border-width: 2px;
		position: relative;
	}

	.app-item.recommended::before {
		content: '★';
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		color: var(--accent-color, #3b82f6);
		font-size: 1.2rem;
	}

	.app-item strong {
		color: var(--text-primary);
	}

	.app-item.recommended strong {
		color: var(--accent-color, #3b82f6);
	}

	.qr-section {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2rem;
		align-items: start;
		min-width: 0;
	}

	.qr-code {
		background: white;
		padding: 1rem;
		border-radius: 12px;
		display: flex;
		justify-content: center;
		align-items: center;
		width: fit-content;
		max-width: 100%;
		box-sizing: border-box;
	}

	.qr-code img {
		display: block;
		width: 200px;
		max-width: 100%;
		height: auto;
		aspect-ratio: 1;
		object-fit: contain;
		border-radius: 8px;
	}

	.manual-entry {
		min-width: 0;
		max-width: 100%;
	}

	.manual-entry h4 {
		color: var(--text-primary);
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
	}

	.secret-display {
		margin-top: 0.5rem;
		min-width: 0;
		max-width: 100%;
	}

	.secret-input {
		display: flex;
		align-items: stretch;
		background: var(--bg-primary);
		border: 2px solid var(--border-color);
		border-radius: 10px;
		overflow: hidden;
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
	}

	.secret-input input {
		flex: 1 1 auto;
		min-width: 0;
		padding: 0.875rem 0.75rem;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
		overflow-x: auto;
	}

	.secret-input input:focus {
		outline: none;
	}

	.secret-input:focus-within {
		border-color: var(--accent-color);
		box-shadow: 0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1));
	}

	.toggle-visibility,
	.copy-button {
		flex-shrink: 0;
		padding: 0.875rem;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s ease;
	}

	.toggle-visibility:hover,
	.copy-button:hover {
		color: var(--text-primary);
	}

	.warning-box {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: rgba(234, 179, 8, 0.1);
		border: 1px solid rgba(234, 179, 8, 0.3);
		border-radius: 8px;
		margin-bottom: 1.5rem;
	}

	.warning-box :global(svg) {
		color: #ca8a04;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.warning-box strong {
		color: var(--text-primary);
	}

	.backup-codes {
		background: var(--bg-tertiary);
		padding: 1.5rem;
		border-radius: 12px;
		border: 1px solid var(--border-color);
	}

	.codes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.backup-code {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--bg-primary);
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

	.backup-actions {
		display: flex;
		gap: 1rem;
	}

	.backup-action-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--accent-color);
		color: var(--accent-color-contrast, white);
		border: none;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.backup-action-btn:hover {
		background: var(--accent-color-dark);
		transform: translateY(-1px);
	}

	.verification-form {
		max-width: 300px;
		width: 100%;
		box-sizing: border-box;
		min-width: 0;
	}

	.token-input-group {
		margin-bottom: 1.5rem;
		width: 100%;
		min-width: 0;
	}

	.token-input {
		display: block;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		box-sizing: border-box;
		padding: 1rem 0.75rem;
		font-size: 1.5rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		text-align: center;
		letter-spacing: 0.28em;
		border: 2px solid var(--border-color);
		border-radius: 10px;
		background: var(--bg-primary);
		color: var(--text-primary);
		transition: all 0.3s ease;
	}

	.token-input:focus {
		outline: none;
		border-color: var(--accent-color);
		box-shadow: 0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1));
	}

	.verify-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--accent-color);
		color: var(--accent-color-contrast, white);
		border: none;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.verify-button:hover:not(:disabled) {
		background: var(--accent-color-dark);
		transform: translateY(-1px);
	}

	.verify-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.setup-navigation {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-color);
	}

	.nav-left,
	.nav-right {
		display: flex;
		gap: 1rem;
	}

	.nav-button {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
	}

	.nav-button.primary {
		background: var(--accent-color);
		color: var(--accent-color-contrast, white);
	}

	.nav-button.primary:hover {
		background: var(--accent-color-dark);
	}

	.nav-button.secondary {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.nav-button.secondary:hover {
		background: var(--bg-hover);
	}

	.nav-button.cancel {
		background: transparent;
		color: var(--text-secondary);
		border: 1px solid var(--border-color);
	}

	.nav-button.cancel:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}

	.retry-button {
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		background: var(--accent-color);
		color: var(--accent-color-contrast, white);
		border: none;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
	}

	@media (max-width: 768px) {
		.totp-setup {
			padding: 1rem;
			max-width: 100%;
		}

		.qr-section {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.qr-code {
			justify-self: center;
			width: 100%;
			max-width: 240px;
		}

		.qr-code img {
			width: 100%;
			max-width: 220px;
		}

		.codes-grid {
			grid-template-columns: 1fr;
		}

		.backup-actions {
			flex-direction: column;
		}

		.backup-action-btn {
			width: 100%;
			justify-content: center;
		}

		.verification-form {
			max-width: none;
			width: 100%;
		}

		.token-input {
			font-size: 1.35rem;
			letter-spacing: 0.2em;
			padding: 0.875rem 0.5rem;
		}

		.setup-navigation {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.nav-left {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.75rem;
			width: 100%;
			justify-content: stretch;
		}

		.nav-right {
			width: 100%;
			display: flex;
			justify-content: stretch;
		}

		.nav-button {
			width: 100%;
			justify-content: center;
			box-sizing: border-box;
		}
	}

	@media (max-width: 480px) {
		.totp-setup {
			padding: 1rem 0.75rem;
			border-radius: 12px;
		}

		.setup-header {
			flex-direction: column;
			align-items: flex-start;
			text-align: left;
		}

		.nav-left {
			grid-template-columns: 1fr;
		}

		.token-input {
			font-size: 1.15rem;
			letter-spacing: 0.12em;
			padding: 0.75rem 0.35rem;
		}
	}

	/* Light mode support */
	:global(html:not(.dark)) .totp-setup {
		background: #f8f9fa;
		border-color: #e9ecef;
	}

	:global(html:not(.dark)) .step.active {
		background: rgba(59, 130, 246, 0.1);
	}

	:global(html:not(.dark)) .qr-code {
		border: 1px solid #e9ecef;
	}

	:global(html:not(.dark)) .backup-codes {
		background: #ffffff;
	}

	:global(html:not(.dark)) .backup-code {
		background: #f8f9fa;
	}
</style>
