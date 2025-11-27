<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let globalWsInstance: WebSocket | null = null;

	interface ChatMessage {
		timestamp: string;
		nickname: string;
		message: string;
		formatted: string;
	}

	interface WebSocketMessage {
		type: 'message' | 'system' | 'error' | 'history';
		data?: ChatMessage | ChatMessage[];
		message?: string;
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
			};

			ws.onmessage = (event) => {
				try {
					const data: WebSocketMessage = JSON.parse(event.data);

					if (data.type === 'message' && data.data && !Array.isArray(data.data)) {
						messages = [...messages, data.data];
						scrollToBottom();
					} else if (data.type === 'history' && data.data && Array.isArray(data.data)) {
						// Historical messages
						// Preserve any system messages that were already added
						const existingSystemMessages = messages.filter(msg => 'isSystem' in msg && msg.isSystem);
						messages = [...data.data, ...existingSystemMessages];
						scrollToBottom();
					} else if (data.type === 'system' && data.message) {
						// Display system messages
						const now = new Date();
						const hours = String(now.getHours()).padStart(2, '0');
						const minutes = String(now.getMinutes()).padStart(2, '0');
						
						// Determine message type based on content
						let messageType: 'connected' | 'nickname' | 'disconnected' | 'other' = 'other';
						if (data.message.toLowerCase().includes('connected to chat')) {
							messageType = 'connected';
						} else if (data.message.toLowerCase().includes('nickname changed')) {
							messageType = 'nickname';
						} else if (data.message.toLowerCase().includes('disconnected')) {
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
					<div class="message-line">
						{msg.formatted}
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

