<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { MessageSquare, Users, Send, RefreshCw, Trash2 } from 'lucide-svelte';

	interface ChatMessage {
		id?: string;
		timestamp: string;
		nickname: string;
		message: string;
		formatted?: string;
	}

	interface SystemMessage {
		timestamp: string;
		formatted: string;
		isSystem: boolean;
		messageType?: 'connected' | 'nickname' | 'disconnected' | 'other';
	}

	interface WebSocketMessage {
		type: 'message' | 'system' | 'error' | 'history' | 'userCount' | 'delete';
		data?: ChatMessage | ChatMessage[];
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
				
				// Set admin nickname
				ws?.send('/nick_restore Admin');
			};

			ws.onmessage = (event) => {
				try {
					const data: WebSocketMessage = JSON.parse(event.data);

					if (data.type === 'message' && data.data && !Array.isArray(data.data)) {
						const msg = data.data;
						messages = [...messages, msg];
						scrollToBottom();
					} else if (data.type === 'history' && data.data && Array.isArray(data.data)) {
						const existingSystemMessages = messages.filter(msg => 'isSystem' in msg && msg.isSystem);
						messages = [...data.data, ...existingSystemMessages];
						scrollToBottom();
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

	onMount(() => {
		if (browser) {
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
				<div class="messages-container" bind:this={messagesContainer}>
					{#if messages.length === 0}
						<div class="empty-state">
							<MessageSquare size={48} />
							<p>No messages yet</p>
							<span>Messages from the site chat will appear here</span>
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
								<span class="message-nickname">{chatMsg.nickname}</span>
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
	}

	.message-nickname::after {
		content: ':';
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

