<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth, isLoading, error } from '$lib/admin/stores/auth';
	import { authService } from '$lib/admin/services/auth';
	import { TotpService } from '$lib/admin/services/totp';
	import { toast } from 'svelte-sonner';
	import { ShieldCheck, Loader2, LogIn } from 'lucide-svelte';
	import { Logo } from '$lib';

	// Login state
	let username = '';
	let password = '';
	let rememberMe = false;
	let isSubmitting = false;
	// 2FA state
	let showTotpForm = false;
	let totpCode = '';
	let backupCode = '';
	let showBackupForm = false;
	let loginUsername = ''; // Store username for 2FA display
	let isInitialLoad = true; // Track if this is the initial page load
	let hasSubmittedTotp = false; // Prevent auto-submit loop after error
	let wasPasted = false; // Track if the current input was pasted

	// Individual digit inputs for TOTP
	let digits = ['', '', '', '', '', ''];
	let digitInputs: HTMLInputElement[] = [];

	// Update totpCode when digits change
	$: totpCode = digits.join('');

	// Auto-submit when all 6 digits are filled (only if pasted and not already submitted)
	$: if (
		totpCode.length === 6 &&
		wasPasted &&
		!isSubmitting &&
		showTotpForm &&
		!showBackupForm &&
		!hasSubmittedTotp
	) {
		// Small delay to ensure the UI updates before submitting
		setTimeout(() => {
			handleTotpSubmit(new Event('submit'));
		}, 100);
	}

	function handleDigitInput(index: number, event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value.replace(/\D/g, ''); // Only allow digits

		// Reset submission flag when user changes input
		hasSubmittedTotp = false;
		// Mark as manual typing (not pasted)
		wasPasted = false;

		if (value.length > 1) {
			// Handle paste or multiple characters - mark as pasted
			wasPasted = true;
			const pastedDigits = value.slice(0, 6).split('');
			for (let i = 0; i < 6; i++) {
				digits[i] = pastedDigits[i] || '';
			}
			// Focus the last filled input or the 6th input
			const lastIndex = Math.min(pastedDigits.length - 1, 5);
			digitInputs[lastIndex]?.focus();
		} else {
			// Single character input - mark as manual typing
			wasPasted = false;
			digits[index] = value;

			// Move to next input if value entered and not the last input
			if (value && index < 5) {
				digitInputs[index + 1]?.focus();
			}
		}
	}

	function handleDigitKeydown(index: number, event: KeyboardEvent) {
		if (event.key === 'Backspace' && !digits[index] && index > 0) {
			// Move to previous input on backspace if current is empty
			digitInputs[index - 1]?.focus();
		} else if (event.key === 'ArrowLeft' && index > 0) {
			digitInputs[index - 1]?.focus();
		} else if (event.key === 'ArrowRight' && index < 5) {
			digitInputs[index + 1]?.focus();
		}
	}

	function handleDigitPaste(event: ClipboardEvent) {
		event.preventDefault();
		const pastedText = event.clipboardData?.getData('text') || '';
		const pastedDigits = pastedText.replace(/\D/g, '').slice(0, 6).split('');

		// Reset submission flag when user pastes
		hasSubmittedTotp = false;
		// Mark as pasted for auto-submit
		wasPasted = true;

		for (let i = 0; i < 6; i++) {
			digits[i] = pastedDigits[i] || '';
		}

		// Focus the last filled input or the 6th input
		const lastIndex = Math.min(pastedDigits.length - 1, 5);
		digitInputs[lastIndex]?.focus();
	}

	// Get redirect URL from query params
	$: redirectUrl = $page.url.searchParams.get('redirect') || '/admin';

	// Reactive statement to handle auth state changes
	$: if (!$isLoading && $auth.isAuthenticated) {
		goto(redirectUrl);
	}

	onMount(() => {
		// Wait for auth to initialize before checking
		if ($isLoading) {
			return;
		}

		// If already authenticated, redirect
		if ($auth.isAuthenticated) {
			goto(redirectUrl);
		}
	});

	async function handleLoginSubmit(event: Event) {
		event.preventDefault();

		if (isSubmitting) return;

		isSubmitting = true;
		auth.clearError();

		try {
			const result = await authService.login({
				username,
				password,
				rememberMe
			});

			if (result.requiresTOTP) {
				// Show 2FA form
				loginUsername = username;
				isInitialLoad = false; // Disable animation for 2FA form
				showTotpForm = true;
			} else if (result.success) {
				// Successful login, redirect
				goto(redirectUrl);
			}
		} catch (error) {
			logger.error('Login failed:', error);
			// Error is already set in the auth store
		} finally {
			isSubmitting = false;
		}
	}

	async function handleTotpSubmit(event: Event) {
		event.preventDefault();

		if (isSubmitting) return;

		// Validate input
		if (!showBackupForm && !totpCode.trim()) {
			auth.setError('Please enter the verification code');
			return;
		}

		if (showBackupForm && !backupCode.trim()) {
			auth.setError('Please enter a backup code');
			return;
		}

		if (!showBackupForm && !TotpService.validateTokenFormat(totpCode)) {
			auth.setError('Invalid code format. Please enter a 6-digit code.');
			return;
		}

		isSubmitting = true;
		hasSubmittedTotp = true;
		wasPasted = false; // Reset paste flag after submission
		auth.clearError();

		try {
			const credentials: any = {
				username: loginUsername,
				password,
				rememberMe
			};

			if (showBackupForm) {
				credentials.backupCode = TotpService.cleanBackupCode(backupCode);
			} else {
				credentials.totpCode = totpCode;
			}

			const result = await authService.login(credentials);

			if (result.success) {
				toast.success('Authentication successful!');
				goto(redirectUrl);
			}
		} catch (error) {
			logger.error('2FA verification failed:', error);
			// Error is already set in the auth store
		} finally {
			isSubmitting = false;
		}
	}

	function switchToBackup() {
		showBackupForm = true;
		totpCode = '';
		// Clear digit inputs
		digits = ['', '', '', '', '', ''];
		hasSubmittedTotp = false; // Reset submission flag
		wasPasted = false; // Reset paste flag
		auth.clearError();
	}

	function switchToCode() {
		showBackupForm = false;
		backupCode = '';
		// Clear digit inputs
		digits = ['', '', '', '', '', ''];
		hasSubmittedTotp = false; // Reset submission flag
		wasPasted = false; // Reset paste flag
		auth.clearError();
	}

	function backToLogin() {
		showTotpForm = false;
		showBackupForm = false;
		totpCode = '';
		backupCode = '';
		loginUsername = '';
		isInitialLoad = false; // Disable animation when returning to login
		// Clear digit inputs
		digits = ['', '', '', '', '', ''];
		hasSubmittedTotp = false; // Reset submission flag
		wasPasted = false; // Reset paste flag
		auth.clearError();
	}
</script>

<svelte:head>
	<title>{adminPageTitle('Login')}</title>
</svelte:head>

<div class="login-container">
	<div class="login-card">
		{#if !showTotpForm}
			<!-- Login Form -->
			<div class="login-header">
				<Logo animate={isInitialLoad} />
			</div>

			<form onsubmit={handleLoginSubmit}>
				{#if $error}
					<div class="error-message" role="alert">
						{$error}
					</div>
				{/if}

				<div class="form-group">
					<input
						id="username"
						type="text"
						bind:value={username}
						required
						autocomplete="username"
						disabled={isSubmitting}
						class="form-input"
						placeholder="Username *"
					/>
				</div>

				<div class="form-group">
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						autocomplete="current-password"
						disabled={isSubmitting}
						class="form-input"
						placeholder="Password *"
					/>
				</div>

				<button type="submit" disabled={isSubmitting || $isLoading} class="submit-button">
					{#if isSubmitting}
						<Loader2 size={16} class="spin" /> Signing in...
					{:else}
						<LogIn size={16} /> Sign In
					{/if}
				</button>
				<br />
				<div class="footer-links">
					<button type="button" class="footer-link" onclick={() => window.open('/', '_blank')}>
						← Return to dane.gg
					</button>
				</div>
			</form>
		{:else}
			<!-- 2FA Form -->
			<div class="login-header">
				<Logo animate={false} />

				<div class="twofa-title">
					<h2>Two-Factor Authentication</h2>
					{#if loginUsername}
						<div class="user-badge">
							<span class="user-label">Signing in as</span>
							<span class="username">{loginUsername}</span>
						</div>
					{/if}
				</div>
			</div>

			<form onsubmit={handleTotpSubmit}>
				{#if $error}
					<div class="error-message" role="alert">
						{$error}
					</div>
				{/if}

				<div class="twofa-content">
					{#if showBackupForm}
						<!-- Backup Code Form -->
						<div class="input-section">
							<div class="input-label">Backup Code</div>
							<input
								id="backup-code"
								type="text"
								bind:value={backupCode}
								placeholder="Enter backup code"
								disabled={isSubmitting}
								class="backup-input"
								autocomplete="one-time-code"
							/>
						</div>
					{:else}
						<!-- TOTP Code Form -->
						<div class="input-section">
							<div class="input-label">Authentication Code</div>
							<div class="digit-inputs-container">
								{#each digits as digit, index}
									<input
										bind:this={digitInputs[index]}
										type="text"
										inputmode="numeric"
										maxlength="1"
										value={digit}
										disabled={isSubmitting}
										class="digit-input"
										autocomplete="one-time-code"
										oninput={(e) => handleDigitInput(index, e)}
										onkeydown={(e) => handleDigitKeydown(index, e)}
										onpaste={handleDigitPaste}
									/>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<button
					type="submit"
					disabled={isSubmitting ||
						(!totpCode && !showBackupForm) ||
						(!backupCode && showBackupForm)}
					class="submit-button"
				>
					{#if isSubmitting}
						<Loader2 size={16} class="spin" /> Submitting...
					{:else}
						<ShieldCheck size={16} /> Submit
					{/if}
				</button>

				<div class="twofa-footer">
					{#if !showBackupForm}
						<button type="button" class="backup-link" onclick={switchToBackup}>
							Use backup code instead
						</button>
					{/if}

					<div class="footer-links">
						{#if showBackupForm}
							<button type="button" class="footer-link" onclick={switchToCode}>
								← Use authenticator code
							</button>
						{/if}
						<button type="button" class="footer-link" onclick={backToLogin}>
							← Back to login
						</button>
					</div>
				</div>
			</form>
		{/if}
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #1a1a1a;
		padding: 1rem;
	}

	.login-card {
		background: #1a1a1a;
		border: 1px solid #3a3a3a;
		border-radius: 12px;
		padding: 2.5rem;
		width: 100%;
		max-width: 400px;
		text-align: center;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		transition: all 0.2s ease;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.login-header {
		margin-bottom: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
		text-align: left;
	}

	.form-input {
		width: 100%;
		padding: 1rem 1.25rem;
		border: 2px solid #3a3a3a;
		border-radius: 10px;
		background: #282828;
		color: #ffffff;
		font-size: 0.95rem;
		font-weight: 500;
		box-sizing: border-box;
		transition: all 0.3s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.form-input::placeholder {
		color: #6b7280;
		font-weight: 400;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--accent-color, #3b82f6);
		background: #2a2a2a;
		box-shadow:
			0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1)),
			0 2px 8px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.submit-button {
		width: 100%;
		background: var(--accent-bg, var(--accent-color, #3b82f6));
		color: var(--accent-fg);
		border: none;
		border-radius: 10px;
		padding: 1rem 1.5rem;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		margin-top: 1rem;
		letter-spacing: 0.025em;
		transition: all 0.3s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.submit-button::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s;
	}

	.submit-button:hover:not(:disabled)::before {
		left: 100%;
	}

	.submit-button:hover:not(:disabled) {
		background: var(--accent-bg-hover, var(--accent-color-dark, #2563eb));
		color: var(--accent-fg-hover, var(--accent-fg));
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.submit-button:focus {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: 2px;
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-left: 4px solid #ef4444;
		color: #ef4444;
		padding: 1rem;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
		text-align: left;
		border-radius: 8px;
		font-weight: 500;
	}

	/* 2FA form styling */
	.twofa-title {
		text-align: center;
		margin-bottom: 2rem;
	}

	.twofa-title h2 {
		color: #ffffff;
		font-size: 1.375rem;
		font-weight: 700;
		margin: 0 0 1rem 0;
		letter-spacing: -0.025em;
		transition: color 0.2s ease;
		line-height: 1.25;
	}

	.user-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: #282828;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		border: 1px solid #3a3a3a;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		font-weight: 500;
	}

	.user-label {
		color: #9ca3af;
		font-weight: 500;
	}

	.username {
		color: #ffffff;
		font-weight: 700;
	}

	.twofa-content {
		margin-bottom: 2rem;
	}

	.input-section {
		text-align: center;
	}

	.input-label {
		color: #9ca3af;
		font-size: 0.9rem;
		font-weight: 600;
		margin-bottom: 1rem;
		letter-spacing: -0.025em;
		transition: color 0.2s ease;
		letter-spacing: 0.025em;
	}

	.backup-input {
		width: 100%;
		max-width: 280px;
		padding: 1rem 1.25rem;
		border: 2px solid #3a3a3a;
		border-radius: 10px;
		background: #282828;
		color: #ffffff;
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		transition: all 0.3s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		margin: 0 auto;
		display: block;
		letter-spacing: 0.025em;
		font-family: 'Courier New', monospace;
	}

	.backup-input::placeholder {
		color: #6b7280;
		font-weight: 500;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		letter-spacing: -0.025em;
	}

	.backup-input:focus {
		outline: none;
		border-color: var(--accent-color, #3b82f6);
		background: #2a2a2a;
		box-shadow:
			0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1)),
			0 2px 8px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.digit-inputs-container {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		margin: 1rem 0;
	}

	.digit-input {
		width: 3rem;
		height: 3rem;
		text-align: center;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Courier New', monospace;
		font-size: 1.375rem;
		font-weight: 700;
		border: 2px solid #3a3a3a;
		border-radius: 10px;
		background: #282828;
		color: #ffffff;
		transition: all 0.3s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		letter-spacing: 0;
	}

	.digit-input:focus {
		outline: none;
		border-color: var(--accent-color, #3b82f6);
		background: #2a2a2a;
		box-shadow:
			0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1)),
			0 2px 8px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.digit-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.twofa-footer {
		margin-top: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.backup-link {
		background: none;
		border: none;
		color: var(--accent-on-surface, var(--accent-color, #3b82f6));
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
		transition: all 0.2s ease;
		padding: 0;
		letter-spacing: -0.025em;
	}

	.backup-link:hover {
		color: var(--accent-color-dark, #2563eb);
		text-decoration: none;
	}

	.backup-link:focus {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: 2px;
		border-radius: 2px;
	}

	.footer-links {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.footer-link {
		background: none;
		border: none;
		color: #6b7280;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0;
		transition: all 0.2s ease;
		text-decoration: none;
		letter-spacing: -0.025em;
	}

	.footer-link:hover {
		color: #9ca3af;
	}

	.footer-link:focus {
		outline: 2px solid var(--accent-color, #3b82f6);
		outline-offset: 2px;
		border-radius: 2px;
	}

	@media (max-width: 480px) {
		.login-card {
			max-width: 300px;
		}
	}

	/* Light theme for devices with light preference - must be at the end to override */
	@media (prefers-color-scheme: light) {
		.login-container {
			background: #f8fafc !important;
		}

		.login-card {
			background: #ffffff !important;
			border-color: #e2e8f0 !important;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
		}

		.form-input {
			background: #ffffff !important;
			border-color: #d1d5db !important;
			color: #1f2937 !important;
		}

		.form-input::placeholder {
			color: #9ca3af !important;
		}

		.form-input:focus {
			border-color: var(--accent-color, #3b82f6) !important;
			background: #ffffff !important;
			box-shadow:
				0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1)),
				0 2px 8px rgba(0, 0, 0, 0.05) !important;
		}

		.error-message {
			background: rgba(239, 68, 68, 0.05) !important;
			border-color: rgba(239, 68, 68, 0.2) !important;
			border-left-color: #ef4444 !important;
			color: #dc2626 !important;
		}

		/* 2FA form styling for light theme */
		.twofa-title h2 {
			color: #1f2937 !important;
		}

		.user-badge {
			background: #f8fafc !important;
			border-color: #e2e8f0 !important;
		}

		.user-label {
			color: #6b7280 !important;
		}

		.username {
			color: #1f2937 !important;
		}

		.input-label {
			color: #6b7280 !important;
		}

		.backup-input {
			background: #ffffff !important;
			border-color: #d1d5db !important;
			color: #1f2937 !important;
		}

		.backup-input:focus {
			border-color: var(--accent-color, #3b82f6) !important;
			background: #ffffff !important;
			box-shadow:
				0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1)),
				0 2px 8px rgba(0, 0, 0, 0.05) !important;
		}

		.backup-link {
			color: var(--accent-on-surface, var(--accent-color, #3b82f6)) !important;
		}

		.backup-link:hover {
			color: var(--accent-color-dark, #2563eb) !important;
		}

		.footer-link {
			color: #6b7280 !important;
		}

		.footer-link:hover {
			color: #374151 !important;
		}

		.digit-input {
			background: #ffffff !important;
			border-color: #d1d5db !important;
			color: #1f2937 !important;
		}

		.digit-input:focus {
			border-color: var(--accent-color, #3b82f6) !important;
			background: #ffffff !important;
			box-shadow:
				0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1)),
				0 2px 8px rgba(0, 0, 0, 0.05) !important;
		}
	}
</style>
