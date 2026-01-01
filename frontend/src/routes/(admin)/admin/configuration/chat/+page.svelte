<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Users, RefreshCw, Pencil, Check, X, Loader2, Upload, Image as ImageIcon, Trash } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import AdminChat from '$lib/admin/components/AdminChat.svelte';
	import { getAllDefaultEmojis } from '$lib/shared/utils/emojiData';

	let adminChatComponent: AdminChat | null = null;
	
	// Chat state (bound from AdminChat)
	let isConnected = $state(false);
	let connectionStatus = $state<'connecting' | 'connected' | 'disconnected'>('disconnected');
	let userCount = $state(0);
	let messageCount = $state(0);
	let adminNickname = $state('Admin');
	let adminColor = $state('#f5b700');
	let allEmojis = $state<Array<{ name: string; emoji: string; isCustom: boolean; imageUrl?: string }>>([]);
	let emojiPickerReloadTrigger = $state(0);
	let isEditingNickname = $state(false);
	let nicknameInput = $state('');
	let isSavingNickname = $state(false);
	let isSavingColor = $state(false);
	
	// Emoji upload state
	let showEmojiUpload = $state(false);
	let emojiFile: File | null = $state(null);
	let emojiName = $state('');
	let isUploadingEmoji = $state(false);
	let customEmojis = $state<Array<{ id: string; name: string; imageUrl: string }>>([]);
	let isLoadingEmojis = $state(false);

	function handleColorChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const newColor = target.value;
		if (newColor !== adminColor && adminChatComponent) {
			isSavingColor = true;
			adminChatComponent.setAdminColor(newColor);
			setTimeout(() => { isSavingColor = false; }, 300);
		}
	}
	
	function startEditingNickname() {
		nicknameInput = adminNickname;
		isEditingNickname = true;
	}
	
	function cancelEditingNickname() {
		isEditingNickname = false;
		nicknameInput = '';
	}
	
	function saveNicknameHandler() {
		const newNickname = nicknameInput.trim();
		if (newNickname && newNickname !== adminNickname && adminChatComponent) {
			isSavingNickname = true;
			adminChatComponent.setAdminNickname(newNickname);
			setTimeout(() => { isSavingNickname = false; }, 300);
		}
		isEditingNickname = false;
		nicknameInput = '';
	}
	
	function handleNicknameKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			saveNicknameHandler();
		} else if (e.key === 'Escape') {
			cancelEditingNickname();
		}
	}

	function handleReconnect() {
		if (adminChatComponent) {
			adminChatComponent.reconnect();
		}
	}

	// Load custom emojis
	async function loadCustomEmojis() {
		if (!browser) return;
		
		try {
			isLoadingEmojis = true;
			const response = await fetch('/api/emojis', {
				credentials: 'include'
			});
			
			if (response.ok) {
				const data = await response.json();
				customEmojis = data.data || [];
			}
		} catch (error) {
			console.error('Failed to load emojis:', error);
		} finally {
			isLoadingEmojis = false;
		}
		
		loadAllEmojis();
	}
	
	function loadAllEmojis() {
		if (!browser) return;

		const defaultEmojis = getAllDefaultEmojis();
		
		// Add custom emojis
		const customEmojiList = customEmojis.map(e => ({
			name: e.name,
			emoji: `:${e.name}:`,
			isCustom: true,
			imageUrl: e.imageUrl
		}));
		
		allEmojis = [...defaultEmojis, ...customEmojiList];
	}

	// Handle emoji file selection
	function handleEmojiFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
			
			if (!allowedTypes.includes(file.type)) {
				toast.error('Invalid file type', {
					description: 'Only JPG, PNG, and GIF files are allowed'
				});
				return;
			}
			
			if (file.size > 2 * 1024 * 1024) {
				toast.error('File too large', {
					description: 'Emoji files must be less than 2MB'
				});
				return;
			}
			
			emojiFile = file;
			const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
			emojiName = nameWithoutExt.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
		}
	}

	// Upload emoji
	async function uploadEmoji() {
		if (!emojiFile || !emojiName.trim()) {
			toast.error('Missing information', {
				description: 'Please select a file and enter an emoji name'
			});
			return;
		}

		// Validate name format
		const nameRegex = /^[a-zA-Z0-9_-]+$/;
		if (!nameRegex.test(emojiName.trim())) {
			toast.error('Invalid emoji name', {
				description: 'Name can only contain letters, numbers, underscores, and hyphens'
			});
			return;
		}

		try {
			isUploadingEmoji = true;
			const formData = new FormData();
			formData.append('file', emojiFile);
			formData.append('name', emojiName.trim().toLowerCase());

			const response = await fetch('/api/emojis', {
				method: 'POST',
				credentials: 'include',
				body: formData
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to upload emoji');
			}

			toast.success('Emoji uploaded', {
				description: `:${emojiName.trim()}: is now available`
			});

			emojiFile = null;
			emojiName = '';
			showEmojiUpload = false;
			
			await loadCustomEmojis();
		} catch (error) {
			console.error('Error uploading emoji:', error);
			toast.error('Failed to upload emoji', {
				description: error instanceof Error ? error.message : 'Please try again'
			});
		} finally {
			isUploadingEmoji = false;
		}
	}

	// Delete emoji
	async function deleteEmoji(emojiId: string, emojiNameToDelete: string) {
		if (!confirm(`Delete emoji :${emojiNameToDelete}:?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/emojis/${emojiId}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to delete emoji');
			}

			toast.success('Emoji deleted', {
				description: `:${emojiNameToDelete}: has been removed`
			});

			await loadCustomEmojis();
		} catch (error) {
			console.error('Error deleting emoji:', error);
			toast.error('Failed to delete emoji');
		}
	}

	function handleEmojiUpdate() {
		loadCustomEmojis();
	}

	onMount(async () => {
		if (browser) {
			await loadCustomEmojis();
		}
	});
</script>

<div class="chat-config-page">
	<!-- Status Bar -->
	<div class="status-bar">
		<div class="connection-status" class:connected={isConnected} class:connecting={connectionStatus === 'connecting'}>
			<span class="status-dot"></span>
			<span class="status-text">
				{#if connectionStatus === 'connecting'}
					Connecting...
				{:else if isConnected}
					Connected
				{:else}
					Disconnected
				{/if}
			</span>
		</div>
		<div class="user-count">
			<Users size={16} />
			<span>{userCount} online</span>
		</div>
		{#if !isConnected}
			<button class="reconnect-btn" onclick={handleReconnect}>
				<RefreshCw size={16} />
				Reconnect
			</button>
		{/if}
	</div>

	<div class="content-columns">
		<!-- Left Column - Chat -->
		<div class="chat-column">
			<AdminChat
				bind:this={adminChatComponent}
				bind:allEmojis
				bind:emojiPickerReloadTrigger
				bind:userCount
				bind:messageCount
				bind:isConnected
				bind:connectionStatus
				bind:adminNickname
				bind:adminColor
				onEmojiUpdate={handleEmojiUpdate}
			/>
		</div>

		<!-- Right Column - Settings -->
		<aside class="settings-column">
			<!-- Identity Section -->
			<div class="config-card">
				<div class="config-card-header">
					<h3>Identity</h3>
				</div>
				<div class="config-card-content">
					{#if isEditingNickname}
						<div class="identity-edit">
							<input
								type="text"
								class="nickname-input"
								bind:value={nicknameInput}
								onkeydown={handleNicknameKeyDown}
								placeholder="Enter nickname..."
								maxlength="20"
								disabled={isSavingNickname}
							/>
							<div class="edit-actions">
								<button class="edit-btn save" onclick={saveNicknameHandler} title="Save" disabled={isSavingNickname}>
									{#if isSavingNickname}
										<Loader2 size={14} class="spin" />
									{:else}
										<Check size={14} />
									{/if}
								</button>
								<button class="edit-btn cancel" onclick={cancelEditingNickname} title="Cancel" disabled={isSavingNickname}>
									<X size={14} />
								</button>
							</div>
						</div>
					{:else}
						<div class="identity-display">
							<span class="config-label">Sending as</span>
							<span class="identity-value" style="color: {adminColor}">{adminNickname}</span>
							<button class="edit-icon-btn" onclick={startEditingNickname} title="Change nickname">
								<Pencil size={14} />
							</button>
						</div>
					{/if}
					
					<div class="color-picker-row">
						<span class="config-label">Name color</span>
						<div class="color-picker-wrapper">
							<input 
								type="color" 
								class="color-picker"
								value={adminColor}
								onchange={handleColorChange}
								disabled={isSavingColor}
							/>
							<span class="color-value">{adminColor}</span>
							{#if isSavingColor}
								<span class="color-saving"><Loader2 size={14} class="spin" /></span>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Custom Emojis Section -->
			<div class="config-card">
				<div class="config-card-header">
					<h3>Custom Emojis</h3>
					<button 
						class="add-emoji-btn"
						onclick={() => showEmojiUpload = !showEmojiUpload}
						title="Upload emoji"
					>
						<Upload size={16} />
					</button>
				</div>
				<div class="config-card-content">
					{#if showEmojiUpload}
						<div class="emoji-upload-form">
							<div class="upload-form-group">
								<label for="emoji-file">Image File (JPG, PNG, GIF)</label>
								<input
									id="emoji-file"
									type="file"
									accept="image/jpeg,image/jpg,image/png,image/gif"
									onchange={handleEmojiFileSelect}
									disabled={isUploadingEmoji}
								/>
								{#if emojiFile}
									<span class="file-name">{emojiFile.name}</span>
								{/if}
							</div>
							<div class="upload-form-group">
								<label for="emoji-name">Emoji Name</label>
								<input
									id="emoji-name"
									type="text"
									bind:value={emojiName}
									placeholder="e.g., myemoji"
									pattern="[a-zA-Z0-9_-]+"
									disabled={isUploadingEmoji}
								/>
								<span class="form-hint">Use :{emojiName || 'name'}: in chat</span>
							</div>
							<div class="upload-form-actions">
								<button 
									class="upload-btn"
									onclick={uploadEmoji}
									disabled={!emojiFile || !emojiName.trim() || isUploadingEmoji}
								>
									{#if isUploadingEmoji}
										<Loader2 size={14} class="spin" />
										Uploading...
									{:else}
										<Upload size={14} />
										Upload
									{/if}
								</button>
								<button 
									class="cancel-btn"
									onclick={() => { showEmojiUpload = false; emojiFile = null; emojiName = ''; }}
									disabled={isUploadingEmoji}
								>
									Cancel
								</button>
							</div>
						</div>
					{/if}
					
					{#if isLoadingEmojis}
						<div class="emojis-loading">
							<Loader2 size={16} class="spin" />
							<span>Loading emojis...</span>
						</div>
					{:else if customEmojis.length === 0}
						<div class="emojis-empty">
							<ImageIcon size={24} />
							<p>No custom emojis yet</p>
							<span>Upload an emoji to get started</span>
						</div>
					{:else}
						<div class="emojis-grid">
							{#each customEmojis as emoji}
								<div class="emoji-item">
									<img 
										src={emoji.imageUrl} 
										alt={`:${emoji.name}:`}
										class="emoji-preview"
									/>
									<div class="emoji-info">
										<span class="emoji-name">:{emoji.name}:</span>
									</div>
									<button
										class="emoji-delete-btn"
										onclick={() => deleteEmoji(emoji.id, emoji.name)}
										title="Delete emoji"
									>
										<Trash size={12} />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Statistics Section -->
			<div class="config-card">
				<div class="config-card-header">
					<h3>Statistics</h3>
				</div>
				<div class="config-card-content">
					<div class="stats-grid">
						<div class="stat-card">
							<div class="stat-label">Online Users</div>
							<div class="stat-value">{userCount}</div>
						</div>
						<div class="stat-card">
							<div class="stat-label">Total Messages</div>
							<div class="stat-value">{messageCount}</div>
						</div>
					</div>
				</div>
			</div>
		</aside>
	</div>
</div>

<style>
	.chat-config-page {
		display: flex;
		flex-direction: column;
		gap: 16px;
		height: calc(100vh - 220px);
		min-height: 500px;
	}

	.status-bar {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	.connection-status {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-radius: 20px;
		background: var(--bg-tertiary, #2d2d2d);
		font-size: 13px;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ef4444;
	}

	.connection-status.connected .status-dot {
		background: #22c55e;
	}

	.connection-status.connecting .status-dot {
		background: #f59e0b;
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.status-text {
		color: var(--text-secondary, #a1a1aa);
	}

	.user-count {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
	}

	.reconnect-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--accent-color, #6366f1);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.reconnect-btn:hover {
		background: var(--accent-color-dark, #4f46e5);
	}

	.content-columns {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: 16px;
		flex: 1;
		min-height: 0;
	}

	.chat-column {
		min-height: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.settings-column {
		display: flex;
		flex-direction: column;
		gap: 16px;
		overflow-y: auto;
		min-height: 0;
	}

	.config-card {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #404040);
		border-radius: 8px;
		overflow: hidden;
	}

	.config-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-color, #404040);
	}

	.config-card-header h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.config-card-content {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.config-label {
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
	}

	.identity-display {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.identity-value {
		font-size: 14px;
		font-weight: 600;
	}

	.edit-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
		transition: background 0.2s, color 0.2s;
		margin-left: auto;
	}

	.edit-icon-btn:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.identity-edit {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.nickname-input {
		flex: 1;
		padding: 8px 12px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #404040);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		outline: none;
	}

	.nickname-input:focus {
		border-color: var(--accent-color, #6366f1);
	}

	.edit-actions {
		display: flex;
		gap: 4px;
	}

	.edit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.edit-btn.save {
		background: #22c55e;
		color: white;
	}

	.edit-btn.save:hover {
		background: #16a34a;
	}

	.edit-btn.cancel {
		background: var(--bg-tertiary, #404040);
		color: var(--text-secondary, #a1a1aa);
	}

	.edit-btn.cancel:hover {
		background: #525252;
		color: var(--text-primary, #ffffff);
	}

	.edit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.color-picker-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-top: 12px;
		border-top: 1px solid var(--border-color, #404040);
	}

	.color-picker-wrapper {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: auto;
	}

	.color-picker {
		width: 32px;
		height: 32px;
		padding: 0;
		border: 2px solid var(--border-color, #404040);
		border-radius: 6px;
		cursor: pointer;
		background: transparent;
	}

	.color-picker::-webkit-color-swatch-wrapper {
		padding: 2px;
	}

	.color-picker::-webkit-color-swatch {
		border: none;
		border-radius: 4px;
	}

	.color-value {
		font-size: 12px;
		font-family: monospace;
		color: var(--text-secondary, #a1a1aa);
	}

	.color-saving {
		display: flex;
		align-items: center;
		color: var(--accent-color, #6366f1);
	}

	.add-emoji-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		background: transparent;
		border: 1px solid var(--border-color, #404040);
		border-radius: 4px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s;
	}

	.add-emoji-btn:hover {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: #555;
		color: var(--text-primary, #ffffff);
	}

	.emoji-upload-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-color, #404040);
		margin-bottom: 12px;
	}

	.upload-form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.upload-form-group label {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
	}

	.upload-form-group input[type="file"],
	.upload-form-group input[type="text"] {
		padding: 8px 12px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #404040);
		border-radius: 4px;
		color: var(--text-primary, #ffffff);
		font-size: 13px;
		font-family: inherit;
	}

	.upload-form-group input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.file-name {
		font-size: 11px;
		color: var(--text-secondary, #a1a1aa);
	}

	.form-hint {
		font-size: 11px;
		color: var(--text-muted, #71717a);
	}

	.upload-form-actions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}

	.upload-btn,
	.cancel-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		border: none;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.upload-btn {
		background: var(--accent-color, #6366f1);
		color: #ffffff;
	}

	.upload-btn:hover:not(:disabled) {
		background: var(--accent-color-dark, #4f46e5);
	}

	.upload-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.cancel-btn {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
	}

	.cancel-btn:hover:not(:disabled) {
		background: #4a4a4a;
		color: var(--text-primary, #ffffff);
	}

	.emojis-loading,
	.emojis-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		text-align: center;
		color: var(--text-secondary, #a1a1aa);
		gap: 8px;
	}

	.emojis-empty :global(svg) {
		opacity: 0.5;
	}

	.emojis-empty p {
		margin: 0;
		font-size: 13px;
		font-weight: 500;
	}

	.emojis-empty span {
		font-size: 11px;
	}

	.emojis-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
		gap: 8px;
	}

	.emoji-item {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 8px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #404040);
		border-radius: 6px;
		transition: all 0.2s;
	}

	.emoji-item:hover {
		background: var(--bg-tertiary, #2a2a2a);
		border-color: #555;
	}

	.emoji-preview {
		width: 28px;
		height: 28px;
		object-fit: contain;
		image-rendering: crisp-edges;
		margin-bottom: 4px;
	}

	.emoji-info {
		width: 100%;
		text-align: center;
	}

	.emoji-name {
		font-size: 10px;
		color: var(--text-secondary, #a1a1aa);
		font-family: monospace;
		word-break: break-word;
	}

	.emoji-delete-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		padding: 0;
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid rgba(239, 68, 68, 0.4);
		border-radius: 4px;
		color: #ef4444;
		cursor: pointer;
		opacity: 0;
		transition: all 0.2s;
	}

	.emoji-item:hover .emoji-delete-btn {
		opacity: 1;
	}

	.emoji-delete-btn:hover {
		background: rgba(239, 68, 68, 0.3);
		border-color: rgba(239, 68, 68, 0.6);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
	}

	.stat-card {
		background: var(--bg-tertiary, #3a3a3a);
		border-radius: 6px;
		padding: 12px;
	}

	.stat-label {
		font-size: 11px;
		color: var(--text-secondary, #a1a1aa);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 4px;
	}

	.stat-value {
		font-size: 20px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	@media (max-width: 1024px) {
		.chat-config-page {
			height: auto;
			min-height: auto;
		}

		.content-columns {
			grid-template-columns: 1fr;
			flex: none;
		}

		.chat-column {
			height: 450px;
			min-height: 400px;
		}

		.settings-column {
			height: auto;
			overflow-y: visible;
		}
	}

	@media (max-width: 768px) {
		.status-bar {
			gap: 12px;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
