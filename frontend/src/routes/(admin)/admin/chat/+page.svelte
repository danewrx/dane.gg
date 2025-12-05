<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { MessageSquare, Users, Send, RefreshCw, Trash2, Pencil, Check, X, Loader2 } from 'lucide-svelte';

	interface ChatMessage {
		id?: string;
		timestamp: string;
		nickname: string;
		message: string;
		formatted?: string;
		color?: string;
		source?: 'web' | 'discord' | 'admin';
	}

	interface SystemMessage {
		timestamp: string;
		formatted: string;
		isSystem: boolean;
		messageType?: 'connected' | 'nickname' | 'disconnected' | 'other';
	}

	interface AdminConfigData {
		nickname?: string;
		color?: string;
	}

	interface WebSocketMessage {
		type: 'message' | 'system' | 'error' | 'history' | 'userCount' | 'delete' | 'adminConfig';
		data?: ChatMessage | ChatMessage[] | AdminConfigData;
		message?: string;
		count?: number;
		messageId?: string;
	}

	let messages = $state<(ChatMessage | SystemMessage)[]>([]);
	let inputValue = $state('');
	let isConnected = $state(false);
	let connectionStatus = $state<'connecting' | 'connected' | 'disconnected'>('disconnected');
	let ws: WebSocket | null = null;
	let messagesContainer: HTMLDivElement | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	let isDestroyed = $state(false);
	let userCount = $state(0);
	
	let adminNickname = $state('Admin');
	let isEditingNickname = $state(false);
	let nicknameInput = $state('');
	let isSavingNickname = $state(false);
	let hasRestoredNickname = $state(false);
	
	let adminColor = $state('#f5b700');
	let isSavingColor = $state(false);
	
	// Lazy loading state
	let isLoadingMore = $state(false);
	let hasMoreMessages = $state(true);
	let nextCursor = $state<string | null>(null);
	let isInitialLoad = $state(true);
	
	// Save admin nickname via WebSocket
	function saveAdminNickname(nickname: string): void {
		if (ws && isConnected) {
			ws.send(`/set_admin_nickname ${nickname}`);
		}
	}
	
	// Save admin color via WebSocket
	function saveAdminColor(color: string): void {
		if (ws && isConnected) {
			ws.send(`/set_admin_color ${color}`);
		}
	}

	
	// Load messages from API with pagination
	async function loadMessages(before?: string): Promise<void> {
		if (!browser || isLoadingMore) return;
		
		isLoadingMore = true;
		
		try {
			const params = new URLSearchParams({ limit: '50' });
			if (before) {
				params.set('before', before);
			}
			
			const response = await fetch(`/api/chat/messages?${params}`, {
				credentials: 'include'
			});
			
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					const newMessages = result.data.messages as ChatMessage[];
					hasMoreMessages = result.data.hasMore;
					nextCursor = result.data.nextCursor;
					
					if (before) {
						const scrollHeight = messagesContainer?.scrollHeight || 0;
						messages = [...newMessages, ...messages];
						
						requestAnimationFrame(() => {
							if (messagesContainer) {
								const newScrollHeight = messagesContainer.scrollHeight;
								messagesContainer.scrollTop = newScrollHeight - scrollHeight;
							}
						});
					} else {
						messages = newMessages;
						isInitialLoad = false;
						scrollToBottom();
					}
				}
			}
		} catch (error) {
			console.error('Failed to load messages:', error);
		} finally {
			isLoadingMore = false;
		}
	}
	
	// Handle scroll for lazy loading
	function handleScroll(event: Event) {
		const target = event.target as HTMLDivElement;
		if (!target || isLoadingMore || !hasMoreMessages) return;
		
		// Load more when scrolled at top (within 100px)
		if (target.scrollTop < 100 && nextCursor) {
			loadMessages(nextCursor);
		}
	}

	function handleColorChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const newColor = target.value;
		if (newColor !== adminColor) {
			isSavingColor = true;
			saveAdminColor(newColor);
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
		if (newNickname && newNickname !== adminNickname) {
			isSavingNickname = true;
			saveAdminNickname(newNickname);
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

	// Format timestamp
	function formatTimestamp(timestamp: string): string {
		if (!browser) return '';
		
		try {
			const date = new Date(timestamp);
			const now = new Date();
			const isToday = 
				date.getDate() === now.getDate() &&
				date.getMonth() === now.getMonth() &&
				date.getFullYear() === now.getFullYear();

			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');

			if (isToday) {
				return `${hours}:${minutes}`;
			} else {
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${month}/${day} ${hours}:${minutes}`;
			}
		} catch (error) {
			console.error('Error formatting timestamp:', error);
			return '';
		}
	}

	// Get WebSocket URL
	function getWebSocketUrl(): string {
		if (!browser || typeof window === 'undefined') return '';
		
		try {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const host = window.location.host;
			return `${protocol}//${host}/ws/chat`;
		} catch (error) {
			console.error('Error constructing WebSocket URL:', error);
			return '';
		}
	}

	// Connect to WebSocket
	function connect() {
		if (!browser || isDestroyed) return;

		if (ws) {
			if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
				ws.close();
			}
			ws = null;
		}

		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = null;
		}

		try {
			const wsUrl = getWebSocketUrl();
			if (!wsUrl) {
				connectionStatus = 'disconnected';
				return;
			}

			connectionStatus = 'connecting';
			ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				isConnected = true;
				connectionStatus = 'connected';
			};

			ws.onmessage = (event) => {
				try {
					const data: WebSocketMessage = JSON.parse(event.data);

					if (data.type === 'message' && data.data && !Array.isArray(data.data) && 'timestamp' in data.data) {
						const msg = data.data as ChatMessage;
						messages = [...messages, msg];
						scrollToBottom();
					} else if (data.type === 'history') {
						// Ignore WebSocket history
					} else if (data.type === 'system' && data.message) {
						const now = new Date();
						
						let messageType: 'connected' | 'nickname' | 'disconnected' | 'other' = 'other';
						const msgLower = data.message.toLowerCase();
						if (msgLower.includes('connected to chat')) {
							messageType = 'connected';
						} else if (msgLower.includes('nickname changed') || msgLower.includes('nickname set')) {
							messageType = 'nickname';
						} else if (msgLower.includes('disconnected')) {
							messageType = 'disconnected';
						}
						
						const systemMsg: SystemMessage = {
							timestamp: now.toISOString(),
							formatted: data.message,
							isSystem: true,
							messageType
						};
						messages = [...messages, systemMsg];
						scrollToBottom();
					} else if (data.type === 'userCount' && typeof data.count === 'number') {
						userCount = data.count;
					} else if (data.type === 'delete' && data.messageId) {
						// Remove deleted message from the list
						messages = messages.filter(msg => {
							if ('isSystem' in msg) return true; // Keep system messages
							return (msg as ChatMessage).id !== data.messageId;
						});
					} else if (data.type === 'error' && data.message) {
						console.error('Server error:', data.message);
					} else if (data.type === 'adminConfig' && data.data) {
						const config = data.data as { nickname?: string; color?: string };
						
						if (config.nickname) {
							const nicknameChanged = config.nickname !== adminNickname;
							adminNickname = config.nickname;
							
							if ((!hasRestoredNickname || nicknameChanged) && ws) {
								ws.send(`/nick_restore ${config.nickname}`);
								hasRestoredNickname = true;
							}
						}
						if (config.color) {
							adminColor = config.color;
						}
					}
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			};

			ws.onerror = () => {
				connectionStatus = 'disconnected';
			};

			ws.onclose = () => {
				isConnected = false;
				connectionStatus = 'disconnected';
				ws = null;
				hasRestoredNickname = false;

				if (reconnectTimeout) {
					clearTimeout(reconnectTimeout);
				}
				reconnectTimeout = setTimeout(() => {
					if (!isConnected && connectionStatus === 'disconnected' && !isDestroyed) {
						connect();
					}
				}, 3000);
			};
		} catch (error) {
			console.error('Error connecting to chat:', error);
			connectionStatus = 'disconnected';
			isConnected = false;
		}
	}

	// Send message
	function sendMessage() {
		if (!ws || !isConnected || !inputValue.trim()) {
			return;
		}

		const message = inputValue.trim();
		ws.send(message);
		inputValue = '';
	}

	// Handle Enter key
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	// Scroll to bottom
	function scrollToBottom() {
		if (messagesContainer) {
			requestAnimationFrame(() => {
				if (messagesContainer) {
					messagesContainer.scrollTop = messagesContainer.scrollHeight;
				}
			});
		}
	}

	// Reconnect
	function handleReconnect() {
		connect();
	}

	// Delete message
	function deleteMessage(messageId: string | undefined) {
		if (!ws || !isConnected || !messageId) return;
		ws.send(`/delete ${messageId}`);
	}

	onMount(async () => {
		if (browser) {

			await loadMessages();
			connect();
		}
	});

	onDestroy(() => {
		isDestroyed = true;
		
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = null;
		}
		
		if (ws) {
			isConnected = false;
			connectionStatus = 'disconnected';
			ws.close();
			ws = null;
		}
	});
</script>

<svelte:head>
	<title>Chat - Admin Dashboard - dane.gg</title>
</svelte:head>

<div class="chat-page">
	<section class="header-section">
		<div class="section-header">
			<h1 class="page-title">
				<MessageSquare size={24} />
				Site Chat
			</h1>
			<div class="header-actions">
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
		</div>
	</section>

	<div class="content-columns">
		<!-- Left Column - Chat -->
		<section class="chat-section">
			<div class="chat-container">
				<div class="messages-container" bind:this={messagesContainer} onscroll={handleScroll}>
					{#if isLoadingMore}
						<div class="loading-more">
							<Loader2 size={16} class="spin" />
							<span>Loading older messages...</span>
						</div>
					{:else if hasMoreMessages && messages.length > 0}
						<div class="load-more-hint">
							<span>Scroll up for older messages</span>
						</div>
					{/if}
					{#if messages.length === 0 && !isInitialLoad}
						<div class="empty-state">
							<MessageSquare size={48} />
							<p>No messages yet</p>
							<span>Messages from the site chat will appear here</span>
						</div>
					{:else if isInitialLoad}
						<div class="empty-state">
							<Loader2 size={48} class="spin" />
							<p>Loading messages...</p>
						</div>
					{:else}
						{#each messages as msg, i (i)}
							{#if 'isSystem' in msg && msg.isSystem}
								<div class="message system-message" class:connected={msg.messageType === 'connected'} class:nickname={msg.messageType === 'nickname'} class:disconnected={msg.messageType === 'disconnected'}>
									<span class="message-time">{formatTimestamp(msg.timestamp)}</span>
									<span class="message-content system">{msg.formatted}</span>
								</div>
						{:else}
							{@const chatMsg = msg as ChatMessage}
							<div class="message">
								<span class="message-time">{formatTimestamp(chatMsg.timestamp)}</span>
								<span class="message-nickname" style={chatMsg.color ? `color: ${chatMsg.color}` : ''}>
									{chatMsg.nickname}
									{#if chatMsg.source === 'discord'}
										<span class="discord-badge" title="From Discord">
											<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418z" fill="white"/>
											</svg>
										</span>
									{/if}
								</span>
								<span class="message-content">{chatMsg.message}</span>
								{#if chatMsg.id}
									<button 
										class="delete-btn" 
										onclick={() => deleteMessage(chatMsg.id)}
										title="Delete message"
									>
										<Trash2 size={14} />
									</button>
								{/if}
							</div>
						{/if}
						{/each}
					{/if}
				</div>

				<div class="input-container">
					<input
						type="text"
						class="message-input"
						placeholder={isConnected ? "Type a message..." : "Connecting..."}
						bind:value={inputValue}
						onkeydown={handleKeyDown}
						disabled={!isConnected}
					/>
					<button 
						class="send-btn"
						onclick={sendMessage}
						disabled={!isConnected || !inputValue.trim()}
					>
						<Send size={18} />
					</button>
				</div>
			</div>
		</section>

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
							<div class="info-value">{messages.filter(m => !('isSystem' in m)).length}</div>
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
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
	}

	.header-section {
		flex-shrink: 0;
	}

	.content-columns {
		display: flex;
		gap: 24px;
		flex: 1;
		min-height: 0;
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
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
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

	.content-columns {
		display: flex;
		gap: 24px;
		flex: 1;
		min-height: 0;
	}

	.chat-section {
		flex: 0 0 60%;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.right-column {
		flex: 0 0 40%;
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
		transition: background 0.2s, color 0.2s;
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
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
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

	.chat-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: #2d2d2d;
		border: 1px solid #404040;
		border-radius: 8px;
		overflow: hidden;
	}

	:global(html:not(.dark)) .chat-container {
		background: #ffffff;
		border-color: #e5e7eb;
	}

	.messages-container {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #6b7280;
		gap: 12px;
	}

	.empty-state p {
		margin: 0;
		font-size: 16px;
		font-weight: 500;
	}

	.empty-state span {
		font-size: 14px;
		color: #a1a1aa;
	}

	.loading-more {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px;
		color: #a1a1aa;
		font-size: 13px;
		border-bottom: 1px solid #404040;
		margin-bottom: 8px;
	}

	:global(html:not(.dark)) .loading-more {
		border-bottom-color: #e5e7eb;
	}

	.load-more-hint {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		color: #6b7280;
		font-size: 12px;
		border-bottom: 1px solid #404040;
		margin-bottom: 8px;
	}

	:global(html:not(.dark)) .load-more-hint {
		border-bottom-color: #e5e7eb;
	}

	.message {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding: 8px 12px;
		background: #3a3a3a;
		border-radius: 6px;
		font-size: 14px;
		line-height: 1.5;
	}

	:global(html:not(.dark)) .message {
		background: #f9fafb;
	}

	.message.system-message {
		background: transparent;
		padding: 4px 12px;
	}

	.message-time {
		color: #6b7280;
		font-size: 12px;
		font-family: 'JetBrains Mono', monospace;
		flex-shrink: 0;
	}

	.message-nickname {
		color: var(--accent-color, #3b82f6);
		font-weight: 600;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.message-nickname::after {
		content: ':';
	}

	.discord-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		background: transparent;
		border: 1px solid #ffffff;
		border-radius: 2px;
		vertical-align: middle;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
		flex-shrink: 0;
		overflow: hidden;
		position: relative;
	}

	:global(html:not(.dark)) .discord-badge {
		border-color: #1f2937;
	}

	.discord-badge svg {
		width: 9px;
		height: 9px;
		display: block;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.message-content {
		color: #ffffff;
		word-break: break-word;
	}

	:global(html:not(.dark)) .message-content {
		color: #1f2937;
	}

	.message-content.system {
		color: #a1a1aa;
		font-style: italic;
	}

	.message.connected .message-content.system {
		color: #22c55e;
	}

	.message.nickname .message-content.system {
		color: #60a5fa;
	}

	.message.disconnected .message-content.system {
		color: #f87171;
	}

	.delete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: #6b7280;
		cursor: pointer;
		transition: background 0.2s, color 0.2s;
		margin-left: auto;
		flex-shrink: 0;
	}

	.delete-btn:hover {
		background: #ef4444;
		color: white;
	}

	:global(html:not(.dark)) .delete-btn:hover {
		background: #ef4444;
		color: white;
	}

	.input-container {
		display: flex;
		gap: 12px;
		padding: 16px;
		border-top: 1px solid #404040;
		background: #252525;
	}

	:global(html:not(.dark)) .input-container {
		border-top-color: #e5e7eb;
		background: #f9fafb;
	}

	.message-input {
		flex: 1;
		padding: 12px 16px;
		background: #3a3a3a;
		border: 1px solid #404040;
		border-radius: 6px;
		color: #ffffff;
		font-size: 14px;
		outline: none;
		transition: border-color 0.2s;
	}

	:global(html:not(.dark)) .message-input {
		background: #ffffff;
		border-color: #d1d5db;
		color: #1f2937;
	}

	.message-input:focus {
		border-color: var(--accent-color, #3b82f6);
	}

	.message-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.message-input::placeholder {
		color: #6b7280;
	}

	.send-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: var(--accent-color, #3b82f6);
		border: none;
		border-radius: 6px;
		color: white;
		cursor: pointer;
		transition: background 0.2s;
	}

	.send-btn:hover:not(:disabled) {
		background: var(--accent-color-dark, #2563eb);
	}

	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Scrollbar styling */
	.messages-container::-webkit-scrollbar {
		width: 8px;
	}

	.messages-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.messages-container::-webkit-scrollbar-thumb {
		background: #404040;
		border-radius: 4px;
	}

	.messages-container::-webkit-scrollbar-thumb:hover {
		background: #525252;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.content-columns {
			flex-direction: column-reverse;
		}

		.chat-section {
			flex: 1;
			min-height: 400px;
		}

		.right-column {
			flex: 0 0 auto;
		}
	}

	@media (max-width: 768px) {
		.chat-page {
			height: calc(100vh - 180px);
			gap: 16px;
		}

		.section-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.header-actions {
			flex-wrap: wrap;
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
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

