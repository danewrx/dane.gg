<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let globalWsInstance: WebSocket | null = null;
	
	// Notification sound
	const NOTIFICATION_STORAGE_KEY = 'chatNotificationsEnabled';
	let notificationsEnabled = $state(true);
	let notificationAudio: HTMLAudioElement | null = null;
	let audioUnlocked = false;
	let currentNickname = $state<string | null>(null);
	
	// Admin nickname and color
	let adminNickname = $state<string>('Admin');
	let adminColor = $state<string>('#f5b700');
	
	// Track recently sent messages to avoid playing notification for own messages
	let recentlySentMessages: { message: string; timestamp: number }[] = [];
	
	async function loadAdminConfig() {
		try {
			const [nicknameRes, colorRes] = await Promise.all([
				fetch('/api/config/admin_chat_nickname'),
				fetch('/api/config/admin_chat_color')
			]);
			
			if (nicknameRes.ok) {
				const data = await nicknameRes.json();
				if (data.success && data.data?.value) {
					adminNickname = data.data.value;
				}
			}
			
			if (colorRes.ok) {
				const data = await colorRes.json();
				if (data.success && data.data?.value) {
					adminColor = data.data.value;
				}
			}
		} catch (error) {
		}
	}
	
	// Unlock audio on first user interaction (required by browser autoplay policy)
	function unlockAudio(): void {
		if (audioUnlocked || !notificationAudio) return;
		
		// Play and immediately pause to unlock audio
		notificationAudio.volume = 0;
		notificationAudio.play().then(() => {
			notificationAudio!.pause();
			notificationAudio!.currentTime = 0;
			notificationAudio!.volume = 0.5;
			audioUnlocked = true;
			// Remove listeners after unlocking
			document.removeEventListener('click', unlockAudio);
			document.removeEventListener('keydown', unlockAudio);
			document.removeEventListener('touchstart', unlockAudio);
		}).catch(() => {
			// Still blocked, will try again on next interaction
		});
	}

	interface ChatMessage {
		id?: string;
		timestamp: string;
		nickname: string;
		message: string;
		formatted: string;
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

	interface SystemMessage {
		timestamp: string;
		formatted: string;
		isSystem: boolean;
		messageType?: 'connected' | 'nickname' | 'disconnected' | 'other';
	}

	let messages = $state<(ChatMessage | SystemMessage)[]>([]);
	let inputValue = $state('');
	let isConnected = $state(false);
	let connectionStatus = $state<'connecting' | 'connected' | 'disconnected'>('disconnected');
	let ws: WebSocket | null = null;
	let messagesContainer: HTMLDivElement | null = null;
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	let isDestroyed = $state(false);
	let hasDisconnectedMessage = $state(false);
	
	let { userCount = $bindable(0) }: { userCount?: number } = $props();

	// Format timestamp in IRC style using browser's local timezone
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
				// Same day
				return `[${hours}:${minutes}]`;
			} else {
				// Different day
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				const year = date.getFullYear();
				return `[${month}/${day}/${year}, ${hours}:${minutes}]`;
			}
		} catch (error) {
			console.error('Error formatting timestamp:', error);
			return '';
		}
	}

	// Format a full message with timestamp and nickname
	function formatMessage(timestamp: string, nickname: string, message: string): string {
		const timeStr = formatTimestamp(timestamp);
		return `${timeStr} <${nickname}> ${message}`;
	}

	// Load saved nickname from localStorage
	function getSavedNickname(): string | null {
		if (!browser) return null;
		try {
			return localStorage.getItem('chatNickname');
		} catch (error) {
			console.error('Error reading nickname from localStorage:', error);
			return null;
		}
	}

	// Save nickname to localStorage
	function saveNickname(nickname: string): void {
		if (!browser) return;
		try {
			localStorage.setItem('chatNickname', nickname);
			currentNickname = nickname;
		} catch (error) {
			console.error('Error saving nickname to localStorage:', error);
		}
	}

	// Load notification setting from localStorage
	function loadNotificationSetting(): void {
		if (!browser) return;
		try {
			const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
			notificationsEnabled = stored === null ? true : stored === 'true';
		} catch (error) {
			console.error('Error reading notification setting:', error);
		}
	}

	// Play notification sound
	function playNotificationSound(): void {
		if (!browser || !notificationsEnabled || !notificationAudio) return;
		try {
			notificationAudio.currentTime = 0;
			notificationAudio.play().catch(() => {
			});
		} catch (error) {
			console.error('Error playing notification sound:', error);
		}
	}

	// Handle notification setting change from settings panel
	function handleNotificationSettingChange(event: CustomEvent<{ enabled: boolean }>): void {
		notificationsEnabled = event.detail.enabled;
	}

	// Check if a message was recently sent
	function wasMessageSentByMe(messageText: string): boolean {
		const now = Date.now();
		recentlySentMessages = recentlySentMessages.filter(m => now - m.timestamp < 5000);
		
		const index = recentlySentMessages.findIndex(m => m.message === messageText);
		if (index !== -1) {
			recentlySentMessages.splice(index, 1);
			return true;
		}
		return false;
	}

	function trackSentMessage(messageText: string): void {
		recentlySentMessages.push({
			message: messageText,
			timestamp: Date.now()
		});
	}

	// Restore nickname from localStorage
	function restoreNickname(): void {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		
		const savedNickname = getSavedNickname();
		if (savedNickname && savedNickname.trim()) {
			currentNickname = savedNickname.trim();
			ws.send(`/nick_restore ${savedNickname.trim()}`);
		}
	}

	// Get WebSocket URL
	function getWebSocketUrl(): string {
		if (!browser || typeof window === 'undefined') return '';
		
		try {
			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const host = window.location.host;
			const wsUrl = `${protocol}//${host}/ws/chat`;
			console.log('WebSocket URL (proxied through frontend):', wsUrl);
			return wsUrl;
		} catch (error) {
			console.error('Error constructing WebSocket URL:', error);
			return '';
		}
	}

	// Connect to WebSocket
	function connect() {
		if (!browser || isDestroyed) return;

		// Close any existing global connection
		if (globalWsInstance && (globalWsInstance.readyState === WebSocket.CONNECTING || globalWsInstance.readyState === WebSocket.OPEN)) {
			console.log('Closing existing global WebSocket connection before creating new one');
			globalWsInstance.close();
			globalWsInstance = null;
		}

		// Close local connection
		if (ws) {
			if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
				ws.close();
			}
			ws = null;
		}

		// Clear pending reconnection
		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout);
			reconnectTimeout = null;
		}

		try {
			const wsUrl = getWebSocketUrl();
			if (!wsUrl) {
				console.warn('No WebSocket URL available');
				connectionStatus = 'disconnected';
				return;
			}

			connectionStatus = 'connecting';
			console.log('Attempting to connect to WebSocket:', wsUrl);
			ws = new WebSocket(wsUrl);
			globalWsInstance = ws;

			ws.onopen = () => {
				isConnected = true;
				connectionStatus = 'connected';
				console.log('✅ Chat connected successfully');
				
				// Remove disconnected message if it exists (quick reconnect)
				if (hasDisconnectedMessage) {
					messages = messages.filter(msg => {
						if ('isSystem' in msg && msg.isSystem && msg.messageType === 'disconnected') {
							return false;
						}
						return true;
					});
					hasDisconnectedMessage = false;
				}
				
				restoreNickname();
			};

			ws.onmessage = (event) => {
				try {
					const data: WebSocketMessage = JSON.parse(event.data);

					if (data.type === 'message' && data.data && !Array.isArray(data.data) && 'timestamp' in data.data) {
						const msg = data.data as ChatMessage;
						msg.formatted = formatMessage(msg.timestamp, msg.nickname, msg.message);
						messages = [...messages, msg];
						scrollToBottom();
						
						// Play notification sound
						if (!wasMessageSentByMe(msg.message)) {
							playNotificationSound();
						}
					} else if (data.type === 'history' && data.data && Array.isArray(data.data)) {
						// Historical messages
						// Preserve any system messages that were already added
						const existingSystemMessages = messages.filter(msg => 'isSystem' in msg && msg.isSystem);
						const reformattedHistory = (data.data as ChatMessage[]).map((msg: ChatMessage) => ({
							...msg,
							formatted: formatMessage(msg.timestamp, msg.nickname, msg.message)
						}));
						messages = [...reformattedHistory, ...existingSystemMessages];
						scrollToBottom();
					} else if (data.type === 'system' && data.message) {
						// Display system messages
						const now = new Date();
						const hours = String(now.getHours()).padStart(2, '0');
						const minutes = String(now.getMinutes()).padStart(2, '0');
						
						// Determine message type based on content
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
							formatted: `[${hours}:${minutes}] <System> ${data.message}`,
							isSystem: true,
							messageType
						};
						messages = [...messages, systemMsg];
						scrollToBottom();
					} else if (data.type === 'error' && data.message) {
						console.error('Chat error:', data.message);
					} else if (data.type === 'userCount' && typeof data.count === 'number') {
						userCount = data.count;
					} else if (data.type === 'delete' && data.messageId) {
						messages = messages.filter(msg => {
							if ('isSystem' in msg) return true;
							return (msg as ChatMessage).id !== data.messageId;
						});
					} else if (data.type === 'adminConfig' && data.data) {
						const config = data.data as { nickname?: string; color?: string };
						if (config.nickname) {
							adminNickname = config.nickname;
						}
						if (config.color) {
							adminColor = config.color;
						}
					}
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			};

			ws.onerror = (error) => {
				console.error('❌ WebSocket error:', error);
				console.error('WebSocket readyState:', ws?.readyState);
				connectionStatus = 'disconnected';
				
				// Clear all messages and show disconnected message
				if (messages.length > 0) {
					const now = new Date();
					const hours = String(now.getHours()).padStart(2, '0');
					const minutes = String(now.getMinutes()).padStart(2, '0');
					const disconnectedMsg: SystemMessage = {
						timestamp: now.toISOString(),
						formatted: `[${hours}:${minutes}] <System> Disconnected from chat`,
						isSystem: true,
						messageType: 'disconnected'
					};
					messages = [disconnectedMsg];
					hasDisconnectedMessage = true;
					scrollToBottom();
				}
			};

			ws.onclose = (event) => {
				isConnected = false;
				connectionStatus = 'disconnected';
				console.log('Chat disconnected. Code:', event.code, 'Reason:', event.reason || 'No reason', 'WasClean:', event.wasClean);

				// Clear all messages and show disconnected message
				const now = new Date();
				const hours = String(now.getHours()).padStart(2, '0');
				const minutes = String(now.getMinutes()).padStart(2, '0');
				const disconnectedMsg: SystemMessage = {
					timestamp: now.toISOString(),
					formatted: `[${hours}:${minutes}] <System> Disconnected from chat`,
					isSystem: true,
					messageType: 'disconnected'
				};
				messages = [disconnectedMsg];
				hasDisconnectedMessage = true;
				scrollToBottom();

				// Clear the WS references
				if (globalWsInstance === ws) {
					globalWsInstance = null;
				}
				ws = null;

				// Attempt to reconnect
				if (reconnectTimeout) {
					clearTimeout(reconnectTimeout);
				}
				reconnectTimeout = setTimeout(() => {
					if (!isConnected && connectionStatus === 'disconnected' && !isDestroyed) {
						console.log('Attempting to reconnect...');
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
		
		// Handle /nick command and save to localStorage
		if (message.startsWith('/nick ')) {
			const nickname = message.substring(6).trim();
			if (nickname) {
				saveNickname(nickname);
			}
		} else {
			trackSentMessage(message);
		}
		
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

	// Force disconnect (testing only)
	function forceDisconnect() {
		if (ws) {
			ws.close();
		}
	}

	// Expose disconnect function to window for console testing
	if (browser && typeof window !== 'undefined') {
		(window as any).chatDisconnect = forceDisconnect;
	}

	onMount(() => {
		if (browser) {
			try {
				// Initialize notification audio
				notificationAudio = new Audio('/assets/sounds/notification.mp3');
				notificationAudio.volume = 0.5;
				
				// Add listeners to unlock audio on first user interaction
				document.addEventListener('click', unlockAudio);
				document.addEventListener('keydown', unlockAudio);
				document.addEventListener('touchstart', unlockAudio);
				
				loadNotificationSetting();
				loadAdminConfig();
				
				currentNickname = getSavedNickname();
				
				// Listen for notification setting changes
				window.addEventListener('chatNotificationSettingChanged', handleNotificationSettingChange as EventListener);
				
				setTimeout(() => {
					connect();
					setTimeout(() => {
						scrollToBottom();
					}, 100);
				}, 50);
			} catch (error) {
				console.error('Error initializing chat:', error);
				connectionStatus = 'disconnected';
			}
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
		
		// Clear global reference
		if (globalWsInstance) {
			globalWsInstance.close();
			globalWsInstance = null;
		}
		
		// Clean up notification event listeners
		if (browser) {
			window.removeEventListener('chatNotificationSettingChanged', handleNotificationSettingChange as EventListener);
			document.removeEventListener('click', unlockAudio);
			document.removeEventListener('keydown', unlockAudio);
			document.removeEventListener('touchstart', unlockAudio);
		}
		notificationAudio = null;
	});
</script>

<div class="chat-container">
	<div class="chat-messages" bind:this={messagesContainer}>
		<div class="messages-wrapper">
			{#each messages as msg}
				{#if 'isSystem' in msg && msg.isSystem}
					{@const systemMsg = msg as SystemMessage}
					{@const parts = systemMsg.formatted.match(/^(\[[^\]]+\]\s*<[^>]+>)\s*(.+)$/)}
					<div class="message-line system" class:connected={systemMsg.messageType === 'connected'} class:nickname={systemMsg.messageType === 'nickname'} class:disconnected={systemMsg.messageType === 'disconnected'}>
						{#if parts}
							<span class="system-prefix">{parts[1]}</span> <span class="system-message">{parts[2]}</span>
						{:else}
							{systemMsg.formatted}
						{/if}
					</div>
				{:else}
					{@const chatMsg = msg as ChatMessage}
					<div class="message-line">
						<span class="msg-time">{formatTimestamp(chatMsg.timestamp)}</span> <span class="msg-nickname" style={chatMsg.nickname === adminNickname ? `color: ${adminColor}; font-weight: bold;` : ''}>&lt;{chatMsg.nickname}&gt;</span> <span class="msg-content">{chatMsg.message}</span>
					</div>
				{/if}
			{/each}
		</div>
	</div>
	
	<div class="chat-input-container">
		<div class="input-wrapper">
			<span class="input-prompt">$</span>
			<input
				type="text"
				class="chat-input"
				placeholder="Use /nick to set a name"
				bind:value={inputValue}
				onkeydown={handleKeyDown}
				disabled={!isConnected}
			/>
			<button 
				class="send-button"
				onclick={sendMessage}
				disabled={!isConnected || !inputValue.trim()}
				title="Send message"
			>
				&gt;
			</button>
		</div>
	</div>
</div>

<style>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 200px;
		width: 100%;
		font-family: 'Courier New', monospace;
		padding-top: 12px;
		padding-bottom: 10px;
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0;
		color: #e8e8e8 !important;
		font-size: 14px;
		line-height: 1.5;
		min-height: 0;
	}

	.messages-wrapper {
		display: flex;
		flex-direction: column;
		min-height: 100%;
		justify-content: flex-end;
	}

	.chat-messages::-webkit-scrollbar {
		width: 8px;
	}

	.chat-messages::-webkit-scrollbar-track {
		background: transparent;
	}

	.chat-messages::-webkit-scrollbar-thumb {
		background: #666;
		border-radius: 4px;
	}

	.chat-messages::-webkit-scrollbar-thumb:hover {
		background: #777;
	}

	.message-line {
		margin-bottom: 2px;
		word-wrap: break-word;
		white-space: pre-wrap;
		color: #e8e8e8 !important;
	}

	.msg-time {
		color: #888;
	}

	.msg-nickname {
		color: #e8e8e8;
		font-weight: normal;
	}

	.msg-content {
		color: #e8e8e8;
	}

	.message-line.system {
		color: #e8e8e8 !important;
	}

	.message-line.system .system-prefix {
		color: #e8e8e8 !important;
	}

	.message-line.system.connected .system-message {
		color: #90ee90 !important;
	}

	.message-line.system.nickname .system-message {
		color: #87ceeb !important;
	}

	.message-line.system.disconnected .system-message {
		color: #ffb6c1 !important;
	}

	.message-line.system:not(.connected):not(.nickname):not(.disconnected) .system-message {
		color: #e8e8e8 !important;
	}

	.chat-input-container {
		border-top: 1px solid #666;
		padding: 2px 0 0 0;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
		border-top: 1px solid rgba(102, 102, 102, 0.3);
		border-bottom: 1px solid rgba(102, 102, 102, 0.3);
		margin-top: 2px;
	}

	.input-prompt {
		color: #e8e8e8 !important;
		font-size: 14px;
		font-weight: bold;
		user-select: none;
		line-height: 1;
		display: flex;
		align-items: center;
	}

	.chat-input {
		flex: 1;
		padding: 0;
		background: transparent;
		border: none;
		color: #e8e8e8 !important;
		font-family: 'Courier New', monospace;
		font-size: 14px;
		line-height: 1;
		height: auto;
		outline: none;
		box-sizing: border-box;
		display: flex;
		align-items: center;
	}

	.chat-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.chat-input::placeholder {
		color: #b0b0b0 !important;
	}

	.send-button {
		background: #3a3a3a;
		border: 1px solid #555;
		color: #e8e8e8 !important;
		padding: 6px 12px;
		cursor: pointer;
		font-family: 'Courier New', monospace;
		font-size: 15px;
		font-weight: bold;
		min-width: 40px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		border-radius: 2px;
	}

	.send-button:hover:not(:disabled) {
		background: #4a4a4a;
		border-color: #666;
		color: #ffffff !important;
	}

	.send-button:active:not(:disabled) {
		background: #2a2a2a;
		border-color: #444;
	}

	.send-button:disabled {
		background: #2a2a2a;
		border-color: #333;
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Light mode support - keep light colors even in light mode for terminal aesthetic */
	:global(html:not(.dark)) .chat-messages {
		color: #e8e8e8 !important;
	}

	:global(html:not(.dark)) .message-line {
		color: #e8e8e8 !important;
	}

	:global(html:not(.dark)) .msg-time {
		color: #888 !important;
	}

	:global(html:not(.dark)) .msg-nickname {
		color: #e8e8e8;
	}

	:global(html:not(.dark)) .msg-content {
		color: #e8e8e8 !important;
	}

	:global(html:not(.dark)) .message-line.system {
		color: #e8e8e8 !important;
	}

	:global(html:not(.dark)) .message-line.system .system-prefix {
		color: #e8e8e8 !important;
	}

	:global(html:not(.dark)) .message-line.system.connected .system-message {
		color: #90ee90 !important;
	}

	:global(html:not(.dark)) .message-line.system.nickname .system-message {
		color: #87ceeb !important;
	}

	:global(html:not(.dark)) .message-line.system.disconnected .system-message {
		color: #ffb6c1 !important;
	}

	:global(html:not(.dark)) .message-line.system:not(.connected):not(.nickname):not(.disconnected) .system-message {
		color: #e8e8e8 !important;
	}

	:global(html:not(.dark)) .chat-input-container {
		border-top-color: #999;
	}

	:global(html:not(.dark)) .input-prompt {
		color: #e8e8e8 !important;
	}

	:global(html:not(.dark)) .chat-input {
		color: #e8e8e8 !important;
	}

	:global(html:not(.dark)) .chat-input::placeholder {
		color: #b0b0b0 !important;
	}

	:global(html:not(.dark)) .send-button {
		color: #e8e8e8 !important;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.chat-container {
			height: 180px;
		}

		.chat-messages {
			font-size: 12px;
			padding: 10px;
		}

		.chat-input {
			font-size: 12px;
			padding: 6px 10px;
		}
	}
</style>

