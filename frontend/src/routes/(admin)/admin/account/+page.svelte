<script lang="ts">
	import { user } from '$lib/admin/stores/auth';
	import { accountService } from '$lib/admin/services/account';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
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

	// Initialize form data
	onMount(() => {
		if ($user) {
			usernameForm.newUsername = $user.username;
		}
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
				description: error instanceof Error ? error.message : 'Please try again'
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
				description: error instanceof Error ? error.message : 'Please try again'
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

<div class="account-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-text">
				<h1>Account Settings</h1>
				<p>Manage your profile and security settings</p>
			</div>
		</div>
	</div>

	<div class="account-content">
		<!-- Account Overview Card -->
		<div class="account-card">
			<div class="card-header">
				<div class="card-icon">
					<User size={24} />
				</div>
				<div class="card-title">
					<h2>Account Information</h2>
					<p>Your basic account details</p>
				</div>
			</div>
			
			<div class="card-content">
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
		</div>

		<!-- Username Management Card -->
		<div class="account-card">
			<div class="card-header">
				<div class="card-title">
					<h2>Username</h2>
					<p>Change your login username</p>
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

		<!-- Password Management Card -->
		<div class="account-card">
			<div class="card-header">
				<div class="card-title">
					<h2>Password</h2>
					<p>Change your login password</p>
				</div>
				{#if !isEditingPassword}
					<button class="edit-button" onclick={() => isEditingPassword = true}>
						Change Password
					</button>
				{/if}
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

		<!-- Two-Factor Authentication Card -->
		<div class="account-card">
			<div class="card-content">
				<TotpManager />
			</div>
		</div>
	</div>
</div>

<style>
	.account-page {
		padding: 2rem;
		max-width: 900px;
		margin: 0 auto;
		min-height: calc(100vh - 4rem);
	}

	.page-header {
		margin-bottom: 3rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header-text h1 {
		color: var(--text-primary);
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.75rem 0;
		background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-color) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.header-text p {
		color: var(--text-secondary);
		margin: 0;
		font-size: 1.125rem;
		font-weight: 400;
	}

	/* Light mode support */
	:global(html:not(.dark)) .header-text h1 {
		color: #212529;
	}

	:global(html:not(.dark)) .header-text p {
		color: #6c757d;
	}

	.account-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.account-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 16px;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition: all 0.3s ease;
	}

	.account-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
	}

	/* Light mode support */
	:global(html:not(.dark)) .account-card {
		background: #f8f9fa;
		border-color: #e9ecef;
	}

	.card-header {
		padding: 2rem 2rem 1.5rem 2rem;
		border-bottom: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
	}

	/* Light mode support */
	:global(html:not(.dark)) .card-header {
		border-bottom-color: #e9ecef;
	}

	.card-icon {
		color: var(--accent-color);
		background: var(--accent-color-light, rgba(59, 130, 246, 0.1));
		padding: 0.75rem;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-title {
		flex: 1;
		margin-left: 1rem;
	}

	.card-title h2 {
		color: var(--text-primary);
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		letter-spacing: -0.025em;
	}

	.card-title p {
		color: var(--text-secondary);
		margin: 0;
		font-size: 0.95rem;
		font-weight: 400;
	}

	/* Light mode support */
	:global(html:not(.dark)) .card-title h2 {
		color: #212529;
	}

	:global(html:not(.dark)) .card-title p {
		color: #6c757d;
	}

	.edit-button {
		background: var(--accent-color);
		color: var(--accent-color-contrast, white);
		border: none;
		border-radius: 10px;
		padding: 0.75rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		position: relative;
		overflow: hidden;
	}

	.edit-button::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s;
	}

	.edit-button:hover::before {
		left: 100%;
	}

	.edit-button:hover {
		background: var(--accent-color-dark);
		color: var(--accent-color-dark-contrast, white);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.edit-button:focus {
		outline: 2px solid var(--accent-color);
		outline-offset: 2px;
	}

	.card-content {
		padding: 2rem;
	}

	.account-overview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
	}

	.overview-item {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.5rem;
		background: var(--bg-tertiary);
		border-radius: 12px;
		border: 1px solid var(--border-color);
		transition: all 0.3s ease;
	}

	.overview-item:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.overview-label {
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Light mode support */
	:global(html:not(.dark)) .overview-label {
		color: #6c757d;
	}

	.overview-value {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.username {
		color: var(--text-primary);
		font-weight: 700;
		font-size: 1.25rem;
		letter-spacing: -0.025em;
	}

	/* Light mode support */
	:global(html:not(.dark)) .username {
		color: #212529;
	}

	.account-type {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: 12px;
		font-size: 0.95rem;
		font-weight: 600;
		letter-spacing: -0.025em;
		transition: all 0.3s ease;
	}

	.account-type.admin {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
		color: #16a34a;
		border: 1px solid rgba(34, 197, 94, 0.3);
		box-shadow: 0 2px 4px rgba(34, 197, 94, 0.1);
	}

	.account-type.user {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
		color: #2563eb;
		border: 1px solid rgba(59, 130, 246, 0.3);
		box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
	}

	.current-value {
		color: var(--text-secondary);
		padding: 1.5rem;
		background: var(--bg-tertiary);
		border-radius: 12px;
		border: 1px solid var(--border-color);
	}

	.current-value strong {
		color: var(--text-primary);
		font-weight: 700;
	}

	/* Light mode support */
	:global(html:not(.dark)) .current-value {
		color: #6c757d;
		background: #f1f3f4;
	}

	:global(html:not(.dark)) .current-value strong {
		color: #212529;
	}

	.password-note {
		margin-top: 0.75rem;
		font-size: 0.875rem;
		color: var(--text-muted);
		font-style: italic;
	}

	/* Light mode support */
	:global(html:not(.dark)) .password-note {
		color: #9ca3af;
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
		background: var(--bg-tertiary);
		border-radius: 12px;
		border: 1px solid var(--border-color);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.form-group label {
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-weight: 600;
		letter-spacing: -0.025em;
	}

	/* Light mode support */
	:global(html:not(.dark)) .form-group label {
		color: #374151;
	}

	:global(html:not(.dark)) .edit-form {
		background: #f8fafc;
		border-color: #e2e8f0;
	}

	.form-input {
		background: var(--bg-primary);
		border: 2px solid var(--border-color);
		border-radius: 10px;
		padding: 1rem 1.25rem;
		color: var(--text-primary);
		font-size: 0.95rem;
		font-weight: 500;
		transition: all 0.3s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--accent-color);
		box-shadow: 0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1)), 0 2px 8px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
	}

	.form-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-input.checking {
		border-color: #eab308;
	}

	.form-input.available {
		border-color: #22c55e;
	}

	.form-input.unavailable,
	.form-input.error {
		border-color: #ef4444;
	}

	/* Light mode support */
	:global(html:not(.dark)) .form-input {
		background: #ffffff;
		border-color: #d1d5db;
		color: #212529;
	}

	.username-input-group {
		position: relative;
		display: flex;
		align-items: center;
	}

	.username-input-group .form-input {
		padding-right: 2.5rem;
		flex: 1;
	}

	.availability-indicator {
		position: absolute;
		right: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(.availability-indicator .spin) {
		animation: spin 1s linear infinite;
		color: #eab308;
	}

	:global(.availability-indicator .success) {
		color: #22c55e;
	}

	:global(.availability-indicator .error) {
		color: #ef4444;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.availability-message {
		font-size: 0.8rem;
		margin-top: 0.5rem;
		font-weight: 500;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		animation: slideIn 0.3s ease-out;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.availability-message.success {
		color: #16a34a;
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.2);
	}

	.availability-message.error {
		color: #dc2626;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.availability-message.checking {
		color: #ca8a04;
		background: rgba(234, 179, 8, 0.1);
		border: 1px solid rgba(234, 179, 8, 0.2);
	}

	.password-input-group {
		position: relative;
		display: flex;
		align-items: center;
	}

	.password-input-group .form-input {
		padding-right: 2.5rem;
		flex: 1;
	}

	.password-toggle {
		position: absolute;
		right: 0.75rem;
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s ease;
	}

	.password-toggle:hover {
		color: var(--text-primary);
	}

	.password-toggle:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Light mode support */
	:global(html:not(.dark)) .password-toggle {
		color: #6c757d;
	}

	:global(html:not(.dark)) .password-toggle:hover {
		color: #212529;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}

	.cancel-button, .save-button {
		padding: 1rem 2rem;
		border-radius: 10px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		border: none;
		position: relative;
		overflow: hidden;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.cancel-button {
		background: var(--bg-primary);
		color: var(--text-secondary);
		border: 2px solid var(--border-color);
	}

	.cancel-button:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.save-button {
		background: linear-gradient(135deg, var(--accent-color) 0%, var(--accent-color-dark, #2563eb) 100%);
		color: var(--accent-color-contrast, white);
		border: 2px solid var(--accent-color);
	}

	.save-button::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s;
	}

	.save-button:hover::before {
		left: 100%;
	}

	.save-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.cancel-button:disabled,
	.save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.cancel-button:focus,
	.save-button:focus {
		outline: 2px solid var(--accent-color);
		outline-offset: 2px;
	}

	/* Light mode support */
	:global(html:not(.dark)) .cancel-button {
		background: #e5e7eb;
		color: #6c757d;
		border-color: #d1d5db;
	}

	:global(html:not(.dark)) .cancel-button:hover {
		background: #d1d5db;
		color: #212529;
	}

	@media (max-width: 768px) {
		.account-page {
			padding: 1rem;
		}

		.page-header {
			margin-bottom: 2rem;
			padding-bottom: 1rem;
		}

		.header-text h1 {
			font-size: 2rem;
		}

		.header-text p {
			font-size: 1rem;
		}

		.account-content {
			gap: 1.5rem;
		}

		.card-header {
			padding: 1.5rem 1.5rem 1rem 1.5rem;
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.card-title {
			margin-left: 0;
		}

		.card-content {
			padding: 1.5rem;
		}

		.account-overview {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.overview-item {
			padding: 1rem;
		}

		.edit-form {
			padding: 1rem;
			gap: 1rem;
		}

		.form-actions {
			flex-direction: column;
			gap: 0.75rem;
		}

		.cancel-button,
		.save-button {
			width: 100%;
			padding: 0.875rem 1.5rem;
		}

		.username-input-group .form-input {
			padding-right: 2.25rem;
		}

		.availability-indicator {
			right: 0.5rem;
		}
	}
</style>
