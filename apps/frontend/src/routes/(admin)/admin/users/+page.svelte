<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import {
		Plus,
		Edit,
		Trash2,
		Shield,
		User as UserIcon,
		X,
		Check,
		Eye,
		EyeOff,
		Key,
		Lock,
		UserCircle
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import {
		userManagementService,
		type User,
		type CreateUserData,
		type UpdateUserData
	} from '$lib/admin/services/userManagement';
	import { user } from '$lib/admin/stores/auth';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';

	let users = $state<User[]>([]);
	let loading = $state(true);
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteConfirm = $state(false);
	let selectedUser = $state<User | null>(null);
	let deletingUserId = $state<string | null>(null);

	// Form states
	let addForm = $state<CreateUserData>({
		username: '',
		password: '',
		isAdmin: false
	});

	let editForm = $state<UpdateUserData & { passwordConfirm?: string; isAdmin: boolean }>({
		username: '',
		password: '',
		isAdmin: false,
		passwordConfirm: ''
	});

	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let resetPasswordInEdit = $state(false);
	let reset2FAInEdit = $state(false);
	let isSubmitting = $state(false);

	onMount(async () => {
		await loadUsers();
	});

	async function loadUsers() {
		try {
			loading = true;
			users = await userManagementService.getAllUsers();
		} catch (err) {
			logger.error('Error loading users:', err);
			toast.error('Failed to load users', {
				description: err instanceof Error ? err.message : 'Please try refreshing the page'
			});
		} finally {
			loading = false;
		}
	}

	function openAddModal() {
		addForm = { username: '', password: '', isAdmin: false };
		showAddModal = true;
	}

	function closeAddModal() {
		showAddModal = false;
		addForm = { username: '', password: '', isAdmin: false };
	}

	async function handleAddUser() {
		if (!addForm.username || !addForm.password) {
			toast.error('Validation failed', {
				description: 'Username and password are required'
			});
			return;
		}

		try {
			isSubmitting = true;
			await userManagementService.createUser(addForm);
			toast.success('User created', {
				description: `User "${addForm.username}" has been created successfully`
			});
			closeAddModal();
			await loadUsers();
		} catch (err) {
			logger.error('Error creating user:', err);
			toast.error('Failed to create user', {
				description: err instanceof Error ? err.message : 'Please try again'
			});
		} finally {
			isSubmitting = false;
		}
	}

	function openEditModal(user: User) {
		selectedUser = user;
		editForm = {
			username: user.username,
			isAdmin: user.isAdmin ?? false,
			password: '',
			passwordConfirm: ''
		};
		resetPasswordInEdit = false;
		reset2FAInEdit = false;
		showEditModal = true;
	}

	function closeEditModal() {
		showEditModal = false;
		selectedUser = null;
		editForm = { username: '', isAdmin: false, password: '', passwordConfirm: '' };
		resetPasswordInEdit = false;
		reset2FAInEdit = false;
		showPassword = false;
		showConfirmPassword = false;
	}

	async function handleEditUser() {
		if (!selectedUser || !editForm.username) {
			toast.error('Validation failed', {
				description: 'Username is required'
			});
			return;
		}

		if (resetPasswordInEdit) {
			if (!editForm.password) {
				toast.error('Validation failed', {
					description: 'New password is required when resetting password'
				});
				return;
			}
			if (editForm.password !== editForm.passwordConfirm) {
				toast.error('Validation failed', {
					description: 'Passwords do not match'
				});
				return;
			}
		}

		try {
			isSubmitting = true;

			if (resetPasswordInEdit && editForm.password) {
				await userManagementService.resetPassword(selectedUser.id, editForm.password);
			}

			if (reset2FAInEdit) {
				await userManagementService.reset2FA(selectedUser.id);
			}

			// Update user data
			const updateData: UpdateUserData = {
				username: editForm.username,
				isAdmin: editForm.isAdmin
			};
			if (editForm.password && !resetPasswordInEdit) {
				updateData.password = editForm.password;
			}

			await userManagementService.updateUser(selectedUser.id, updateData);

			toast.success('User updated', {
				description: `User "${editForm.username}" has been updated successfully`
			});
			closeEditModal();
			await loadUsers();
		} catch (err) {
			logger.error('Error updating user:', err);
			toast.error('Failed to update user', {
				description: err instanceof Error ? err.message : 'Please try again'
			});
		} finally {
			isSubmitting = false;
		}
	}

	function confirmDelete(userToDelete: User) {
		const currentUser = $user;
		if (userToDelete.id === currentUser?.id) {
			toast.error('Cannot delete your own account', {
				description: 'You cannot delete the account you are currently logged in with'
			});
			return;
		}
		selectedUser = userToDelete;
		deletingUserId = userToDelete.id;
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		selectedUser = null;
		deletingUserId = null;
	}

	async function handleDelete() {
		if (!deletingUserId) return;

		try {
			isSubmitting = true;
			const userToDelete = users.find((u) => u.id === deletingUserId);
			await userManagementService.deleteUser(deletingUserId);
			toast.success('User deleted', {
				description: userToDelete
					? `User "${userToDelete.username}" has been deleted`
					: 'The user has been deleted'
			});
			cancelDelete();
			await loadUsers();
		} catch (err) {
			logger.error('Error deleting user:', err);
			toast.error('Failed to delete user', {
				description: err instanceof Error ? err.message : 'Please try again'
			});
		} finally {
			isSubmitting = false;
		}
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>{adminPageTitle('Users')}</title>
	<meta name="description" content="Manage users and their accounts" />
</svelte:head>

<div class="users-page">
	<div class="header">
		<div>
			<h1>User Management</h1>
			<p class="subtitle">Manage user accounts and permissions</p>
		</div>
		<button class="create-button" onclick={openAddModal}>
			<Plus size={20} />
			Add User
		</button>
	</div>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading users...</p>
		</div>
	{:else if users.length === 0}
		<div class="empty-state">
			<UserIcon size={48} />
			<p>No users found</p>
			<button onclick={openAddModal}>Add your first user</button>
		</div>
	{:else}
		<div class="users-table-container">
			<table class="users-table">
				<thead>
					<tr>
						<th>Username</th>
						<th>Role</th>
						<th>2FA</th>
						<th>Created</th>
						<th class="actions-column">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each users as userItem (userItem.id)}
						<tr>
							<td class="username-cell">
								<div class="username-content">
									<span class="username">{userItem.username}</span>
									{#if userItem.id === $user?.id}
										<span class="current-user-badge">You</span>
									{/if}
								</div>
							</td>
							<td>
								<div class="role-badge" class:admin={userItem.isAdmin}>
									{#if userItem.isAdmin}
										<Shield size={14} />
										Admin
									{:else}
										<UserIcon size={14} />
										User
									{/if}
								</div>
							</td>
							<td>
								{#if userItem.totpEnabled}
									<span class="totp-badge enabled">
										<Check size={14} />
										Enabled
									</span>
								{:else}
									<span class="totp-badge disabled">
										<X size={14} />
										Disabled
									</span>
								{/if}
							</td>
							<td class="date-cell">{formatDate(userItem.createdAt)}</td>
							<td class="actions-cell">
								<div class="action-buttons">
									<button
										class="action-button edit"
										onclick={() => openEditModal(userItem)}
										title="Edit user"
									>
										<Edit size={16} />
									</button>
									<button
										class="action-button delete"
										onclick={() => confirmDelete(userItem)}
										disabled={userItem.id === $user?.id}
										title={userItem.id === $user?.id
											? 'Cannot delete your own account'
											: 'Delete user'}
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

<!-- Add User Modal -->
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
				<div class="modal-header-content">
					<div class="modal-header-icon">
						<UserIcon size={24} />
					</div>
					<div>
						<h2>Add New User</h2>
						<p class="modal-subtitle">Create a new user account</p>
					</div>
				</div>
				<button class="close-button" onclick={closeAddModal}>
					<X size={20} />
				</button>
			</div>
			<form
				class="modal-form"
				onsubmit={(e) => {
					e.preventDefault();
					handleAddUser();
				}}
			>
				<div class="form-content">
					<div class="form-group">
						<label for="add-username">Username</label>
						<input
							id="add-username"
							type="text"
							bind:value={addForm.username}
							placeholder="Enter username"
							required
							disabled={isSubmitting}
						/>
					</div>
					<div class="form-group">
						<label for="add-password">Password</label>
						<div class="password-input-group">
							<input
								id="add-password"
								type={showPassword ? 'text' : 'password'}
								bind:value={addForm.password}
								placeholder="Enter password (min 6 characters)"
								required
								disabled={isSubmitting}
							/>
							<button
								type="button"
								class="password-toggle"
								onclick={() => (showPassword = !showPassword)}
								disabled={isSubmitting}
							>
								{#if showPassword}
									<EyeOff size={16} />
								{:else}
									<Eye size={16} />
								{/if}
							</button>
						</div>
					</div>
					<div class="control-item">
						<div class="control-label-group">
							<span class="control-label">Admin Access</span>
							<span class="control-description">Grant administrative privileges to this user</span>
						</div>
						<Toggle bind:checked={addForm.isAdmin} disabled={isSubmitting} />
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
						{isSubmitting ? 'Creating...' : 'Create User'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit User Modal -->
{#if showEditModal && selectedUser}
	<div
		class="modal-overlay"
		onclick={closeEditModal}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				closeEditModal();
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
				<h2>Edit User</h2>
				<button class="close-button" onclick={closeEditModal}>
					<X size={20} />
				</button>
			</div>
			<form
				class="modal-form"
				onsubmit={(e) => {
					e.preventDefault();
					handleEditUser();
				}}
			>
				<!-- User Summary Header -->
				<div class="user-summary">
					<div class="user-avatar">
						<UserCircle size={40} />
					</div>
					<div class="user-info">
						<div class="user-name">{selectedUser.username}</div>
						<div class="user-meta">
							<span class="user-role-badge" class:admin={selectedUser.isAdmin}>
								{selectedUser.isAdmin ? 'Admin' : 'User'}
							</span>
							<span class="user-separator">•</span>
							<span class="user-2fa-status" class:enabled={selectedUser.totpEnabled}>
								{selectedUser.totpEnabled ? '2FA Enabled' : '2FA Disabled'}
							</span>
						</div>
					</div>
				</div>

				<!-- Main Form Content -->
				<div class="form-content">
					<!-- Username Field -->
					<div class="form-group">
						<label for="edit-username">Username</label>
						<input
							id="edit-username"
							type="text"
							bind:value={editForm.username}
							placeholder="Enter username"
							required
							disabled={isSubmitting}
						/>
					</div>

					<!-- Admin Toggle and Change Password Row -->
					<div class="controls-row">
						<!-- Admin Access Toggle -->
						<div class="control-item">
							<div class="control-label-group">
								<span class="control-label">Admin Access</span>
								<span class="control-description">Grant administrative privileges</span>
							</div>
							<Toggle bind:checked={editForm.isAdmin} disabled={isSubmitting} />
						</div>

						<!-- Change Password Button -->
						<button
							type="button"
							class="change-password-button"
							onclick={() => (resetPasswordInEdit = !resetPasswordInEdit)}
							disabled={isSubmitting}
							class:active={resetPasswordInEdit}
						>
							<Key size={18} />
							<span>Change Password</span>
						</button>
					</div>

					<!-- Password Fields (shown when Change Password is enabled) -->
					{#if resetPasswordInEdit}
						<div class="password-reset-fields">
							<div class="form-group">
								<label for="edit-password">New Password</label>
								<div class="password-input-group">
									<input
										id="edit-password"
										type={showPassword ? 'text' : 'password'}
										bind:value={editForm.password}
										placeholder="Enter new password"
										required={resetPasswordInEdit}
										disabled={isSubmitting}
									/>
									<button
										type="button"
										class="password-toggle"
										onclick={() => (showPassword = !showPassword)}
										disabled={isSubmitting}
									>
										{#if showPassword}
											<EyeOff size={16} />
										{:else}
											<Eye size={16} />
										{/if}
									</button>
								</div>
							</div>
							<div class="form-group">
								<label for="edit-password-confirm">Confirm Password</label>
								<div class="password-input-group">
									<input
										id="edit-password-confirm"
										type={showConfirmPassword ? 'text' : 'password'}
										bind:value={editForm.passwordConfirm}
										placeholder="Confirm new password"
										required={resetPasswordInEdit}
										disabled={isSubmitting}
									/>
									<button
										type="button"
										class="password-toggle"
										onclick={() => (showConfirmPassword = !showConfirmPassword)}
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
						</div>
					{/if}

					<!-- Two-Factor Authentication Section -->
					<div class="totp-section">
						<div class="totp-info">
							<span class="totp-status-text">
								{selectedUser.totpEnabled
									? '2FA is enabled for this user'
									: '2FA is not enabled for this user'}
							</span>
						</div>
						{#if selectedUser.totpEnabled}
							<button
								type="button"
								class="reset-2fa-button"
								onclick={() => (reset2FAInEdit = true)}
								disabled={isSubmitting || reset2FAInEdit}
							>
								RESET 2FA
							</button>
						{/if}
					</div>
					{#if reset2FAInEdit}
						<div class="totp-reset-warning">
							<Lock size={16} />
							<span>2FA will be disabled and all backup codes cleared when you save changes</span>
						</div>
					{/if}
				</div>

				<div class="modal-actions">
					<button
						type="button"
						class="cancel-button"
						onclick={closeEditModal}
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button type="submit" class="save-button" disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete user"
	message={selectedUser ? `Delete user “${selectedUser.username}”?` : ''}
	detail="This action cannot be undone."
	variant="danger"
	confirmLabel="Delete user"
	cancelLabel="Cancel"
	loading={isSubmitting}
	onConfirm={handleDelete}
	onCancel={cancelDelete}
/>

<style>
	.users-page {
		padding: 24px;
		max-width: 1400px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 32px;
	}

	.header h1 {
		margin: 0 0 8px 0;
		font-size: 28px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.subtitle {
		margin: 0;
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
	}

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

	.create-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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

	.users-table-container {
		background: var(--bg-secondary, #2d2d2d);
		border-radius: 12px;
		overflow-x: auto;
		overflow-y: hidden;
		-webkit-overflow-scrolling: touch;
		max-width: 100%;
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.users-table {
		width: 100%;
		min-width: 520px;
		border-collapse: collapse;
	}

	.users-table thead {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.users-table th {
		padding: 16px;
		text-align: left;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-secondary, #a1a1aa);
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.users-table td {
		padding: 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		vertical-align: middle;
		height: 1px;
	}

	.users-table tbody tr {
		height: 1px;
	}

	.users-table tbody tr:hover {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.users-table tbody tr:last-child td {
		border-bottom: none;
	}

	.username-cell {
		padding: 0;
	}

	.username-content {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px;
		height: 100%;
		min-height: 100%;
	}

	.username {
		font-weight: 500;
	}

	.current-user-badge {
		padding: 2px 8px;
		background: var(--accent-color-light, rgba(99, 102, 241, 0.2));
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
	}

	.role-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
	}

	.role-badge.admin {
		background: var(--accent-color-light, rgba(99, 102, 241, 0.2));
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
	}

	.totp-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
	}

	.totp-badge.enabled {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.totp-badge.disabled {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
	}

	.date-cell {
		color: var(--text-secondary, #a1a1aa);
		white-space: nowrap;
	}

	.actions-column {
		width: 200px;
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

	.action-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
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
		min-width: 0;
		overflow-y: auto;
		overflow-x: hidden;
		border: 1px solid var(--border-color, #3a3a3a);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
		box-sizing: border-box;
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		gap: 16px;
	}

	.modal-header-content {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.modal-header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--accent-color, #6366f1) 15%, transparent);
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
		flex-shrink: 0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.modal-subtitle {
		margin: 4px 0 0 0;
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
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
		display: flex;
		flex-direction: column;
	}

	.user-summary {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		background: var(--bg-primary, #1a1a1a);
	}

	.user-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
		flex-shrink: 0;
	}

	.user-info {
		flex: 1;
		min-width: 0;
	}

	.user-name {
		font-size: 18px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin-bottom: 6px;
	}

	.user-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
	}

	.user-role-badge {
		padding: 2px 8px;
		border-radius: 4px;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
		font-weight: 500;
	}

	.user-role-badge.admin {
		background: var(--accent-color-light, rgba(99, 102, 241, 0.2));
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
	}

	.user-separator {
		color: var(--text-tertiary, #525252);
	}

	.user-2fa-status {
		color: var(--text-secondary, #a1a1aa);
	}

	.user-2fa-status.enabled {
		color: #22c55e;
	}

	.form-content {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
		box-sizing: border-box;
	}

	.form-group {
		margin-bottom: 0;
	}

	.form-group label {
		display: block;
		margin-bottom: 8px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.form-group input[type='text'],
	.form-group input[type='password'] {
		width: 100%;
		padding: 10px 12px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		transition: all 0.2s ease;
		box-sizing: border-box;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.form-group input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.password-input-group {
		position: relative;
		display: flex;
		align-items: center;
	}

	.password-input-group input {
		padding-right: 40px;
	}

	.password-toggle {
		position: absolute;
		right: 8px;
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

	.password-toggle:hover:not(:disabled) {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.controls-row {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		gap: 16px;
		min-width: 0;
	}

	.control-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		gap: 16px;
		flex: 1;
	}

	.control-label-group {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
		min-width: 0;
	}

	.control-label {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
		user-select: none;
	}

	.control-description {
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		line-height: 1.4;
	}

	.change-password-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 14px 20px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		flex: 1;
	}

	.change-password-button:hover:not(:disabled) {
		background: var(--bg-secondary, #2d2d2d);
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
	}

	.change-password-button.active {
		background: var(--accent-color-light, rgba(99, 102, 241, 0.2));
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
	}

	.change-password-button.active:hover:not(:disabled) {
		background: var(--accent-color-light, rgba(99, 102, 241, 0.3));
	}

	.change-password-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.change-password-button :global(svg) {
		flex-shrink: 0;
	}

	.password-reset-fields {
		padding: 20px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		animation: slideDown 0.2s ease;
		margin-top: 0;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.totp-section {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		gap: 16px;
	}

	.totp-info {
		flex: 1;
		min-width: 0;
	}

	.totp-status-text {
		font-size: 14px;
		color: var(--text-primary, #ffffff);
	}

	.reset-2fa-button {
		padding: 8px 16px;
		background: transparent;
		border: 1px solid #ef4444;
		border-radius: 6px;
		color: #ef4444;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.reset-2fa-button:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.1);
		border-color: #dc2626;
		color: #dc2626;
	}

	.reset-2fa-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.totp-reset-warning {
		margin-top: 12px;
		padding: 12px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 6px;
		color: #ef4444;
		font-size: 12px;
		line-height: 1.4;
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.totp-reset-warning :global(svg) {
		flex-shrink: 0;
		margin-top: 2px;
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

	.cancel-button:disabled,
	.save-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.users-page {
			padding: 16px;
		}

		.header {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}

		.header h1 {
			font-size: 22px;
		}

		.create-button {
			width: 100%;
			justify-content: center;
		}

		.users-table th,
		.users-table td {
			padding: 12px 10px;
		}

		.actions-column {
			width: auto;
			min-width: 100px;
		}

		.modal-overlay {
			padding: 12px;
		}

		.modal {
			max-width: 100%;
			max-height: min(92vh, 100dvh - 24px);
		}

		.modal-header {
			padding: 16px 18px;
		}

		.user-summary {
			padding: 16px 18px;
			gap: 12px;
		}

		.user-meta {
			flex-wrap: wrap;
			row-gap: 4px;
		}

		.form-content {
			padding: 16px 18px;
			gap: 16px;
		}

		.controls-row {
			flex-direction: column;
			gap: 12px;
		}

		.control-item,
		.change-password-button {
			flex: none;
			width: 100%;
			box-sizing: border-box;
		}

		.change-password-button {
			min-height: 48px;
		}

		.password-reset-fields {
			padding: 16px;
		}

		.totp-section {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}

		.reset-2fa-button {
			width: 100%;
			white-space: normal;
			text-align: center;
		}

		.modal-actions {
			flex-direction: column-reverse;
			padding: 16px 18px;
			gap: 10px;
		}

		.modal-actions .cancel-button,
		.modal-actions .save-button {
			width: 100%;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			box-sizing: border-box;
		}
	}
</style>
