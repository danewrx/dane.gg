<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import {
		MessageSquare,
		Users,
		RefreshCw,
		Pencil,
		Check,
		X,
		Loader2,
		Upload,
		Image as ImageIcon,
		Trash,
		Play,
		Square
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import AdminChat from '$lib/admin/components/AdminChat.svelte';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import { getAllDefaultEmojis } from '$lib/shared/utils/emojiData';
	import {
		DEFAULT_CHAT_NOTIFICATION_SOUND_ID,
		DEFAULT_CHAT_NOTIFICATION_SOUND_NAME,
		DEFAULT_CHAT_NOTIFICATION_SOUND_URL,
		labelForNotificationSoundOption
	} from '$lib/shared/utils/chatNotificationSounds';

	function isBuiltinNotificationSound(s: { id: string; name: string }): boolean {
		return (
			s.id === DEFAULT_CHAT_NOTIFICATION_SOUND_ID || s.name === DEFAULT_CHAT_NOTIFICATION_SOUND_NAME
		);
	}

	function mergeAdminNotificationSounds(
		rows: Array<{ id: string; name: string; displayName?: string | null; soundUrl: string }>
	): Array<{ id: string; name: string; displayName?: string | null; soundUrl: string }> {
		const builtIn: { id: string; name: string; displayName: string; soundUrl: string } = {
			id: DEFAULT_CHAT_NOTIFICATION_SOUND_ID,
			name: DEFAULT_CHAT_NOTIFICATION_SOUND_NAME,
			displayName: 'Default',
			soundUrl: DEFAULT_CHAT_NOTIFICATION_SOUND_URL
		};
		const customOnly = rows.filter((r) => !isBuiltinNotificationSound(r));
		return [builtIn, ...customOnly];
	}

	let adminChatComponent: AdminChat | null = null;

	// Chat state (bound from AdminChat)
	let isConnected = $state(false);
	let connectionStatus = $state<'connecting' | 'connected' | 'disconnected'>('disconnected');
	let userCount = $state(0);
	let messageCount = $state(0);
	let adminNickname = $state('Admin');
	let adminColor = $state('#f5b700');
	let allEmojis = $state<
		Array<{ name: string; emoji: string; isCustom: boolean; imageUrl?: string }>
	>([]);
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

	// Chat notification sounds
	let showSoundUpload = $state(false);
	let soundFile: File | null = $state(null);
	let soundDisplayName = $state('');
	let isUploadingSound = $state(false);
	let notificationSounds = $state<
		Array<{ id: string; name: string; displayName?: string | null; soundUrl: string }>
	>([]);
	let isLoadingSounds = $state(true);
	let previewPlayingId = $state<string | null>(null);
	let previewAudio: HTMLAudioElement | null = null;

	let showDeleteEmojiDialog = $state(false);
	let pendingEmojiDelete = $state<{ id: string; name: string } | null>(null);
	let showDeleteSoundDialog = $state(false);
	let pendingSoundDelete = $state<{ id: string; label: string } | null>(null);

	const DISCORD_CHAT_INTEGRATION_KEY = 'discord_chat_integration_enabled';
	let discordChatIntegrationEnabled = $state(true);
	let discordChatIntegrationLoaded = $state(false);
	let isSavingDiscordChatIntegration = $state(false);

	function handleColorChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const newColor = target.value;
		if (newColor !== adminColor && adminChatComponent) {
			isSavingColor = true;
			adminChatComponent.setAdminColor(newColor);
			setTimeout(() => {
				isSavingColor = false;
			}, 300);
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
			setTimeout(() => {
				isSavingNickname = false;
			}, 300);
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
			logger.error('Failed to load emojis:', error);
		} finally {
			isLoadingEmojis = false;
		}

		loadAllEmojis();
	}

	function loadAllEmojis() {
		if (!browser) return;

		const defaultEmojis = getAllDefaultEmojis();

		// Add custom emojis
		const customEmojiList = customEmojis.map((e) => ({
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
			logger.error('Error uploading emoji:', error);
			toast.error('Failed to upload emoji', {
				description: error instanceof Error ? error.message : 'Please try again'
			});
		} finally {
			isUploadingEmoji = false;
		}
	}

	function requestDeleteEmoji(emojiId: string, emojiName: string) {
		pendingEmojiDelete = { id: emojiId, name: emojiName };
		showDeleteEmojiDialog = true;
	}

	function cancelDeleteEmoji() {
		showDeleteEmojiDialog = false;
		pendingEmojiDelete = null;
	}

	async function confirmDeleteEmoji() {
		if (!pendingEmojiDelete) return;
		const { id: emojiId, name: emojiName } = pendingEmojiDelete;
		try {
			const response = await fetch(`/api/emojis/${emojiId}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to delete emoji');
			}

			toast.success('Emoji deleted', {
				description: `:${emojiName}: has been removed`
			});

			await loadCustomEmojis();
		} catch (error) {
			logger.error('Error deleting emoji:', error);
			toast.error('Failed to delete emoji');
		} finally {
			cancelDeleteEmoji();
		}
	}

	// Handle emoji update callback
	function handleEmojiUpdate() {
		loadCustomEmojis();
	}

	async function loadNotificationSounds() {
		if (!browser) {
			isLoadingSounds = false;
			return;
		}
		try {
			isLoadingSounds = true;
			const response = await fetch('/api/chat-notification-sounds', { credentials: 'include' });
			if (response.ok) {
				const data = await response.json();
				const rows = (data.data || []) as Array<{
					id: string;
					name: string;
					displayName?: string | null;
					soundUrl: string;
				}>;
				notificationSounds = mergeAdminNotificationSounds(rows);
			} else {
				notificationSounds = mergeAdminNotificationSounds([]);
			}
		} catch (error) {
			logger.error('Failed to load notification sounds:', error);
			notificationSounds = mergeAdminNotificationSounds([]);
		} finally {
			isLoadingSounds = false;
		}
	}

	function handleSoundFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			const allowed = ['.mp3', '.wav', '.ogg', '.webm', '.m4a'];
			const ext = '.' + file.name.split('.').pop()?.toLowerCase();
			if (!allowed.includes(ext)) {
				toast.error('Invalid file type', {
					description: 'Use MP3, WAV, OGG, WebM, or M4A (max 512KB)'
				});
				return;
			}
			if (file.size > 512 * 1024) {
				toast.error('File too large', { description: 'Sounds must be 512KB or less' });
				return;
			}
			soundFile = file;
		}
	}

	async function uploadNotificationSound() {
		const label = soundDisplayName.trim();
		if (!soundFile || !label) {
			toast.error('Missing information', {
				description: 'Select an audio file and enter a display name'
			});
			return;
		}
		if (label.length > 120) {
			toast.error('Name too long', { description: 'Use 120 characters or fewer' });
			return;
		}
		try {
			isUploadingSound = true;
			const formData = new FormData();
			formData.append('file', soundFile);
			formData.append('displayName', label);
			const response = await fetch('/api/chat-notification-sounds', {
				method: 'POST',
				credentials: 'include',
				body: formData
			});
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error || 'Upload failed');
			}
			toast.success('Sound uploaded', {
				description: `Visitors can pick “${label}” in site settings`
			});
			soundFile = null;
			soundDisplayName = '';
			showSoundUpload = false;
			await loadNotificationSounds();
		} catch (error) {
			logger.error(error);
			toast.error('Upload failed', {
				description: error instanceof Error ? error.message : 'Try again'
			});
		} finally {
			isUploadingSound = false;
		}
	}

	function requestDeleteNotificationSound(
		id: string,
		s: Pick<{ name: string; displayName?: string | null }, 'name' | 'displayName'>
	) {
		pendingSoundDelete = { id, label: labelForNotificationSoundOption(s) };
		showDeleteSoundDialog = true;
	}

	function cancelDeleteSound() {
		showDeleteSoundDialog = false;
		pendingSoundDelete = null;
	}

	async function confirmDeleteNotificationSound() {
		if (!pendingSoundDelete) return;
		const { id } = pendingSoundDelete;
		try {
			const response = await fetch(`/api/chat-notification-sounds/${id}`, {
				method: 'DELETE',
				credentials: 'include'
			});
			if (!response.ok) throw new Error('Delete failed');
			toast.success('Sound removed');
			await loadNotificationSounds();
		} catch (error) {
			logger.error(error);
			toast.error('Failed to delete sound');
		} finally {
			cancelDeleteSound();
		}
	}

	function stopSoundPreview() {
		if (previewAudio) {
			previewAudio.pause();
			previewAudio.currentTime = 0;
			previewAudio = null;
		}
		previewPlayingId = null;
	}

	function toggleSoundPreview(url: string, id: string) {
		if (!browser) return;
		if (previewPlayingId === id && previewAudio && !previewAudio.paused) {
			stopSoundPreview();
			return;
		}

		stopSoundPreview();

		const a = new Audio(url);
		previewAudio = a;
		a.volume = 0.5;

		const onFinish = () => {
			if (previewAudio === a) stopSoundPreview();
		};
		a.addEventListener('ended', onFinish);
		a.addEventListener('error', onFinish);

		void a
			.play()
			.then(() => {
				if (previewAudio === a && !a.paused) previewPlayingId = id;
			})
			.catch(() => {
				if (previewAudio === a) stopSoundPreview();
			});
	}

	onDestroy(() => {
		if (browser) stopSoundPreview();
	});

	async function loadDiscordChatIntegrationSetting() {
		if (!browser) return;
		try {
			const response = await fetch(`/api/config/${DISCORD_CHAT_INTEGRATION_KEY}`, {
				credentials: 'include'
			});
			if (response.status === 404) {
				discordChatIntegrationEnabled = true;
				return;
			}
			if (!response.ok) return;
			const body = await response.json();
			const v = body.data?.value;
			discordChatIntegrationEnabled = v !== false && v !== 'false';
		} catch (e) {
			logger.error('Failed to load Discord chat integration setting:', e);
		} finally {
			discordChatIntegrationLoaded = true;
		}
	}

	async function saveDiscordChatIntegration(next: boolean) {
		if (!browser || isSavingDiscordChatIntegration) return;
		isSavingDiscordChatIntegration = true;
		try {
			const response = await fetch(`/api/config/${DISCORD_CHAT_INTEGRATION_KEY}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ value: next, dataType: 'boolean' })
			});
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to save');
			}
			discordChatIntegrationEnabled = next;
			toast.success(next ? 'Discord chat integration on' : 'Discord chat integration off', {
				description: next
					? 'The site will accept Discord relay commands from your bot.'
					: 'The site will reject /discord and related bot commands until you turn this back on.'
			});
		} catch (e) {
			discordChatIntegrationEnabled = !next;
			toast.error('Could not update Discord integration', {
				description: e instanceof Error ? e.message : 'Try again'
			});
		} finally {
			isSavingDiscordChatIntegration = false;
		}
	}

	onMount(async () => {
		if (browser) {
			await Promise.all([
				loadCustomEmojis(),
				loadNotificationSounds(),
				loadDiscordChatIntegrationSetting()
			]);
		}
	});
</script>

<svelte:head>
	<title>{adminPageTitle('Chat')}</title>
</svelte:head>

<ConfirmDialog
	bind:open={showDeleteEmojiDialog}
	title="Delete emoji"
	message={pendingEmojiDelete ? `Remove :${pendingEmojiDelete.name}: from the picker?` : ''}
	detail="This cannot be undone."
	variant="danger"
	confirmLabel="Delete emoji"
	cancelLabel="Cancel"
	onConfirm={confirmDeleteEmoji}
	onCancel={cancelDeleteEmoji}
/>

<ConfirmDialog
	bind:open={showDeleteSoundDialog}
	title="Delete notification sound"
	message={pendingSoundDelete ? `Remove “${pendingSoundDelete.label}”?` : ''}
	detail="Visitors who chose this sound will fall back to the default."
	variant="danger"
	confirmLabel="Delete sound"
	cancelLabel="Cancel"
	onConfirm={confirmDeleteNotificationSound}
	onCancel={cancelDeleteSound}
/>

<div class="chat-page">
	<section class="header-section">
		<div class="section-header">
			<h1 class="page-title">
				<MessageSquare size={24} />
				Site Chat
			</h1>
			<div class="header-actions">
				<div
					class="connection-status"
					class:connected={isConnected}
					class:connecting={connectionStatus === 'connecting'}
				>
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
		</div>
	</section>

	<div class="content-columns">
		<!-- Left Column - Chat -->
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
			onNotificationSoundsUpdate={() => {
				void loadNotificationSounds();
			}}
		/>

		<!-- Right Column - Stats -->
		<aside class="right-column">
			<!-- Sending As Section -->
			<div class="identity-section">
				<div class="identity-header">
					<h3>Identity</h3>
				</div>
				<div class="identity-content">
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
								<button
									class="edit-btn save"
									onclick={saveNicknameHandler}
									title="Save"
									disabled={isSavingNickname}
								>
									{#if isSavingNickname}
										<Loader2 size={14} class="spin" />
									{:else}
										<Check size={14} />
									{/if}
								</button>
								<button
									class="edit-btn cancel"
									onclick={cancelEditingNickname}
									title="Cancel"
									disabled={isSavingNickname}
								>
									<X size={14} />
								</button>
							</div>
						</div>
					{:else}
						<div class="identity-display">
							<span class="identity-label">Sending as</span>
							<span class="identity-value" style="color: {adminColor}">{adminNickname}</span>
							<button class="edit-icon-btn" onclick={startEditingNickname} title="Change nickname">
								<Pencil size={14} />
							</button>
						</div>
					{/if}

					<div class="color-picker-row">
						<span class="identity-label">Name color</span>
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

			<!-- Discord bridge -->
			<div class="discord-integration-section">
				<div class="discord-integration-header">
					<h3>Discord</h3>
				</div>
				<p class="discord-integration-help">
					When off, the chat server rejects <code>/discord</code> and <code>/set_discord_message_id</code>
					and will not ask the bot to delete mirrored Discord messages. Your bot can optionally read the
					same flag via the public config API to avoid sending commands.
				</p>
				<div class="discord-integration-row">
					<Toggle
						bind:checked={discordChatIntegrationEnabled}
						disabled={!discordChatIntegrationLoaded || isSavingDiscordChatIntegration}
						label="Discord chat integration"
						onchange={(c) => void saveDiscordChatIntegration(c)}
					/>
					{#if isSavingDiscordChatIntegration}
						<span class="discord-integration-spinner">
							<Loader2 size={16} class="spin" />
						</span>
					{/if}
				</div>
			</div>

			<!-- Custom Emojis Section -->
			<div class="emojis-section">
				<div class="emojis-header">
					<h3>Custom Emojis</h3>
					<button
						class="add-emoji-btn"
						onclick={() => (showEmojiUpload = !showEmojiUpload)}
						title="Upload emoji"
					>
						<Upload size={16} />
					</button>
				</div>
				<div class="emojis-content">
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
									onclick={() => {
										showEmojiUpload = false;
										emojiFile = null;
										emojiName = '';
									}}
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
									<img src={emoji.imageUrl} alt={`:${emoji.name}:`} class="emoji-preview" />
									<div class="emoji-info">
										<span class="emoji-name">:{emoji.name}:</span>
									</div>
									<button
										class="emoji-delete-btn"
										onclick={() => requestDeleteEmoji(emoji.id, emoji.name)}
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

			<!-- Chat notification sounds (public site) -->
			<div class="emojis-section sounds-section">
				<div class="emojis-header">
					<h3>Chat notification sounds</h3>
					<button
						type="button"
						class="add-emoji-btn"
						onclick={() => (showSoundUpload = !showSoundUpload)}
						title="Upload sound"
					>
						<Upload size={16} />
					</button>
				</div>
				<div class="emojis-content">
					<p class="sounds-intro">
						Short clips (512KB max) for the public chat widget. Visitors choose a sound in the site
						settings panel.
					</p>
					{#if showSoundUpload}
						<div class="emoji-upload-form">
							<div class="upload-form-group">
								<label for="sound-file">Audio (MP3, WAV, OGG, WebM, M4A)</label>
								<input
									id="sound-file"
									type="file"
									accept=".mp3,.wav,.ogg,.webm,.m4a,audio/*"
									onchange={handleSoundFileSelect}
									disabled={isUploadingSound}
								/>
								{#if soundFile}
									<span class="file-name">{soundFile.name}</span>
								{/if}
							</div>
							<div class="upload-form-group">
								<label for="sound-display-name">Display name</label>
								<input
									id="sound-display-name"
									type="text"
									bind:value={soundDisplayName}
									placeholder="e.g. Soft ding ★"
									maxlength="120"
									disabled={isUploadingSound}
								/>
								<span class="form-hint"
									>Shown in the visitor dropdown. The file is stored under a unique name on the
									server.</span
								>
							</div>
							<div class="upload-form-actions">
								<button
									type="button"
									class="upload-btn"
									onclick={uploadNotificationSound}
									disabled={!soundFile || !soundDisplayName.trim() || isUploadingSound}
								>
									{#if isUploadingSound}
										<Loader2 size={14} class="spin" />
										Uploading…
									{:else}
										<Upload size={14} />
										Upload
									{/if}
								</button>
								<button
									type="button"
									class="cancel-btn"
									onclick={() => {
										showSoundUpload = false;
										soundFile = null;
										soundDisplayName = '';
									}}
									disabled={isUploadingSound}
								>
									Cancel
								</button>
							</div>
						</div>
					{/if}

					{#if isLoadingSounds}
						<div class="emojis-loading">
							<Loader2 size={16} class="spin" />
							<span>Loading sounds…</span>
						</div>
					{:else}
						<div class="sounds-grid">
							{#each notificationSounds as s (s.id)}
								<div class="sound-tile">
									{#if !isBuiltinNotificationSound(s)}
										<button
											type="button"
											class="sound-tile-delete"
											onclick={() => requestDeleteNotificationSound(s.id, s)}
											title="Delete"
										>
											<Trash size={12} />
										</button>
									{/if}
									<button
										type="button"
										class="sound-play-btn"
										onclick={() => toggleSoundPreview(s.soundUrl, s.id)}
										aria-label={previewPlayingId === s.id ? 'Stop preview' : 'Play preview'}
										title={previewPlayingId === s.id ? 'Stop' : 'Play'}
									>
										{#if previewPlayingId === s.id}
											<Square size={14} strokeWidth={2} aria-hidden="true" />
										{:else}
											<Play size={18} strokeWidth={2} aria-hidden="true" />
										{/if}
									</button>
									<span class="sound-tile-name">{labelForNotificationSoundOption(s)}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div class="stats-section">
				<div class="stats-header">
					<h3>Statistics</h3>
				</div>
				<div class="stats-content">
					<div class="stats-grid">
						<div class="info-card">
							<div class="info-label">Online Users</div>
							<div class="info-value">{userCount}</div>
						</div>
						<div class="info-card">
							<div class="info-label">Total Messages</div>
							<div class="info-value">{messageCount}</div>
						</div>
					</div>
				</div>
			</div>
		</aside>
	</div>
</div>

<style>
	.chat-page {
		display: flex;
		flex-direction: column;
		gap: 24px;
		height: calc(100vh - 120px);
		max-height: calc(100vh - 120px);
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
		padding: 0 16px;
		box-sizing: border-box;
		overflow-x: hidden;
	}

	@media (max-width: 768px) {
		.chat-page {
			height: auto;
			min-height: calc(100vh - 180px);
			max-height: none;
		}
	}

	.header-section {
		flex-shrink: 0;
	}

	.content-columns {
		display: grid;
		grid-template-columns: 3fr 2fr;
		gap: 24px;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.content-columns :global(.chat-section) {
		min-width: 0;
	}

	@media (max-width: 768px) {
		.content-columns {
			grid-template-columns: 1fr;
			overflow: visible;
			min-height: auto;
		}
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 16px;
	}

	.page-title {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 24px;
		font-weight: 600;
		margin: 0;
		color: #ffffff;
	}

	:global(html:not(.dark)) .page-title {
		color: #1f2937;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.connection-status {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border-radius: 20px;
		background: #2d2d2d;
		font-size: 13px;
	}

	:global(html:not(.dark)) .connection-status {
		background: #f3f4f6;
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
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.status-text {
		color: #a1a1aa;
	}

	:global(html:not(.dark)) .status-text {
		color: #6b7280;
	}

	.user-count {
		display: flex;
		align-items: center;
		gap: 6px;
		color: #a1a1aa;
		font-size: 13px;
	}

	:global(html:not(.dark)) .user-count {
		color: #6b7280;
	}

	.reconnect-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--accent-color, #3b82f6);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.reconnect-btn:hover {
		background: var(--accent-color-dark, #2563eb);
	}

	.right-column {
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.identity-section {
		background: #2d2d2d;
		border: 1px solid #404040;
		border-radius: 8px;
		overflow: hidden;
	}

	:global(html:not(.dark)) .identity-section {
		background: #ffffff;
		border-color: #e5e7eb;
	}

	.identity-header {
		padding: 16px;
		border-bottom: 1px solid #404040;
	}

	:global(html:not(.dark)) .identity-header {
		border-bottom-color: #e5e7eb;
	}

	.identity-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #ffffff;
	}

	:global(html:not(.dark)) .identity-header h3 {
		color: #1f2937;
	}

	.identity-content {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.identity-display {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.identity-label {
		font-size: 13px;
		color: #a1a1aa;
	}

	:global(html:not(.dark)) .identity-label {
		color: #6b7280;
	}

	.identity-value {
		font-size: 14px;
		font-weight: 600;
		color: var(--accent-color, #3b82f6);
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
		color: #6b7280;
		cursor: pointer;
		transition:
			background 0.2s,
			color 0.2s;
		margin-left: auto;
	}

	.edit-icon-btn:hover {
		background: #3a3a3a;
		color: #ffffff;
	}

	:global(html:not(.dark)) .edit-icon-btn:hover {
		background: #f3f4f6;
		color: #1f2937;
	}

	.color-picker-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-top: 8px;
		border-top: 1px solid #404040;
	}

	:global(html:not(.dark)) .color-picker-row {
		border-top-color: #e5e7eb;
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
		border: 2px solid #404040;
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

	:global(html:not(.dark)) .color-picker {
		border-color: #e5e7eb;
	}

	.color-value {
		font-size: 12px;
		font-family: monospace;
		color: #a1a1aa;
	}

	:global(html:not(.dark)) .color-value {
		color: #6b7280;
	}

	.color-saving {
		display: flex;
		align-items: center;
		color: var(--accent-color, #3b82f6);
	}

	.identity-edit {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.nickname-input {
		flex: 1;
		padding: 8px 12px;
		background: #1a1a1a;
		border: 1px solid #404040;
		border-radius: 6px;
		color: #ffffff;
		font-size: 14px;
		outline: none;
	}

	.nickname-input:focus {
		border-color: var(--accent-color, #3b82f6);
	}

	:global(html:not(.dark)) .nickname-input {
		background: #f9fafb;
		border-color: #e5e7eb;
		color: #1f2937;
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
		background: #404040;
		color: #a1a1aa;
	}

	.edit-btn.cancel:hover {
		background: #525252;
		color: #ffffff;
	}

	:global(html:not(.dark)) .edit-btn.cancel {
		background: #e5e7eb;
		color: #6b7280;
	}

	:global(html:not(.dark)) .edit-btn.cancel:hover {
		background: #d1d5db;
		color: #1f2937;
	}

	.edit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	:global(.spin) {
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

	.discord-integration-section {
		background: #2d2d2d;
		border: 1px solid #404040;
		border-radius: 8px;
		overflow: hidden;
		margin-top: 16px;
	}

	:global(html:not(.dark)) .discord-integration-section {
		background: #ffffff;
		border-color: #e5e7eb;
	}

	.discord-integration-header {
		padding: 16px;
		border-bottom: 1px solid #404040;
	}

	:global(html:not(.dark)) .discord-integration-header {
		border-bottom-color: #e5e7eb;
	}

	.discord-integration-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #ffffff;
	}

	:global(html:not(.dark)) .discord-integration-header h3 {
		color: #1f2937;
	}

	.discord-integration-help {
		margin: 0;
		padding: 12px 16px 0;
		font-size: 12px;
		line-height: 1.45;
		color: #a1a1aa;
	}

	:global(html:not(.dark)) .discord-integration-help {
		color: #6b7280;
	}

	.discord-integration-help code {
		font-size: 11px;
		padding: 1px 4px;
		border-radius: 4px;
		background: #1a1a1a;
		color: #e4e4e7;
	}

	:global(html:not(.dark)) .discord-integration-help code {
		background: #f3f4f6;
		color: #374151;
	}

	.discord-integration-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px;
	}

	.discord-integration-spinner {
		color: var(--accent-color, #3b82f6);
	}

	.emojis-section {
		background: #2d2d2d;
		border: 1px solid #404040;
		border-radius: 8px;
		overflow: hidden;
	}

	:global(html:not(.dark)) .emojis-section {
		background: #ffffff;
		border-color: #e5e7eb;
	}

	.emojis-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid #404040;
	}

	:global(html:not(.dark)) .emojis-header {
		border-bottom-color: #e5e7eb;
	}

	.emojis-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #ffffff;
	}

	:global(html:not(.dark)) .emojis-header h3 {
		color: #1f2937;
	}

	.add-emoji-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		background: transparent;
		border: 1px solid #404040;
		border-radius: 4px;
		color: #a1a1aa;
		cursor: pointer;
		transition: all 0.2s;
	}

	.add-emoji-btn:hover {
		background: #3a3a3a;
		border-color: #555;
		color: #ffffff;
	}

	:global(html:not(.dark)) .add-emoji-btn {
		border-color: #e5e7eb;
		color: #6b7280;
	}

	:global(html:not(.dark)) .add-emoji-btn:hover {
		background: #f3f4f6;
		border-color: #d1d5db;
		color: #1f2937;
	}

	.emojis-content {
		padding: 16px;
	}

	.emoji-upload-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding-bottom: 16px;
		border-bottom: 1px solid #404040;
		margin-bottom: 16px;
	}

	:global(html:not(.dark)) .emoji-upload-form {
		border-bottom-color: #e5e7eb;
	}

	.upload-form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.upload-form-group label {
		font-size: 13px;
		font-weight: 500;
		color: #a1a1aa;
	}

	:global(html:not(.dark)) .upload-form-group label {
		color: #6b7280;
	}

	.upload-form-group input[type='file'],
	.upload-form-group input[type='text'] {
		padding: 8px 12px;
		background: #1a1a1a;
		border: 1px solid #404040;
		border-radius: 4px;
		color: #ffffff;
		font-size: 14px;
		font-family: inherit;
	}

	:global(html:not(.dark)) .upload-form-group input[type='file'],
	:global(html:not(.dark)) .upload-form-group input[type='text'] {
		background: #ffffff;
		border-color: #e5e7eb;
		color: #1f2937;
	}

	.upload-form-group input:focus {
		outline: none;
		border-color: #6366f1;
	}

	.file-name {
		font-size: 12px;
		color: #a1a1aa;
	}

	:global(html:not(.dark)) .file-name {
		color: #6b7280;
	}

	.form-hint {
		font-size: 11px;
		color: #71717a;
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
		padding: 8px 16px;
		border: none;
		border-radius: 4px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.upload-btn {
		background: #6366f1;
		color: #ffffff;
	}

	.upload-btn:hover:not(:disabled) {
		background: #4f46e5;
	}

	.upload-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.cancel-btn {
		background: #3a3a3a;
		color: #a1a1aa;
	}

	.cancel-btn:hover:not(:disabled) {
		background: #4a4a4a;
		color: #ffffff;
	}

	:global(html:not(.dark)) .cancel-btn {
		background: #f3f4f6;
		color: #6b7280;
	}

	:global(html:not(.dark)) .cancel-btn:hover:not(:disabled) {
		background: #e5e7eb;
		color: #1f2937;
	}

	.emojis-loading,
	.emojis-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 32px 16px;
		text-align: center;
		color: #a1a1aa;
		gap: 8px;
	}

	:global(html:not(.dark)) .emojis-loading,
	:global(html:not(.dark)) .emojis-empty {
		color: #6b7280;
	}

	.emojis-empty :global(svg) {
		opacity: 0.5;
	}

	.emojis-empty p {
		margin: 0;
		font-size: 14px;
		font-weight: 500;
	}

	.emojis-empty span {
		font-size: 12px;
	}

	.emojis-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		gap: 12px;
	}

	.emoji-item {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 8px;
		background: #1a1a1a;
		border: 1px solid #404040;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.emoji-item:hover {
		background: #2a2a2a;
		border-color: #555;
	}

	:global(html:not(.dark)) .emoji-item {
		background: #f9fafb;
		border-color: #e5e7eb;
	}

	:global(html:not(.dark)) .emoji-item:hover {
		background: #f3f4f6;
		border-color: #d1d5db;
	}

	.emoji-preview {
		width: 32px;
		height: 32px;
		object-fit: contain;
		image-rendering: -webkit-optimize-contrast;
		image-rendering: crisp-edges;
		margin-bottom: 6px;
	}

	.emoji-info {
		width: 100%;
		text-align: center;
	}

	.emoji-name {
		font-size: 11px;
		color: #a1a1aa;
		font-family: 'Courier New', monospace;
		word-break: break-word;
	}

	:global(html:not(.dark)) .emoji-name {
		color: #6b7280;
	}

	.emoji-delete-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
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

	.sounds-intro {
		margin: 0 0 12px 0;
		font-size: 12px;
		line-height: 1.45;
		color: #a1a1aa;
	}

	:global(html:not(.dark)) .sounds-intro {
		color: #6b7280;
	}

	.sounds-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
		gap: 12px;
	}

	.sound-tile {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 14px 10px 12px;
		min-height: 96px;
		box-sizing: border-box;
		background: #1a1a1a;
		border: 1px solid #404040;
		border-radius: 8px;
	}

	:global(html:not(.dark)) .sound-tile {
		background: #f9fafb;
		border-color: #e5e7eb;
	}

	.sound-tile-delete {
		position: absolute;
		top: 6px;
		right: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		padding: 0;
		background: rgba(42, 42, 42, 0.95);
		border: 1px solid #555;
		border-radius: 4px;
		color: #ef4444;
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 0.15s ease,
			border-color 0.15s ease,
			background 0.15s ease;
	}

	.sound-tile:hover .sound-tile-delete,
	.sound-tile-delete:focus-visible {
		opacity: 1;
	}

	.sound-tile-delete:hover {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.55);
	}

	:global(html:not(.dark)) .sound-tile-delete {
		background: rgba(255, 255, 255, 0.95);
		border-color: #e5e7eb;
	}

	:global(html:not(.dark)) .sound-tile-delete:hover {
		background: rgba(239, 68, 68, 0.12);
		border-color: rgba(239, 68, 68, 0.45);
	}

	.sound-play-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		margin-top: 2px;
		padding: 0;
		background: #2a2a2a;
		border: 1px solid #555;
		border-radius: 6px;
		color: #e4e4e7;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			color 0.15s ease,
			background 0.15s ease;
	}

	.sound-play-btn:hover {
		border-color: #6366f1;
		color: #fff;
		background: #333;
	}

	.sound-play-btn :global(svg) {
		display: block;
		flex-shrink: 0;
	}

	:global(html:not(.dark)) .sound-play-btn {
		background: #f3f4f6;
		border-color: #d1d5db;
		color: #374151;
	}

	:global(html:not(.dark)) .sound-play-btn:hover {
		border-color: #6366f1;
		color: #1f2937;
		background: #e5e7eb;
	}

	.sound-tile-name {
		font-size: 12px;
		font-weight: 600;
		line-height: 1.25;
		text-align: center;
		color: #fff;
		font-family: 'Courier New', monospace;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(html:not(.dark)) .sound-tile-name {
		color: #1f2937;
	}

	.stats-section {
		background: #2d2d2d;
		border: 1px solid #404040;
		border-radius: 8px;
		overflow: hidden;
	}

	:global(html:not(.dark)) .stats-section {
		background: #ffffff;
		border-color: #e5e7eb;
	}

	.stats-header {
		padding: 16px;
		border-bottom: 1px solid #404040;
	}

	:global(html:not(.dark)) .stats-header {
		border-bottom-color: #e5e7eb;
	}

	.stats-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #ffffff;
	}

	:global(html:not(.dark)) .stats-header h3 {
		color: #1f2937;
	}

	.stats-content {
		padding: 16px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}

	.info-card {
		background: #3a3a3a;
		border-radius: 6px;
		padding: 16px;
	}

	:global(html:not(.dark)) .info-card {
		background: #f9fafb;
	}

	.info-label {
		font-size: 12px;
		color: #a1a1aa;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 4px;
	}

	:global(html:not(.dark)) .info-label {
		color: #6b7280;
	}

	.info-value {
		font-size: 24px;
		font-weight: 600;
		color: #ffffff;
	}

	:global(html:not(.dark)) .info-value {
		color: #1f2937;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.content-columns {
			flex-direction: column-reverse;
		}

		.right-column {
			flex: 0 0 auto;
		}
	}

	@media (max-width: 768px) {
		.chat-page {
			gap: 16px;
			padding: 0 12px;
			overflow-x: hidden;
		}

		.content-columns {
			gap: 16px;
		}

		.section-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.header-actions {
			flex-wrap: wrap;
			width: 100%;
		}

		.page-title {
			font-size: 20px;
		}

		.stats-content {
			padding: 12px;
		}

		.stats-grid {
			gap: 12px;
		}

		.info-card {
			padding: 12px;
		}

		.info-value {
			font-size: 20px;
		}
	}

	@media (max-width: 480px) {
		.chat-page {
			padding: 0 8px;
			gap: 12px;
			min-height: auto;
		}

		.content-columns {
			gap: 12px;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
