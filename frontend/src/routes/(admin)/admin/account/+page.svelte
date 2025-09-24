<script lang="ts">
	import { user } from '$lib/admin/stores/auth';
	import { accountService } from '$lib/admin/services/account';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { getErrorMessage } from '$lib/shared/utils/errorUtils';
	import { User, Shield, Eye, EyeOff, Check, X, Loader2 } from 'lucide-svelte';
	import TotpManager from '$lib/admin/components/totp/TotpManager.svelte';

	// Form states
	let isEditingUsername = $state(false);
	let isEditingPassword = $state(false);
	
	// Form data
	let usernameForm = $state({
		newUsername: '',
		currentPassword: ''
	});
	
	let passwordForm = $state({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});
	
	// UI states
	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isSubmitting = $state(false);
	
	// Username availability checking
	let usernameAvailability = $state<{
		status: 'idle' | 'checking' | 'available' | 'unavailable' | 'error';
		message: string;
		reason?: 'taken' | 'invalid_format' | 'current_username';
	}>({
		status: 'idle',
		message: ''
	});
	let usernameCheckTimeout: ReturnType<typeof setTimeout> | null = null;

	// TOTP button state
	let totpButtonText = $state('Enable 2FA');
	let totpButtonClass = $state('section-action-button');
	let showRegenerateButton = $state(false);

	// Reactive update of TOTP button state
	$effect(() => {
		// Update button state when component mounts or changes
		if (typeof window !== 'undefined') {
			setTimeout(() => {
				const enableButton = document.querySelector('.totp-manager-container .action-button.enable');
				const disableButton = document.querySelector('.totp-manager-container .action-button.disable');
				const regenerateButton = document.querySelector('.totp-manager-container .action-button.regenerate');
				
				if (enableButton) {
					// 2FA is disabled
					totpButtonText = 'Enable 2FA';
					totpButtonClass = 'section-action-button';
					showRegenerateButton = false;
				} else if (disableButton && regenerateButton) {
					// 2FA is enabled - show disable as primary action
					totpButtonText = 'Disable 2FA';
					totpButtonClass = 'section-action-button disable';
					showRegenerateButton = true;
				}
			}, 100);
		}
	});

	// Initialize form data
	onMount(() => {
		if ($user) {
			usernameForm.newUsername = $user.username;
		}
		
		// Update TOTP button state periodically
		const updateTotpButton = () => {
			const enableButton = document.querySelector('.totp-manager-container .action-button.enable');
			const disableButton = document.querySelector('.totp-manager-container .action-button.disable');
			const regenerateButton = document.querySelector('.totp-manager-container .action-button.regenerate');
			
			if (enableButton) {
				// 2FA is disabled
				totpButtonText = 'Enable 2FA';
				totpButtonClass = 'section-action-button';
				showRegenerateButton = false;
			} else if (disableButton && regenerateButton) {
				// 2FA is enabled - show disable as primary action
				totpButtonText = 'Disable 2FA';
				totpButtonClass = 'section-action-button disable';
				showRegenerateButton = true;
			}
		};

		// Check every 500ms until buttons are loaded
		const interval = setInterval(() => {
			updateTotpButton();
			// Stop checking once we've detected the state or after 10 seconds
			if (document.querySelector('.totp-manager-container .action-button')) {
				clearInterval(interval);
			}
		}, 500);

		// Clean up interval after 10 seconds
		setTimeout(() => clearInterval(interval), 10000);
	});

	// Debounced username availability checking
	function checkUsernameAvailability(username: string) {
		// Clear previous timeout
		if (usernameCheckTimeout) {
			clearTimeout(usernameCheckTimeout);
		}

		// Reset status if empty or same as current username
		if (!username.trim() || username === $user?.username) {
			usernameAvailability = {
				status: 'idle',
				message: ''
			};
			return;
		}

		// Set checking status
		usernameAvailability = {
			status: 'checking',
			message: 'Checking availability...'
		};

		// Debounce the API call
		usernameCheckTimeout = setTimeout(async () => {
			try {
				const result = await accountService.checkUsernameAvailability(username);
				
				usernameAvailability = {
					status: result.available ? 'available' : 'unavailable',
					message: result.message,
					reason: result.reason
				};
			} catch (error) {
				usernameAvailability = {
					status: 'error',
					message: 'Failed to check availability'
				};
			}
		}, 500); // 500ms debounce
	}

	// Handle username input changes
	function handleUsernameInput(event: Event) {
		const target = event.target as HTMLInputElement;
		usernameForm.newUsername = target.value;
		
		// Only check availability when editing
		if (isEditingUsername) {
			checkUsernameAvailability(target.value);
		}
	}

	// Handle username change
	async function handleUsernameChange(event: Event) {
		event.preventDefault();
		
		if (!usernameForm.newUsername.trim()) {
			toast.error('Username cannot be empty');
			return;
		}
		
		if (usernameForm.newUsername === $user?.username) {
			toast.info('Username is the same as current');
			isEditingUsername = false;
			return;
		}
		
		if (!usernameForm.currentPassword) {
			toast.error('Current password is required');
			return;
		}
		
		// Check if username is available before submitting
		if (usernameAvailability.status === 'unavailable') {
			toast.error('Please choose a different username', {
				description: usernameAvailability.message
			});
			return;
		}
		
		// If still checking, wait a moment and try again
		if (usernameAvailability.status === 'checking') {
			toast.info('Please wait while we verify username availability');
			return;
		}
		
		isSubmitting = true;
		
		try {
			const response = await accountService.updateUsername({
				newUsername: usernameForm.newUsername,
				currentPassword: usernameForm.currentPassword
			});
			
			toast.success('Username updated successfully', {
				description: `Changed from "${$user?.username}" to "${usernameForm.newUsername}"`
			});
			
			// Reset form
			usernameForm.currentPassword = '';
			isEditingUsername = false;
			
		} catch (error) {
			console.error('Username update failed:', error);
			toast.error('Failed to update username', {
				description: getErrorMessage(error, 'Please try again')
			});
		} finally {
			isSubmitting = false;
		}
	}

	// Handle password change
	async function handlePasswordChange(event: Event) {
		event.preventDefault();
		
		if (!passwordForm.currentPassword) {
			toast.error('Current password is required');
			return;
		}
		
		if (!passwordForm.newPassword) {
			toast.error('New password is required');
			return;
		}
		
		if (passwordForm.newPassword.length < 6) {
			toast.error('New password must be at least 6 characters');
			return;
		}
		
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			toast.error('Passwords do not match');
			return;
		}
		
		if (passwordForm.newPassword === passwordForm.currentPassword) {
			toast.error('New password must be different from current password');
			return;
		}
		
		isSubmitting = true;
		
		try {
			const response = await accountService.updatePassword({
				currentPassword: passwordForm.currentPassword,
				newPassword: passwordForm.newPassword
			});
			
			toast.success('Password updated successfully', {
				description: 'Your password has been changed'
			});
			
			// Reset form
			passwordForm = {
				currentPassword: '',
				newPassword: '',
				confirmPassword: ''
			};
			isEditingPassword = false;
			
		} catch (error) {
			console.error('Password update failed:', error);
			toast.error('Failed to update password', {
				description: getErrorMessage(error, 'Please try again')
			});
		} finally {
			isSubmitting = false;
		}
	}

	// Cancel username editing
	function cancelUsernameEdit() {
		usernameForm.newUsername = $user?.username || '';
		usernameForm.currentPassword = '';
		isEditingUsername = false;
		
		// Clear timeout and reset availability status
		if (usernameCheckTimeout) {
			clearTimeout(usernameCheckTimeout);
			usernameCheckTimeout = null;
		}
		usernameAvailability = {
			status: 'idle',
			message: ''
		};
	}

	// Cancel password editing
	function cancelPasswordEdit() {
		passwordForm = {
			currentPassword: '',
			newPassword: '',
			confirmPassword: ''
		};
		showCurrentPassword = false;
		showNewPassword = false;
		showConfirmPassword = false;
		isEditingPassword = false;
	}
</script>

<svelte:head>
	<title>Account - Admin Panel</title>
	<meta name="description" content="Manage your account settings and profile information." />
</svelte:head>

<div class="settings-page">
	<div class="page-header">
		<div class="header-content">
			<h1 class="page-title">Account Settings</h1>
			<p>Manage your profile and security settings</p>
		</div>
	</div>

	<div class="page-content">
		<!-- Account Overview Section -->
		<div class="settings-section">
			<div class="section-header">
				<div class="section-title-with-icon">
					<User size={24} />
					<h2 class="section-title">Account Information</h2>
				</div>
				<p class="section-description">Your basic account details</p>
			</div>
			
			<div class="account-overview">
				<div class="overview-item">
					<span class="overview-label">Username</span>
					<div class="overview-value">
						<span class="username">{$user?.username || 'Loading...'}</span>
					</div>
				</div>
				
				<div class="overview-item">
					<span class="overview-label">Account Type</span>
					<div class="overview-value">
						<div class="account-type" class:admin={$user?.isAdmin} class:user={!$user?.isAdmin}>
							<Shield size={16} />
							<span>{$user?.isAdmin ? 'Administrator' : 'User'}</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Username Management Section -->
		<div class="settings-section">
			<div class="section-header">
				<div class="section-title-with-actions">
					<div>
						<h2 class="section-title">Username</h2>
						<p class="section-description">Change your login username</p>
					</div>
					{#if !isEditingUsername}
						<button class="edit-button" onclick={() => {
							isEditingUsername = true;
							// Check availability of current value when starting to edit
							if (usernameForm.newUsername !== $user?.username) {
								checkUsernameAvailability(usernameForm.newUsername);
							}
						}}>
							Edit
						</button>
					{/if}
				</div>
			</div>
			
			<div class="card-content">
				{#if isEditingUsername}
					<form onsubmit={handleUsernameChange} class="edit-form">
						<div class="form-group">
							<label for="new-username">New Username</label>
							<div class="username-input-group">
								<input
									id="new-username"
									type="text"
									bind:value={usernameForm.newUsername}
									oninput={handleUsernameInput}
									placeholder="Enter new username"
									required
									disabled={isSubmitting}
									class="form-input"
									class:checking={usernameAvailability.status === 'checking'}
									class:available={usernameAvailability.status === 'available'}
									class:unavailable={usernameAvailability.status === 'unavailable'}
									class:error={usernameAvailability.status === 'error'}
								/>
								<div class="availability-indicator">
									{#if usernameAvailability.status === 'checking'}
										<Loader2 size={16} class="spin" />
									{:else if usernameAvailability.status === 'available'}
										<Check size={16} class="success" />
									{:else if usernameAvailability.status === 'unavailable' || usernameAvailability.status === 'error'}
										<X size={16} class="error" />
									{/if}
								</div>
							</div>
							{#if usernameAvailability.message}
								<div class="availability-message" 
									class:success={usernameAvailability.status === 'available'}
									class:error={usernameAvailability.status === 'unavailable' || usernameAvailability.status === 'error'}
									class:checking={usernameAvailability.status === 'checking'}>
									{usernameAvailability.message}
								</div>
							{/if}
						</div>
						
						<div class="form-group">
							<label for="current-password-username">Current Password</label>
							<div class="password-input-group">
								<input
									id="current-password-username"
									type={showCurrentPassword ? 'text' : 'password'}
									bind:value={usernameForm.currentPassword}
									placeholder="Enter current password"
									required
									disabled={isSubmitting}
									class="form-input"
								/>
								<button
									type="button"
									class="password-toggle"
									onclick={() => showCurrentPassword = !showCurrentPassword}
									disabled={isSubmitting}
								>
									{#if showCurrentPassword}
										<EyeOff size={16} />
									{:else}
										<Eye size={16} />
									{/if}
								</button>
							</div>
						</div>
						
						<div class="form-actions">
							<button type="button" class="cancel-button" onclick={cancelUsernameEdit} disabled={isSubmitting}>
								Cancel
							</button>
							<button type="submit" class="save-button" disabled={isSubmitting}>
								{isSubmitting ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
					</form>
				{:else}
					<div class="current-value">
						<span>Current username: <strong>{$user?.username}</strong></span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Password Management Section -->
		<div class="settings-section">
			<div class="section-header">
				<div class="section-title-with-actions">
					<div>
						<h2 class="section-title">Password</h2>
						<p class="section-description">Change your login password</p>
					</div>
					{#if !isEditingPassword}
						<button class="edit-button" onclick={() => isEditingPassword = true}>
							Change Password
						</button>
					{/if}
				</div>
			</div>
			
			<div class="card-content">
				{#if isEditingPassword}
					<form onsubmit={handlePasswordChange} class="edit-form">
						<div class="form-group">
							<label for="current-password">Current Password</label>
							<div class="password-input-group">
								<input
									id="current-password"
									type={showCurrentPassword ? 'text' : 'password'}
									bind:value={passwordForm.currentPassword}
									placeholder="Enter current password"
									required
									disabled={isSubmitting}
									class="form-input"
								/>
								<button
									type="button"
									class="password-toggle"
									onclick={() => showCurrentPassword = !showCurrentPassword}
									disabled={isSubmitting}
								>
									{#if showCurrentPassword}
										<EyeOff size={16} />
									{:else}
										<Eye size={16} />
									{/if}
								</button>
							</div>
						</div>
						
						<div class="form-group">
							<label for="new-password">New Password</label>
							<div class="password-input-group">
								<input
									id="new-password"
									type={showNewPassword ? 'text' : 'password'}
									bind:value={passwordForm.newPassword}
									placeholder="Enter new password (min 6 characters)"
									required
									minlength="6"
									disabled={isSubmitting}
									class="form-input"
								/>
								<button
									type="button"
									class="password-toggle"
									onclick={() => showNewPassword = !showNewPassword}
									disabled={isSubmitting}
								>
									{#if showNewPassword}
										<EyeOff size={16} />
									{:else}
										<Eye size={16} />
									{/if}
								</button>
							</div>
						</div>
						
						<div class="form-group">
							<label for="confirm-password">Confirm New Password</label>
							<div class="password-input-group">
								<input
									id="confirm-password"
									type={showConfirmPassword ? 'text' : 'password'}
									bind:value={passwordForm.confirmPassword}
									placeholder="Confirm new password"
									required
									disabled={isSubmitting}
									class="form-input"
								/>
								<button
									type="button"
									class="password-toggle"
									onclick={() => showConfirmPassword = !showConfirmPassword}
									disabled={isSubmitting}
								>
									{#if showConfirmPassword}
										<EyeOff size={16} />
									{:else}
										<Eye size={16} />
									{/if}
								</button>
							</div>
						</div>
						
						<div class="form-actions">
							<button type="button" class="cancel-button" onclick={cancelPasswordEdit} disabled={isSubmitting}>
								Cancel
							</button>
							<button type="submit" class="save-button" disabled={isSubmitting}>
								{isSubmitting ? 'Updating...' : 'Update Password'}
							</button>
						</div>
					</form>
				{:else}
					<div class="current-value">
						<span>Last changed: Recently</span>
						<p class="password-note">Choose a strong password with at least 6 characters.</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Two-Factor Authentication Section -->
		<div class="settings-section">
			<div class="section-header">
				<div class="section-title-with-actions">
					<div class="section-title-with-icon">
						<Shield size={24} />
						<h2 class="section-title">Two-Factor Authentication</h2>
					</div>
					<div class="section-actions">
						{#if showRegenerateButton}
							<button 
								class="section-action-button secondary"
								onclick={() => {
									const regenerateButton = document.querySelector('.totp-manager-container .action-button.regenerate');
									if (regenerateButton) {
										(regenerateButton as HTMLButtonElement).click();
									}
								}}
							>
								<span class="button-text">Regenerate Codes</span>
							</button>
						{/if}
						<button 
							class={totpButtonClass}
							onclick={() => {
								// This will be handled by the TotpManager component
								const enableButton = document.querySelector('.totp-manager-container .action-button.enable');
								const disableButton = document.querySelector('.totp-manager-container .action-button.disable');
								if (enableButton) {
									(enableButton as HTMLButtonElement).click();
								} else if (disableButton) {
									(disableButton as HTMLButtonElement).click();
								}
							}}
						>
							<span class="button-text">{totpButtonText}</span>
						</button>
					</div>
				</div>
				<p class="section-description">Secure your account with 2FA</p>
			</div>
			<div class="totp-manager-container">
				<TotpManager />
			</div>
		</div>
	</div>
</div>

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

	.header-content p {
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
		font-size: 1rem;
	}

	:global(html:not(.dark)) .header-content h1 {
		color: #1f2937;
	}

	:global(html:not(.dark)) .header-content p {
		color: rgba(0, 0, 0, 0.6);
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

	.section-title-with-icon {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;
	}

	.section-title-with-actions {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 8px;
	}

	.section-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.section-action-button {
		background: var(--accent-color, #3b82f6);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 10px 16px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.section-action-button:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.section-action-button:active {
		transform: translateY(0);
	}

	.section-action-button.disable {
		background: #ef4444;
	}

	.section-action-button.disable:hover {
		background: #dc2626;
	}

	.section-action-button.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.section-action-button.secondary:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #ffffff;
		margin: 0;
	}

	:global(html:not(.dark)) .section-title {
		color: #1f2937;
	}

	.section-description {
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
		font-size: 0.9rem;
	}

	:global(html:not(.dark)) .section-description {
		color: rgba(0, 0, 0, 0.6);
	}

	/* Account-specific styles */
	.account-overview {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.overview-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(html:not(.dark)) .overview-item {
		border-bottom-color: rgba(0, 0, 0, 0.1);
	}

	.overview-item:last-child {
		border-bottom: none;
	}

	.overview-label {
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.9rem;
	}

	:global(html:not(.dark)) .overview-label {
		color: rgba(0, 0, 0, 0.7);
	}

	.overview-value {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.username {
		font-weight: 600;
		color: #ffffff;
		font-size: 1rem;
	}

	:global(html:not(.dark)) .username {
		color: #1f2937;
	}

	.account-type {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 12px;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 500;
	}

	.account-type.admin {
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
		border: 1px solid rgba(34, 197, 94, 0.2);
	}

	.account-type.user {
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
		border: 1px solid rgba(59, 130, 246, 0.2);
	}

	.totp-manager-container {
		margin-top: 16px;
		width: 100%;
	}

	/* Completely override TotpManager styling to match settings page */
	:global(.totp-manager-container .totp-manager) {
		max-width: none;
		margin: 0;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
	}

	/* Hide the TotpManager's own header since we have our own */
	:global(.totp-manager-container .manager-header) {
		display: none;
	}

	/* Style the status cards to match settings page */
	:global(.totp-manager-container .status-card) {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 24px;
		margin-bottom: 16px;
		transition: all 0.2s ease;
	}

	:global(html:not(.dark)) .totp-manager-container .status-card {
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.1);
	}

	:global(.totp-manager-container .status-card:hover) {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.15);
	}

	:global(html:not(.dark)) .totp-manager-container .status-card:hover {
		background: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.15);
	}

	/* Style the status info section */
	:global(.totp-manager-container .status-info) {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 20px;
	}

	:global(.totp-manager-container .status-icon) {
		color: var(--accent-color, #3b82f6);
		margin-top: 4px;
	}

	:global(.totp-manager-container .status-info h3) {
		font-size: 1.25rem;
		font-weight: 600;
		color: #ffffff;
		margin: 0 0 8px 0;
	}

	:global(html:not(.dark)) .totp-manager-container .status-info h3 {
		color: #1f2937;
	}

	:global(.totp-manager-container .status-info p) {
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	:global(html:not(.dark)) .totp-manager-container .status-info p {
		color: rgba(0, 0, 0, 0.6);
	}

	/* Style the action buttons */
	:global(.totp-manager-container .action-button) {
		background: var(--accent-color, #3b82f6);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 12px 20px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	:global(.totp-manager-container .action-button:hover) {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	:global(.totp-manager-container .action-button.regenerate) {
		background: #f59e0b;
	}

	:global(.totp-manager-container .action-button.disable) {
		background: #ef4444;
	}

	/* Hide the original action buttons since we have them in the header */
	:global(.totp-manager-container .status-actions) {
		display: none;
	}

	/* Hide loading state styling */
	:global(.totp-manager-container .loading-state) {
		text-align: center;
		padding: 40px 20px;
		color: rgba(255, 255, 255, 0.7);
	}

	:global(html:not(.dark)) .totp-manager-container .loading-state {
		color: rgba(0, 0, 0, 0.6);
	}

	:global(.totp-manager-container .loading-state .spin) {
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Form styles */
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding: 20px;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(10px);
	}

	:global(html:not(.dark)) .edit-form {
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.08);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form-group label {
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		font-size: 0.9rem;
		margin-bottom: 4px;
		letter-spacing: 0.025em;
		text-transform: uppercase;
		font-size: 0.8rem;
	}

	:global(html:not(.dark)) .form-group label {
		color: rgba(0, 0, 0, 0.85);
	}

	/* Input group containers */
	.password-input-group, .username-input-group {
		position: relative;
		display: flex;
		align-items: center;
	}

	.form-group input {
		padding: 14px 16px;
		border: 2px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.08);
		color: #ffffff;
		font-size: 1rem;
		transition: all 0.3s ease;
		width: 100%;
		backdrop-filter: blur(10px);
	}

	:global(html:not(.dark)) .form-group input {
		border-color: rgba(0, 0, 0, 0.15);
		background: rgba(0, 0, 0, 0.03);
		color: #1f2937;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--accent-color, #3b82f6);
		box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
		background: rgba(255, 255, 255, 0.12);
		transform: translateY(-1px);
	}

	:global(html:not(.dark)) .form-group input:focus {
		background: rgba(0, 0, 0, 0.05);
	}

	.form-group input:hover {
		border-color: rgba(255, 255, 255, 0.25);
		background: rgba(255, 255, 255, 0.1);
	}

	:global(html:not(.dark)) .form-group input:hover {
		border-color: rgba(0, 0, 0, 0.25);
		background: rgba(0, 0, 0, 0.05);
	}

	.form-group input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background: rgba(255, 255, 255, 0.03);
	}

	.form-group input::placeholder {
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}

	:global(html:not(.dark)) .form-group input::placeholder {
		color: rgba(0, 0, 0, 0.4);
	}

	/* Password toggle button */
	.password-toggle {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		padding: 8px;
		border-radius: 6px;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(html:not(.dark)) .password-toggle {
		color: rgba(0, 0, 0, 0.5);
	}

	.password-toggle:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
	}

	:global(html:not(.dark)) .password-toggle:hover {
		color: rgba(0, 0, 0, 0.8);
		background: rgba(0, 0, 0, 0.05);
	}

	.password-toggle:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Username availability indicator */
	.availability-indicator {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.availability-indicator .success {
		color: #22c55e;
	}

	.availability-indicator .error {
		color: #ef4444;
	}

	.availability-indicator .spin {
		animation: spin 1s linear infinite;
	}

	/* Input state classes */
	.form-input.checking {
		border-color: #f59e0b;
		background: rgba(245, 158, 11, 0.05);
	}

	.form-input.available {
		border-color: #22c55e;
		background: rgba(34, 197, 94, 0.05);
	}

	.form-input.unavailable {
		border-color: #ef4444;
		background: rgba(239, 68, 68, 0.05);
	}

	.form-input.error {
		border-color: #ef4444;
		background: rgba(239, 68, 68, 0.05);
	}

	.form-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		margin-top: 8px;
	}

	.edit-button, .save-button, .cancel-button {
		padding: 8px 16px;
		border-radius: 6px;
		font-weight: 500;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
	}

	.edit-button {
		background: var(--accent-color, #3b82f6);
		color: white;
	}

	.edit-button:hover {
		opacity: 0.9;
	}

	.save-button {
		background: #22c55e;
		color: white;
	}

	.save-button:hover {
		background: #16a34a;
	}

	.cancel-button {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	:global(html:not(.dark)) .cancel-button {
		background: rgba(0, 0, 0, 0.05);
		color: rgba(0, 0, 0, 0.7);
		border-color: rgba(0, 0, 0, 0.2);
	}

	.current-value {
		padding: 16px 0;
		color: rgba(255, 255, 255, 0.8);
	}

	:global(html:not(.dark)) .current-value {
		color: rgba(0, 0, 0, 0.7);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.settings-page {
			padding: 16px;
		}

		.settings-section {
			padding: 20px;
		}

		.section-title-with-actions {
			flex-direction: column;
			gap: 16px;
			align-items: flex-start;
		}

		.form-actions {
			flex-direction: column;
		}

		/* TOTP section responsive adjustments */
		:global(.totp-manager-container .status-card) {
			padding: 16px;
			margin-bottom: 12px;
		}

		:global(.totp-manager-container .status-info) {
			flex-direction: column;
			gap: 12px;
		}

		:global(.totp-manager-container .status-actions) {
			flex-direction: column;
		}

		:global(.totp-manager-container .action-button) {
			width: 100%;
			justify-content: center;
		}
	}
</style>
