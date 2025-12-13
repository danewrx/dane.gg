<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import EmojiPicker from './EmojiPicker.svelte';
	import { Smile } from 'lucide-svelte';

	let globalWsInstance: WebSocket | null = null;
	
	// Notification sound
	const NOTIFICATION_STORAGE_KEY = 'chatNotificationsEnabled';
	let notificationsEnabled = $state(true);
	let notificationAudio: HTMLAudioElement | null = null;
	let audioUnlocked = false;
	let currentNickname = $state<string | null>(null);
	
	// Track recently sent messages to avoid playing notification for own messages
	let recentlySentMessages: { message: string; timestamp: number }[] = [];
	
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
		color?: string;
		source?: 'web' | 'discord' | 'admin';
	}

	interface AdminConfigData {
		nickname?: string;
		color?: string;
	}

	interface WebSocketMessage {
		type: 'message' | 'system' | 'error' | 'history' | 'userCount' | 'delete' | 'adminConfig' | 'emojiUpdate';
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
	let showEmojiPicker = $state(false);
	let emojiPickerReloadTrigger = $state(0);
	let isLoadingEmojis = $state(false);
	let chatInput: HTMLInputElement | null = null;
	let chatInputDiv: HTMLDivElement | null = null;
	let emojiAutocompleteOpen = $state(false);
	let emojiAutocompleteMatches = $state<Array<{ name: string; emoji: string; isCustom: boolean; imageUrl?: string }>>([]);
	let emojiAutocompleteIndex = $state(0);
	let emojiAutocompleteQuery = $state('');
	let allEmojis = $state<Array<{ name: string; emoji: string; isCustom: boolean; imageUrl?: string }>>([]);
	
	let { userCount = $bindable(0) }: { userCount?: number } = $props();

	function getInputText(): string {
		if (!chatInputDiv) return inputValue;
		
		let text = '';
		const walker = document.createTreeWalker(
			chatInputDiv,
			NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
			null
		);
		
		let node;
		while (node = walker.nextNode()) {
			if (node.nodeType === Node.TEXT_NODE) {
				text += node.textContent || '';
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				if (el.tagName === 'IMG' && el.classList.contains('emoji-inline')) {
					const alt = el.getAttribute('alt') || '';
					text += alt;
				}
			}
		}
		
		return text;
	}
	
	function getCaretPosition(): number {
		if (!chatInputDiv) return 0;
		
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return 0;
		
		const range = selection.getRangeAt(0);
		const preCaretRange = range.cloneRange();
		preCaretRange.selectNodeContents(chatInputDiv);
		preCaretRange.setEnd(range.endContainer, range.endOffset);
		
		let position = 0;
		const walker = document.createTreeWalker(
			chatInputDiv,
			NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
			null
		);
		
		let node;
		while (node = walker.nextNode()) {
			if (node === range.endContainer) {
				if (node.nodeType === Node.TEXT_NODE) {
					position += range.endOffset;
				}
				break;
			}
			
			if (node.nodeType === Node.TEXT_NODE) {
				position += (node.textContent || '').length;
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				if (el.tagName === 'IMG' && el.classList.contains('emoji-inline')) {
					const alt = el.getAttribute('alt') || '';
					position += alt.length;
				}
			}
		}
		
		return position;
	}
	
	function setCaretPosition(position: number) {
		if (!chatInputDiv) return;
		
		const selection = window.getSelection();
		if (!selection) return;
		
		const range = document.createRange();
		let currentPos = 0;
		
		const walker = document.createTreeWalker(
			chatInputDiv,
			NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
			null
		);
		
		let node;
		while (node = walker.nextNode()) {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent || '';
				if (currentPos + text.length >= position) {
					range.setStart(node, position - currentPos);
					range.setEnd(node, position - currentPos);
					break;
				}
				currentPos += text.length;
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				if (el.tagName === 'IMG' && el.classList.contains('emoji-inline')) {
					const alt = el.getAttribute('alt') || '';
					if (currentPos + alt.length >= position) {
						range.setStartAfter(el);
						range.setEndAfter(el);
						break;
					}
					currentPos += alt.length;
				}
			}
		}
		
		selection.removeAllRanges();
		selection.addRange(range);
	}

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
			// Add ?public=true to explicitly mark this as a public chat connection
			const wsUrl = `${protocol}//${host}/ws/chat?public=true`;
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
					} else if (data.type === 'emojiUpdate') {
						// Reload emojis when update is broadcast
						loadAllEmojis();
						emojiPickerReloadTrigger++;
					}
					// adminConfig messages are received but we don't need to track them
					// since the color is now stored with each message
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
		if (!ws || !isConnected) {
			return;
		}

		const message = getInputText().trim();
		if (!message) {
			return;
		}
		
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
		if (chatInputDiv) {
			chatInputDiv.textContent = '';
			chatInputDiv.classList.add('show-placeholder');
		}
	}

	function isEmptyContentEditable(element: HTMLElement): boolean {
		if (!element) return true;
		const text = element.textContent?.trim() || '';
		const images = element.querySelectorAll('img.emoji-inline');
		return text === '' && images.length === 0;
	}
	
	function handleInputFocus() {
		if (chatInputDiv) {
			chatInputDiv.classList.remove('show-placeholder');
		}
	}
	
	function handleInputBlur() {
		if (chatInputDiv && isEmptyContentEditable(chatInputDiv)) {
			chatInputDiv.classList.add('show-placeholder');
		}
	}

	// Handle Enter key
	function handleKeyDown(event: KeyboardEvent) {
		if (emojiAutocompleteOpen) {
			handleAutocompleteKeyDown(event);
			return;
		}
		
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}


	// Load all emojis (default + custom)
	async function loadAllEmojis() {
		if (!browser || isLoadingEmojis) return;
		
		try {
			const defaultEmojis = [
				// Smileys
				{ name: 'smile', emoji: '😀', isCustom: false },
				{ name: 'grin', emoji: '😃', isCustom: false },
				{ name: 'joy', emoji: '😂', isCustom: false },
				{ name: 'wink', emoji: '😉', isCustom: false },
				{ name: 'blush', emoji: '😊', isCustom: false },
				// Hearts
				{ name: 'heart', emoji: '❤️', isCustom: false },
				{ name: 'orange_heart', emoji: '🧡', isCustom: false },
				{ name: 'yellow_heart', emoji: '💛', isCustom: false },
				{ name: 'green_heart', emoji: '💚', isCustom: false },
				{ name: 'blue_heart', emoji: '💙', isCustom: false },
				{ name: 'purple_heart', emoji: '💜', isCustom: false },
				// Gestures
				{ name: 'thumbsup', emoji: '👍', isCustom: false },
				{ name: 'thumbsdown', emoji: '👎', isCustom: false },
				{ name: 'ok_hand', emoji: '👌', isCustom: false },
				{ name: 'clap', emoji: '👏', isCustom: false },
				{ name: 'pray', emoji: '🙏', isCustom: false },
				// Reactions
				{ name: 'fire', emoji: '🔥', isCustom: false },
				{ name: 'star', emoji: '⭐', isCustom: false },
				{ name: 'sparkles', emoji: '✨', isCustom: false },
				{ name: 'party', emoji: '🎉', isCustom: false },
				{ name: 'trophy', emoji: '🏆', isCustom: false },
				// Symbols
				{ name: 'check', emoji: '✅', isCustom: false },
				{ name: 'x', emoji: '❌', isCustom: false },
				{ name: 'question', emoji: '❓', isCustom: false },
				{ name: 'exclamation', emoji: '❗', isCustom: false },
			];
			
			// Load custom emojis
			const response = await fetch('/api/emojis');
			if (response.ok) {
				const data = await response.json();
				const customEmojis = (data.data || []).map((e: any) => ({
					name: e.name,
					emoji: `:${e.name}:`,
					isCustom: true,
					imageUrl: e.imageUrl
				}));
				allEmojis = [...defaultEmojis, ...customEmojis];
			} else {
				allEmojis = defaultEmojis;
			}
		} catch (error) {
			console.error('Failed to load emojis:', error);
		} finally {
			isLoadingEmojis = false;
		}
	}

	// Handle emoji selection from picker
	function handleEmojiSelect(event: CustomEvent<{ emoji: string; isCustom?: boolean; imageUrl?: string }>) {
		if (!chatInputDiv) return;
		
		const { emoji: emojiText, isCustom, imageUrl } = event.detail;
		
		let emojiToInsert = emojiText;
		if (emojiText.startsWith(':') && emojiText.endsWith(':')) {
			const emojiName = emojiText.slice(1, -1).toLowerCase();
			
			const emoji = allEmojis.find(e => e.name.toLowerCase() === emojiName);
			if (emoji) {
				if (!emoji.isCustom) {
					emojiToInsert = emoji.emoji;
				}
			} else {
				const emojiPickerMap: Record<string, string> = {
					// Smileys
					'smile': '😀', 'grin': '😃', 'smile_big': '😄', 'grin_wide': '😁', 'laugh': '😆',
					'sweat_smile': '😅', 'rofl': '🤣', 'joy': '😂', 'slight_smile': '🙂', 'upside_down': '🙃',
					'wink': '😉', 'blush': '😊', 'innocent': '😇', 'love_eyes': '🥰', 'heart_eyes': '😍',
					'star_eyes': '🤩', 'kiss': '😘', 'kiss_light': '😗', 'kiss_blush': '😚', 'kiss_smile': '😙',
					// Hearts
					'heart': '❤️', 'orange_heart': '🧡', 'yellow_heart': '💛', 'green_heart': '💚', 'blue_heart': '💙',
					'purple_heart': '💜', 'black_heart': '🖤', 'white_heart': '🤍', 'brown_heart': '🤎', 'broken_heart': '💔',
					'heart_fire': '❤️‍🔥', 'heart_bandage': '❤️‍🩹', 'two_hearts': '💕', 'revolving_hearts': '💞',
					'beating_heart': '💓', 'growing_heart': '💗', 'sparkling_heart': '💖', 'cupid': '💘',
					'gift_heart': '💝', 'heart_decoration': '💟',
					// Gestures
					'thumbsup': '👍', 'thumbsdown': '👎', 'ok_hand': '👌', 'peace': '✌️', 'crossed_fingers': '🤞',
					'love_you': '🤟', 'rock_on': '🤘', 'call_me': '🤙', 'point_left': '👈', 'point_right': '👉',
					'point_up': '👆', 'point_down': '👇', 'point_up_one': '☝️', 'clap': '👏', 'raised_hands': '🙌',
					'open_hands': '👐', 'palms_up': '🤲', 'handshake': '🤝', 'pray': '🙏', 'writing': '✍️',
					// Reactions
					'fire': '🔥', 'hundred': '💯', 'star': '⭐', 'sparkles': '✨', 'star2': '🌟',
					'dizzy': '💫', 'zap': '⚡', 'boom': '💥', 'anger': '💢', 'sweat_drops': '💦',
					'dash': '💨', 'party': '🎉', 'confetti': '🎊', 'balloon': '🎈', 'gift': '🎁',
					'trophy': '🏆', 'first_place': '🥇', 'second_place': '🥈', 'third_place': '🥉', 'medal': '🎖️',
					// Animals
					'dog': '🐶', 'cat': '🐱', 'mouse': '🐭', 'hamster': '🐹', 'rabbit': '🐰',
					'fox': '🦊', 'bear': '🐻', 'panda': '🐼', 'koala': '🐨', 'tiger': '🐯',
					'lion': '🦁', 'cow': '🐮', 'pig': '🐷', 'frog': '🐸', 'monkey': '🐵',
					'chicken': '🐔', 'penguin': '🐧', 'bird': '🐦', 'baby_chick': '🐤', 'eagle': '🦅',
					// Food
					'apple': '🍎', 'banana': '🍌', 'grapes': '🍇', 'strawberry': '🍓', 'peach': '🍑',
					'cherries': '🍒', 'pizza': '🍕', 'hamburger': '🍔', 'fries': '🍟', 'hotdog': '🌭',
					'popcorn': '🍿', 'doughnut': '🍩', 'cookie': '🍪', 'birthday': '🎂', 'cake': '🍰',
					'cupcake': '🧁', 'chocolate': '🍫', 'candy': '🍬', 'lollipop': '🍭', 'custard': '🍮',
					// Objects (note: 'mouse' for computer mouse is handled separately if needed)
					'computer': '💻', 'iphone': '📱', 'watch': '⌚', 'desktop': '🖥️', 'printer': '🖨️',
					'keyboard': '⌨️', 'trackball': '🖲️', 'joystick': '🕹️', 'clamp': '🗜️',
					'floppy_disk': '💾', 'cd': '💿', 'dvd': '📀', 'vhs': '📼', 'camera': '📷',
					'camera_flash': '📸', 'video_camera': '📹', 'movie_camera': '🎥', 'tv': '📺', 'radio': '📻',
					// Symbols
					'check': '✅', 'x': '❌', 'o': '⭕', 'question': '❓', 'question_white': '❔',
					'exclamation': '❗', 'exclamation_white': '❕', 'speech_balloon': '💬', 'thought_balloon': '💭',
					'anger_balloon': '🗯️', 'spades': '♠️', 'hearts': '♥️', 'diamonds': '♦️', 'clubs': '♣️',
					'joker': '🃏', 'mahjong': '🀄', 'flower_playing_cards': '🎴', 'performing_arts': '🎭',
					'frame_photo': '🖼️', 'art': '🎨'
				};
				
				if (emojiPickerMap[emojiName]) {
					emojiToInsert = emojiPickerMap[emojiName];
				}
			}
		}
		
		chatInputDiv.focus();
		
		// Get current cursor position
		const selection = window.getSelection();
		let range: Range;
		
		if (!selection || selection.rangeCount === 0) {
			range = document.createRange();
			range.selectNodeContents(chatInputDiv);
			range.collapse(false);
		} else {
			range = selection.getRangeAt(0);
			
			if (!chatInputDiv.contains(range.commonAncestorContainer)) {
				range.selectNodeContents(chatInputDiv);
				range.collapse(false);
			}
		}
		
		range.deleteContents();
		
		if (isCustom && imageUrl) {
			const img = document.createElement('img');
			img.src = imageUrl;
			img.alt = emojiText;
			img.className = 'emoji-inline';
			img.style.cssText = 'width: 1.375em; height: 1.375em; max-width: 22px; max-height: 22px; vertical-align: -0.2em; display: inline-block; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;';
			range.insertNode(img);
			range.setStartAfter(img);
		} else {
			const textNode = document.createTextNode(emojiToInsert);
			range.insertNode(textNode);
			range.setStartAfter(textNode);
		}
		
		range.collapse(true);
		selection?.removeAllRanges();
		selection?.addRange(range);
		
		inputValue = getInputText();
		
		setTimeout(() => {
			if (chatInputDiv) {
				chatInputDiv.focus();
				const sel = window.getSelection();
				if (sel) {
					const range = document.createRange();
					range.selectNodeContents(chatInputDiv);
					range.collapse(false);
					sel.removeAllRanges();
					sel.addRange(range);
				}
			}
		}, 0);
		
		showEmojiPicker = false;
	}

	// Handle autocomplete for :emojiname: syntax
	function handleInputChange() {
		if (!chatInputDiv) return;
		
		const text = getInputText();
		const cursorPos = getCaretPosition();
		inputValue = text;
		
		if (isEmptyContentEditable(chatInputDiv)) {
			chatInputDiv.classList.add('show-placeholder');
		} else {
			chatInputDiv.classList.remove('show-placeholder');
		}
		
		const beforeCursor = text.substring(0, cursorPos);
		const afterCursor = text.substring(cursorPos);
		
		const completeMatch = beforeCursor.match(/:([a-zA-Z0-9_-]+):$/);
		
		if (completeMatch && completeMatch[1].length > 0 && allEmojis.length > 0) {
			const emojiName = completeMatch[1].toLowerCase();
			const emoji = allEmojis.find(e => e.name.toLowerCase() === emojiName);
			
			if (emoji) {
				// Prevent recursive calls
				if ((chatInputDiv as any).__convertingEmoji) return;
				(chatInputDiv as any).__convertingEmoji = true;
				
				const start = cursorPos - completeMatch[0].length;
				const currentText = getInputText();
				
				if (!chatInputDiv) {
					(chatInputDiv as any).__convertingEmoji = false;
					return;
				}
				
				const beforeText = currentText.substring(0, start);
				const afterText = currentText.substring(start + completeMatch[0].length);
				
				chatInputDiv.textContent = beforeText;
				
				if (emoji.isCustom && emoji.imageUrl) {
					// Insert custom emoji as image
					const img = document.createElement('img');
					img.src = emoji.imageUrl;
					img.alt = `:${emoji.name}:`;
					img.className = 'emoji-inline';
					img.style.cssText = 'width: 1.375em; height: 1.375em; max-width: 22px; max-height: 22px; vertical-align: -0.2em; display: inline-block; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;';
					chatInputDiv.appendChild(img);
				} else {
					// Insert default emoji as text
					const emojiTextNode = document.createTextNode(emoji.emoji);
					chatInputDiv.appendChild(emojiTextNode);
				}
				
				if (afterText) {
					const afterTextNode = document.createTextNode(afterText);
					chatInputDiv.appendChild(afterTextNode);
				}
				
				// Restore cursor position
				setTimeout(() => {
					if (!chatInputDiv) {
						(chatInputDiv as any).__convertingEmoji = false;
						return;
					}
					
					const selection = window.getSelection();
					if (!selection) {
						(chatInputDiv as any).__convertingEmoji = false;
						return;
					}
					
					let newRange = document.createRange();
					if (emoji.isCustom && emoji.imageUrl) {
						const img = chatInputDiv.querySelector('img.emoji-inline:last-of-type');
						if (img) {
							newRange.setStartAfter(img);
						} else {
							newRange.selectNodeContents(chatInputDiv);
							newRange.collapse(false);
						}
					} else {
						// Find emoji text node
						const walker = document.createTreeWalker(
							chatInputDiv,
							NodeFilter.SHOW_TEXT,
							null
						);
						let emojiNode: Text | null = null;
						let pos = 0;
						let node;
						while (node = walker.nextNode()) {
							const text = (node as Text).textContent || '';
							if (pos + text.length >= start + emoji.emoji.length) {
								emojiNode = node as Text;
								break;
							}
							pos += text.length;
						}
						if (emojiNode) {
							const offset = Math.min(start + emoji.emoji.length - pos, emojiNode.textContent?.length || 0);
							newRange.setStart(emojiNode, offset);
						} else {
							newRange.selectNodeContents(chatInputDiv);
							newRange.collapse(false);
						}
					}
					
					newRange.collapse(true);
					selection.removeAllRanges();
					selection.addRange(newRange);
					chatInputDiv.focus();
					inputValue = getInputText();
					emojiAutocompleteOpen = false;
					(chatInputDiv as any).__convertingEmoji = false;
				}, 0);
				
				return;
			}
		}
		
		// Find the :emojiname: pattern before cursor for autocomplete
		const match = beforeCursor.match(/:([a-zA-Z0-9_-]*)$/);
		
		if (match && match[1].length > 0) {
			const query = match[1].toLowerCase();
			emojiAutocompleteQuery = query;
			
			const matches = allEmojis.filter(e => 
				e.name.toLowerCase().startsWith(query)
			).slice(0, 8);
			
			if (matches.length > 0) {
				emojiAutocompleteMatches = matches;
				emojiAutocompleteIndex = 0;
				emojiAutocompleteOpen = true;
			} else {
				emojiAutocompleteOpen = false;
			}
		} else {
			emojiAutocompleteOpen = false;
		}
	}

	function insertAutocompleteEmoji(emoji: { name: string; emoji: string; isCustom: boolean; imageUrl?: string }) {
		if (!chatInputDiv) return;
		
		const text = getInputText();
		const cursorPos = getCaretPosition();
		const beforeCursor = text.substring(0, cursorPos);
		const match = beforeCursor.match(/:([a-zA-Z0-9_-]*)$/);
		
		if (match) {
			const start = cursorPos - match[0].length;
			const selection = window.getSelection();
			
			if (selection && selection.rangeCount > 0) {
				const range = selection.getRangeAt(0);
				const textNode = range.startContainer;
				
				if (textNode.nodeType === Node.TEXT_NODE && textNode.parentNode === chatInputDiv) {
					const nodeText = textNode.textContent || '';
					const beforePattern = nodeText.substring(0, start);
					const afterPattern = nodeText.substring(cursorPos);
					
					if (emoji.isCustom && emoji.imageUrl) {
						// Create image element for custom emoji
						const img = document.createElement('img');
						img.src = emoji.imageUrl;
						img.alt = `:${emoji.name}:`;
						img.className = 'emoji-inline';
						img.style.cssText = 'width: 1.375em; height: 1.375em; max-width: 22px; max-height: 22px; vertical-align: -0.2em; display: inline-block; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;';
						
						const beforeNode = document.createTextNode(beforePattern);
						const afterNode = document.createTextNode(afterPattern);
						
						textNode.parentNode?.replaceChild(beforeNode, textNode);
						beforeNode.parentNode?.insertBefore(img, beforeNode.nextSibling);
						img.parentNode?.insertBefore(afterNode, img.nextSibling);
						
						setTimeout(() => {
							const newRange = document.createRange();
							newRange.setStartAfter(img);
							newRange.setEndAfter(img);
							const sel = window.getSelection();
							sel?.removeAllRanges();
							sel?.addRange(newRange);
							chatInputDiv?.focus();
						}, 0);
					} else {
						textNode.textContent = beforePattern + emoji.emoji + afterPattern;
						setTimeout(() => {
							const newPos = start + emoji.emoji.length;
							setCaretPosition(newPos);
							chatInputDiv?.focus();
						}, 0);
					}
					
					inputValue = getInputText();
				}
			}
		}
		
		emojiAutocompleteOpen = false;
	}

	function handleAutocompleteKeyDown(event: KeyboardEvent) {
		if (!emojiAutocompleteOpen || emojiAutocompleteMatches.length === 0) return;
		
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			emojiAutocompleteIndex = (emojiAutocompleteIndex + 1) % emojiAutocompleteMatches.length;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			emojiAutocompleteIndex = emojiAutocompleteIndex === 0 
				? emojiAutocompleteMatches.length - 1 
				: emojiAutocompleteIndex - 1;
		} else if (event.key === 'Enter' || event.key === 'Tab') {
			event.preventDefault();
			insertAutocompleteEmoji(emojiAutocompleteMatches[emojiAutocompleteIndex]);
		} else if (event.key === 'Escape') {
			emojiAutocompleteOpen = false;
		}
	}

	function toggleEmojiPicker() {
		showEmojiPicker = !showEmojiPicker;
	}

	function handleClickOutside(event: MouseEvent) {
		if (showEmojiPicker && !(event.target as HTMLElement).closest('.emoji-picker') && !(event.target as HTMLElement).closest('.emoji-button')) {
			showEmojiPicker = false;
		}
	}

	$effect(() => {
		if (showEmojiPicker && browser) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});

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

	function renderEmojiMessage(message: string): string {
		let html = message
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
		
		// Replace :emojiname: with emoji images or characters
		html = html.replace(/:([a-zA-Z0-9_-]+):/g, (match, name) => {
			const emoji = allEmojis.find(e => e.name.toLowerCase() === name.toLowerCase());
			if (emoji) {
				if (emoji.isCustom && emoji.imageUrl) {
					return `<img src="${emoji.imageUrl}" alt=":${emoji.name}:" class="custom-emoji-inline" title=":${emoji.name}:" style="width: 1.375em; height: 1.375em; max-width: 22px; max-height: 22px; vertical-align: -0.2em; display: inline-block; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;">`;
				} else {
					return emoji.emoji;
				}
			}
			return match;
		});
		
		return html;
	}

	onMount(() => {
		if (browser) {
			loadAllEmojis();
			try {
				// Initialize notification audio
				notificationAudio = new Audio('/assets/sounds/notification.mp3');
				notificationAudio.volume = 0.5;
				
				// Add listeners to unlock audio on first user interaction
				document.addEventListener('click', unlockAudio);
				document.addEventListener('keydown', unlockAudio);
				document.addEventListener('touchstart', unlockAudio);
				
				loadNotificationSetting();
				currentNickname = getSavedNickname();
				
				// Listen for notification setting changes
				window.addEventListener('chatNotificationSettingChanged', handleNotificationSettingChange as EventListener);
				
				// Connect to WebSocket (admin config will be received on connect)
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
						<span class="msg-time">{formatTimestamp(chatMsg.timestamp)}</span>
						<span class="msg-nickname" style={chatMsg.color ? `color: ${chatMsg.color}; font-weight: bold;` : ''}>
							&lt;{chatMsg.nickname}{#if chatMsg.source === 'discord'}<span class="discord-badge" title="From Discord">
									<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="white"/>
									</svg>
								</span>{:else if chatMsg.source === 'admin'}<span class="crown-badge" title="Admin">
									<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3H5v2h14v-2z" fill="white"/>
									</svg>
								</span>{/if}&gt;
						</span>
						<span class="msg-content">
							{@html renderEmojiMessage(chatMsg.message)}
						</span>
					</div>
				{/if}
			{/each}
		</div>
	</div>
	
	<div class="chat-input-container">
		<div class="input-wrapper">
			<span class="input-prompt">$</span>
			<div class="input-container">
				<div
					class="chat-input show-placeholder"
					contenteditable={isConnected}
					bind:this={chatInputDiv}
					data-placeholder="Use /nick to set a name"
					onkeydown={handleKeyDown}
					oninput={handleInputChange}
					onfocus={handleInputFocus}
					onblur={handleInputBlur}
					role="textbox"
					tabindex="0"
					aria-label="Chat input"
				></div>
				{#if emojiAutocompleteOpen && emojiAutocompleteMatches.length > 0}
					<div class="emoji-autocomplete">
						{#each emojiAutocompleteMatches as match, index}
							<button
								class="autocomplete-item"
								class:active={index === emojiAutocompleteIndex}
								onclick={() => insertAutocompleteEmoji(match)}
								type="button"
							>
							{#if match.isCustom && match.imageUrl}
								<img 
									src={match.imageUrl} 
									alt={match.name}
									class="autocomplete-emoji-img"
								/>
								{:else}
									<span class="autocomplete-emoji">{match.emoji}</span>
								{/if}
								<span class="autocomplete-name">:{match.name}:</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
			<div class="input-actions">
				<div class="emoji-picker-wrapper">
					<button 
						class="emoji-button"
						onclick={toggleEmojiPicker}
						type="button"
						disabled={!isConnected}
						title="Add emoji"
					>
						<Smile size={18} />
					</button>
					<EmojiPicker 
						bind:isOpen={showEmojiPicker}
						reloadTrigger={emojiPickerReloadTrigger}
						on:select={handleEmojiSelect}
					/>
				</div>
				<button 
					class="send-button"
					onclick={sendMessage}
					disabled={!isConnected || !getInputText().trim()}
					title="Send message"
				>
					&gt;
				</button>
			</div>
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

	.discord-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		margin-left: 4px;
		margin-right: 0;
		background: transparent;
		border: 1px solid white;
		border-radius: 2px;
		vertical-align: middle;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
		flex-shrink: 0;
		overflow: hidden;
		position: relative;
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

	.crown-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		margin-left: 4px;
		margin-right: 0;
		background: transparent;
		border: 1px solid white;
		border-radius: 2px;
		vertical-align: middle;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
		flex-shrink: 0;
		overflow: hidden;
		position: relative;
	}

	.crown-badge svg {
		width: 9px;
		height: 9px;
		display: block;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
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
		position: relative;
	}

	.input-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.emoji-picker-wrapper {
		position: relative;
	}

	.emoji-button {
		background: #3a3a3a;
		border: 1px solid #555;
		color: #e8e8e8;
		padding: 6px;
		cursor: pointer;
		font-family: 'Courier New', monospace;
		min-width: 32px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		border-radius: 2px;
	}

	.emoji-button:hover:not(:disabled) {
		background: #4a4a4a;
		border-color: #666;
		color: #ffffff;
	}

	.emoji-button:active:not(:disabled) {
		background: #2a2a2a;
		border-color: #444;
	}

	.emoji-button:disabled {
		background: #2a2a2a;
		border-color: #333;
		opacity: 0.5;
		cursor: not-allowed;
	}

	.input-container {
		position: relative;
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.emoji-autocomplete {
		position: absolute;
		bottom: 100%;
		left: 0;
		margin-bottom: 4px;
		background: #1a1a1a;
		border: 1px solid #666;
		border-radius: 0;
		max-height: 200px;
		overflow-y: auto;
		z-index: 100;
		min-width: 200px;
		font-family: 'Courier New', monospace;
	}

	.autocomplete-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		background: transparent;
		border: none;
		border-bottom: 1px solid #333;
		color: #e8e8e8;
		cursor: pointer;
		width: 100%;
		text-align: left;
		font-size: 13px;
		transition: background 0.1s;
	}

	.autocomplete-item:last-child {
		border-bottom: none;
	}

	.autocomplete-item:hover,
	.autocomplete-item.active {
		background: #3a3a3a;
	}

	.autocomplete-emoji,
	.autocomplete-emoji-img {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
	}

	.autocomplete-emoji-img {
		object-fit: contain;
		image-rendering: -webkit-optimize-contrast;
		image-rendering: crisp-edges;
	}

	.autocomplete-name {
		font-family: 'Courier New', monospace;
	}

	.custom-emoji-inline {
		display: inline-block;
		width: 1.375em;
		height: 1.375em;
		vertical-align: -0.2em;
		image-rendering: -webkit-optimize-contrast;
		image-rendering: crisp-edges;
		object-fit: contain;
		max-width: 22px;
		max-height: 22px;
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
		width: 100%;
		padding: 0;
		background: transparent;
		border: none;
		color: #e8e8e8 !important;
		font-family: 'Courier New', monospace;
		font-size: 14px;
		line-height: 1.5;
		min-height: 20px;
		height: auto;
		outline: none;
		box-sizing: border-box;
		min-width: 0;
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.chat-input.show-placeholder:before {
		content: attr(data-placeholder);
		color: #b0b0b0 !important;
		pointer-events: none;
	}
	
	.chat-input:not(.show-placeholder):before {
		content: '';
	}

	.chat-input:not([contenteditable="true"]) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.chat-input .emoji-inline {
		width: 1.375em;
		height: 1.375em;
		max-width: 22px;
		max-height: 22px;
		vertical-align: -0.2em;
		display: inline-block;
		object-fit: contain;
		image-rendering: -webkit-optimize-contrast;
		image-rendering: crisp-edges;
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

