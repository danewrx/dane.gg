<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import EmojiPicker from './EmojiPicker.svelte';
	import EmojiTooltip from './EmojiTooltip.svelte';
	import { Smile } from 'lucide-svelte';
	import {
		getAllDefaultEmojis,
		getEmojiFromName,
		getNameFromEmoji,
		type EmojiData
	} from '$lib/shared/utils/emojiData';
	import { trackEmojiUsage, getRecentEmojis } from '$lib/shared/utils/recentEmojis';
	import {
		DEFAULT_CHAT_NOTIFICATION_SOUND_ID,
		DEFAULT_CHAT_NOTIFICATION_SOUND_URL,
		CHAT_NOTIFICATION_SOUND_ID_KEY,
		CHAT_NOTIFICATION_SOUNDS_UPDATED_EVENT,
		fetchChatNotificationSoundOptions,
		readStoredChatNotificationSoundId,
		resolveChatNotificationSoundUrl
	} from '$lib/shared/utils/chatNotificationSounds';
	import { scheduleReloadSiteConfigAndApplyWeather } from '$lib/site/stores/weather';

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
		notificationAudio
			.play()
			.then(() => {
				notificationAudio!.pause();
				notificationAudio!.currentTime = 0;
				notificationAudio!.volume = 0.5;
				audioUnlocked = true;
				// Remove listeners after unlocking
				document.removeEventListener('click', unlockAudio);
				document.removeEventListener('keydown', unlockAudio);
				document.removeEventListener('touchstart', unlockAudio);
			})
			.catch(() => {
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
		type:
			| 'message'
			| 'system'
			| 'error'
			| 'history'
			| 'userCount'
			| 'delete'
			| 'adminConfig'
			| 'emojiUpdate'
			| 'notificationSoundsUpdate'
			| 'siteConfigUpdate';
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
	let messagesContainer = $state<HTMLDivElement | null>(null);
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	let isDestroyed = $state(false);
	let hasDisconnectedMessage = $state(false);
	let showEmojiPicker = $state(false);
	let emojiPickerReloadTrigger = $state(0);
	let isLoadingEmojis = $state(false);
	let isOpeningEmojiPicker = $state(false);
	let chatInput: HTMLInputElement | null = null;
	let chatInputDiv: HTMLDivElement | null = null;
	let emojiAutocompleteOpen = $state(false);
	let emojiAutocompleteMatches = $state<
		Array<{ name: string; emoji: string; isCustom: boolean; imageUrl?: string }>
	>([]);
	let emojiAutocompleteIndex = $state(0);
	let emojiAutocompleteQuery = $state('');
	let allEmojis = $state<EmojiData[]>([]);

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
		while ((node = walker.nextNode())) {
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
		while ((node = walker.nextNode())) {
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
		while ((node = walker.nextNode())) {
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
			notificationAudio.play().catch(() => {});
		} catch (error) {
			console.error('Error playing notification sound:', error);
		}
	}

	// Handle notification setting change from settings panel
	function handleNotificationSettingChange(event: CustomEvent<{ enabled: boolean }>): void {
		notificationsEnabled = event.detail.enabled;
	}

	function setNotificationAudioUrl(url: string): void {
		if (!browser) return;
		audioUnlocked = false;
		try {
			notificationAudio?.pause();
		} catch {}
		notificationAudio = new Audio(url);
		notificationAudio.volume = 0.5;
	}

	function handleNotificationSoundChange(event: Event): void {
		const e = event as CustomEvent<{ id?: string; url?: string }>;
		if (!e.detail?.url) return;
		setNotificationAudioUrl(e.detail.url);
	}

	async function initNotificationAudio(): Promise<void> {
		const opts = await fetchChatNotificationSoundOptions();
		let sid = readStoredChatNotificationSoundId();
		if (!opts.some((o) => o.id === sid)) {
			sid = DEFAULT_CHAT_NOTIFICATION_SOUND_ID;
			try {
				localStorage.setItem(CHAT_NOTIFICATION_SOUND_ID_KEY, sid);
			} catch {}
		}
		const url = resolveChatNotificationSoundUrl(opts, sid);
		setNotificationAudioUrl(url);
	}

	// Check if a message was recently sent
	function wasMessageSentByMe(messageText: string): boolean {
		const now = Date.now();
		recentlySentMessages = recentlySentMessages.filter((m) => now - m.timestamp < 5000);

		const index = recentlySentMessages.findIndex((m) => m.message === messageText);
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
		if (
			globalWsInstance &&
			(globalWsInstance.readyState === WebSocket.CONNECTING ||
				globalWsInstance.readyState === WebSocket.OPEN)
		) {
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
					messages = messages.filter((msg) => {
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

					if (
						data.type === 'message' &&
						data.data &&
						!Array.isArray(data.data) &&
						'timestamp' in data.data
					) {
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
						const existingSystemMessages = messages.filter(
							(msg) => 'isSystem' in msg && msg.isSystem
						);
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
						messages = messages.filter((msg) => {
							if ('isSystem' in msg) return true;
							return (msg as ChatMessage).id !== data.messageId;
						});
					} else if (data.type === 'emojiUpdate') {
						// Reload emojis when update is broadcast
						loadAllEmojis();
						emojiPickerReloadTrigger++;
					} else if (data.type === 'notificationSoundsUpdate') {
						if (browser) {
							window.dispatchEvent(new CustomEvent(CHAT_NOTIFICATION_SOUNDS_UPDATED_EVENT));
						}
						void initNotificationAudio();
					} else if (data.type === 'siteConfigUpdate') {
						scheduleReloadSiteConfigAndApplyWeather();
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
				console.log(
					'Chat disconnected. Code:',
					event.code,
					'Reason:',
					event.reason || 'No reason',
					'WasClean:',
					event.wasClean
				);

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

	function handleInputBlur(event: FocusEvent) {
		if (showEmojiPicker || isOpeningEmojiPicker) {
			return;
		}

		const relatedTarget = event.relatedTarget as HTMLElement;
		if (relatedTarget) {
			if (relatedTarget.closest('.emoji-button') || relatedTarget.closest('.emoji-picker')) {
				return;
			}
		}

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
			const defaultEmojis = getAllDefaultEmojis();

			// Load custom emojis
			const response = await fetch('/api/emojis');
			if (response.ok) {
				const data = await response.json();
				const customEmojis: EmojiData[] = (data.data || []).map((e: any) => ({
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
	function handleEmojiSelect(
		event: CustomEvent<{ emoji: string; isCustom?: boolean; imageUrl?: string }>
	) {
		if (!chatInputDiv) return;

		const { emoji: emojiText, isCustom, imageUrl } = event.detail;

		let emojiToInsert = emojiText;
		if (emojiText.startsWith(':') && emojiText.endsWith(':')) {
			const emojiName = emojiText.slice(1, -1).toLowerCase();

			const emoji = allEmojis.find((e) => e.name.toLowerCase() === emojiName);
			if (emoji && !emoji.isCustom) {
				emojiToInsert = emoji.emoji;
			} else if (!emoji) {
				const emojiChar = getEmojiFromName(emojiName);
				if (emojiChar) {
					emojiToInsert = emojiChar;
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

		let insertContainer = range.commonAncestorContainer;
		if (insertContainer.nodeType === Node.TEXT_NODE) {
			insertContainer = insertContainer.parentNode as Node;
		}

		if (
			insertContainer &&
			(insertContainer as HTMLElement).nodeName === 'DIV' &&
			insertContainer !== chatInputDiv
		) {
			const startContainer = range.startContainer;
			if (startContainer.nodeType === Node.TEXT_NODE) {
				range.setStart(startContainer, range.startOffset);
			}
		}

		if (isCustom && imageUrl) {
			const img = document.createElement('img');
			img.src = imageUrl;
			img.alt = emojiText;
			img.className = 'emoji-inline';
			img.style.cssText =
				'width: 1.375em; height: 1.375em; max-width: 22px; max-height: 22px; vertical-align: -0.2em; display: inline-block; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;';
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

		chatInputDiv.normalize();

		const divs = chatInputDiv.querySelectorAll('div');
		divs.forEach((div) => {
			const parent = div.parentNode;
			if (parent) {
				while (div.firstChild) {
					parent.insertBefore(div.firstChild, div);
				}
				parent.removeChild(div);
			}
		});

		chatInputDiv.normalize();

		inputValue = getInputText();

		chatInputDiv.focus();

		showEmojiPicker = false;
	}

	// Handle autocomplete for :emojiname: syntax
	function handleInputChange() {
		if (!chatInputDiv) return;

		const text = getInputText();
		const cursorPos = getCaretPosition();
		inputValue = text;

		if (document.activeElement !== chatInputDiv) {
			if (isEmptyContentEditable(chatInputDiv)) {
				chatInputDiv.classList.add('show-placeholder');
			} else {
				chatInputDiv.classList.remove('show-placeholder');
			}
		} else {
			chatInputDiv.classList.remove('show-placeholder');
		}

		const beforeCursor = text.substring(0, cursorPos);
		const afterCursor = text.substring(cursorPos);

		const incompleteMatch = beforeCursor.match(/:([a-zA-Z0-9_-]*)$/);

		const completeMatch = beforeCursor.match(/:([a-zA-Z0-9_-]+):$/);

		if (completeMatch && completeMatch[1].length > 0 && allEmojis.length > 0) {
			const emojiName = completeMatch[1].toLowerCase();
			const emoji = allEmojis.find((e) => e.name.toLowerCase() === emojiName);

			if (emoji) {
				// Track emoji usage
				if (emoji.isCustom && emoji.imageUrl) {
					trackEmojiUsage(`:${emoji.name}:`, emoji.name);
				} else {
					trackEmojiUsage(emoji.emoji, emoji.name);
				}

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
					img.style.cssText =
						'width: 1.375em; height: 1.375em; max-width: 22px; max-height: 22px; vertical-align: -0.2em; display: inline-block; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;';
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
						const walker = document.createTreeWalker(chatInputDiv, NodeFilter.SHOW_TEXT, null);
						let emojiNode: Text | null = null;
						let pos = 0;
						let node;
						while ((node = walker.nextNode())) {
							const text = (node as Text).textContent || '';
							if (pos + text.length >= start + emoji.emoji.length) {
								emojiNode = node as Text;
								break;
							}
							pos += text.length;
						}
						if (emojiNode) {
							const offset = Math.min(
								start + emoji.emoji.length - pos,
								emojiNode.textContent?.length || 0
							);
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

			if (completeMatch && completeMatch[1].length > 0) {
				const query = completeMatch[1].toLowerCase();
				emojiAutocompleteQuery = query;

				const exactMatches: typeof allEmojis = [];
				const startsWithMatches: typeof allEmojis = [];
				const containsMatches: typeof allEmojis = [];

				for (const emoji of allEmojis) {
					const name = emoji.name.toLowerCase();
					if (name === query) {
						exactMatches.push(emoji);
					} else if (name.startsWith(query)) {
						startsWithMatches.push(emoji);
					} else if (name.includes(query)) {
						containsMatches.push(emoji);
					}
				}

				const matches = [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, 8);

				if (matches.length > 0) {
					emojiAutocompleteMatches = matches;
					emojiAutocompleteIndex = 0;
					emojiAutocompleteOpen = true;
				} else {
					emojiAutocompleteOpen = false;
				}
				return;
			}
		}

		const match = incompleteMatch;

		if (match && match[1] !== undefined && allEmojis.length > 0) {
			if (match[1].length === 0) {
				const recentEmojis = getRecentEmojis();
				if (recentEmojis.length > 0) {
					const recentEmojiData: typeof allEmojis = [];
					for (const recent of recentEmojis) {
						const found = allEmojis.find(
							(e) =>
								e.emoji === recent.emoji ||
								e.name.toLowerCase() === recent.name.toLowerCase() ||
								(e.isCustom && `:${e.name}:` === recent.emoji)
						);
						if (found) {
							recentEmojiData.push(found);
						}
					}

					if (recentEmojiData.length > 0) {
						emojiAutocompleteMatches = recentEmojiData.slice(0, 8);
						emojiAutocompleteIndex = 0;
						emojiAutocompleteOpen = true;
						return;
					}
				}

				const popularEmojis = allEmojis
					.filter((e) =>
						['smile', 'joy', 'heart', 'thumbsup', 'fire', 'star', 'ok_hand', 'wave'].includes(
							e.name.toLowerCase()
						)
					)
					.slice(0, 8);
				if (popularEmojis.length > 0) {
					emojiAutocompleteMatches = popularEmojis;
					emojiAutocompleteIndex = 0;
					emojiAutocompleteOpen = true;
					return;
				}
				emojiAutocompleteOpen = false;
				return;
			}

			const query = match[1].toLowerCase();
			if (!/^[a-z0-9_-]*$/.test(query)) {
				emojiAutocompleteOpen = false;
				return;
			}

			emojiAutocompleteQuery = query;

			const exactMatches: typeof allEmojis = [];
			const startsWithMatches: typeof allEmojis = [];
			const containsMatches: typeof allEmojis = [];

			for (const emoji of allEmojis) {
				const name = emoji.name.toLowerCase();
				if (name === query) {
					exactMatches.push(emoji);
				} else if (name.startsWith(query)) {
					startsWithMatches.push(emoji);
				} else if (name.includes(query)) {
					containsMatches.push(emoji);
				}
			}

			const matches = [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, 8);

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

	function insertAutocompleteEmoji(emoji: {
		name: string;
		emoji: string;
		isCustom: boolean;
		imageUrl?: string;
	}) {
		if (!chatInputDiv) return;

		// Track emoji usage
		if (emoji.isCustom && emoji.imageUrl) {
			trackEmojiUsage(`:${emoji.name}:`, emoji.name);
		} else {
			trackEmojiUsage(emoji.emoji, emoji.name);
		}

		const text = getInputText();
		const cursorPos = getCaretPosition();
		const beforeCursor = text.substring(0, cursorPos);
		const match = beforeCursor.match(/:([a-zA-Z0-9_-]*)$/);

		if (match) {
			const start = cursorPos - match[0].length;
			const selection = window.getSelection();

			if (selection && selection.rangeCount > 0) {
				const range = selection.getRangeAt(0);

				if (!chatInputDiv.contains(range.commonAncestorContainer)) {
					range.selectNodeContents(chatInputDiv);
					range.collapse(false);
				}

				range.setStart(range.startContainer, Math.max(0, range.startOffset - match[0].length));
				range.deleteContents();

				if (emoji.isCustom && emoji.imageUrl) {
					const img = document.createElement('img');
					img.src = emoji.imageUrl;
					img.alt = `:${emoji.name}:`;
					img.className = 'emoji-inline';
					img.style.cssText =
						'width: 1.375em; height: 1.375em; max-width: 22px; max-height: 22px; vertical-align: -0.2em; display: inline-block; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;';
					range.insertNode(img);
					range.setStartAfter(img);
				} else {
					const textNode = document.createTextNode(emoji.emoji);
					range.insertNode(textNode);
					range.setStartAfter(textNode);
				}

				range.collapse(true);
				selection.removeAllRanges();
				selection.addRange(range);

				chatInputDiv.normalize();
				const divs = chatInputDiv.querySelectorAll('div');
				divs.forEach((div) => {
					const parent = div.parentNode;
					if (parent) {
						while (div.firstChild) {
							parent.insertBefore(div.firstChild, div);
						}
						parent.removeChild(div);
					}
				});
				chatInputDiv.normalize();

				inputValue = getInputText();
				chatInputDiv.focus();
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
			emojiAutocompleteIndex =
				emojiAutocompleteIndex === 0
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
		isOpeningEmojiPicker = true;
		showEmojiPicker = !showEmojiPicker;
		setTimeout(() => {
			isOpeningEmojiPicker = false;
		}, 100);
	}

	function handleClickOutside(event: MouseEvent) {
		if (
			showEmojiPicker &&
			!(event.target as HTMLElement).closest('.emoji-picker') &&
			!(event.target as HTMLElement).closest('.emoji-button')
		) {
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

	$effect(() => {
		if (
			!showEmojiPicker &&
			chatInputDiv &&
			isEmptyContentEditable(chatInputDiv) &&
			document.activeElement !== chatInputDiv
		) {
			chatInputDiv.classList.add('show-placeholder');
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

		html = html.replace(/:([a-zA-Z0-9_-]+):/g, (match, name) => {
			const emoji = allEmojis.find((e) => e.name.toLowerCase() === name.toLowerCase());
			if (emoji) {
				if (emoji.isCustom && emoji.imageUrl) {
					const imageUrl = emoji.imageUrl.trim();
					if (imageUrl) {
						const escapedName = emoji.name.replace(/"/g, '&quot;');
						const escapedUrl = imageUrl.replace(/"/g, '&quot;');
						return `<span class="emoji-hover" data-tooltip=":${escapedName}:" data-emoji-url="${escapedUrl}">
							<img src="${escapedUrl}" alt=":${escapedName}:" class="custom-emoji-inline">
							<span class="emoji-tooltip-popup"><img src="${escapedUrl}" class="tooltip-emoji-img"><span class="tooltip-name">:${escapedName}:</span></span>
						</span>`;
					}
				}
				const escapedEmoji = emoji.emoji.replace(/"/g, '&quot;');
				const escapedName = emoji.name.replace(/"/g, '&quot;');
				return `<span class="emoji-hover"><span class="emoji-char">${emoji.emoji}</span><span class="emoji-tooltip-popup"><span class="tooltip-emoji-char">${emoji.emoji}</span><span class="tooltip-name">:${escapedName}:</span></span></span>`;
			}
			return match;
		});

		const emojiCharMap = new Map<string, string>();
		for (const emoji of allEmojis) {
			if (!emoji.isCustom && emoji.emoji) {
				emojiCharMap.set(emoji.emoji, emoji.name);
			}
		}

		// Comprehensive emoji regex
		const emojiRegex =
			/(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\p{Emoji_Modifier}|\u200D\p{Emoji_Presentation}|\u200D\p{Emoji}\uFE0F)*/gu;

		const marker = '\x00EMOJI_WRAPPED\x00';
		let markerIndex = 0;
		const wrappedEmojis: string[] = [];

		html = html.replace(/<span class="emoji-hover">[\s\S]*?<\/span><\/span><\/span>/g, (match) => {
			wrappedEmojis.push(match);
			return `${marker}${markerIndex++}${marker}`;
		});

		html = html.replace(emojiRegex, (emojiChar) => {
			if (emojiChar === '\uFE0F' || emojiChar === '\u200D') {
				return emojiChar;
			}

			let name = emojiCharMap.get(emojiChar);
			if (!name) {
				name = getNameFromEmoji(emojiChar) || 'emoji';
			}

			const escapedName = name.replace(/"/g, '&quot;');
			return `<span class="emoji-hover"><span class="emoji-char">${emojiChar}</span><span class="emoji-tooltip-popup"><span class="tooltip-emoji-char">${emojiChar}</span><span class="tooltip-name">:${escapedName}:</span></span></span>`;
		});

		html = html.replace(new RegExp(`${marker}(\\d+)${marker}`, 'g'), (_, index) => {
			return wrappedEmojis[parseInt(index, 10)] || '';
		});

		return html;
	}

	onMount(() => {
		if (browser) {
			loadAllEmojis();
			void (async () => {
				try {
					await initNotificationAudio();

					document.addEventListener('click', unlockAudio);
					document.addEventListener('keydown', unlockAudio);
					document.addEventListener('touchstart', unlockAudio);

					loadNotificationSetting();
					currentNickname = getSavedNickname();

					window.addEventListener(
						'chatNotificationSettingChanged',
						handleNotificationSettingChange as EventListener
					);
					window.addEventListener(
						'chatNotificationSoundChanged',
						handleNotificationSoundChange as EventListener
					);

					setTimeout(() => {
						connect();
						setTimeout(() => {
							scrollToBottom();
						}, 100);
					}, 50);
				} catch (error) {
					console.error('Error initializing chat:', error);
					connectionStatus = 'disconnected';
					try {
						setNotificationAudioUrl(DEFAULT_CHAT_NOTIFICATION_SOUND_URL);
						loadNotificationSetting();
						setTimeout(() => connect(), 50);
					} catch {}
				}
			})();
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
			window.removeEventListener(
				'chatNotificationSettingChanged',
				handleNotificationSettingChange as EventListener
			);
			window.removeEventListener(
				'chatNotificationSoundChanged',
				handleNotificationSoundChange as EventListener
			);
			document.removeEventListener('click', unlockAudio);
			document.removeEventListener('keydown', unlockAudio);
			document.removeEventListener('touchstart', unlockAudio);
		}
		notificationAudio = null;
	});
</script>

<EmojiTooltip bind:container={messagesContainer} />

<div class="chat-container">
	<div class="chat-messages" bind:this={messagesContainer}>
		<div class="messages-wrapper">
			{#each messages as msg}
				{#if 'isSystem' in msg && msg.isSystem}
					{@const systemMsg = msg as SystemMessage}
					{@const parts = systemMsg.formatted.match(/^(\[[^\]]+\]\s*<[^>]+>)\s*(.+)$/)}
					<div
						class="message-line system"
						class:connected={systemMsg.messageType === 'connected'}
						class:nickname={systemMsg.messageType === 'nickname'}
						class:disconnected={systemMsg.messageType === 'disconnected'}
					>
						{#if parts}
							<span class="system-prefix">{parts[1]}</span>
							<span class="system-message">{parts[2]}</span>
						{:else}
							{systemMsg.formatted}
						{/if}
					</div>
				{:else}
					{@const chatMsg = msg as ChatMessage}
					<div class="message-line">
						<span class="msg-time">{formatTimestamp(chatMsg.timestamp)}</span>
						<span
							class="msg-nickname"
							style={chatMsg.color ? `color: ${chatMsg.color}; font-weight: bold;` : ''}
						>
							&lt;{chatMsg.nickname}{#if chatMsg.source === 'discord'}<span
									class="discord-badge"
									title="From Discord"
								>
									<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path
											d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
											fill="white"
										/>
									</svg>
								</span>{:else if chatMsg.source === 'admin'}<span class="crown-badge" title="Admin">
									<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path
											d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3H5v2h14v-2z"
											fill="white"
										/>
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
			</div>
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
								<img src={match.imageUrl} alt={match.name} class="autocomplete-emoji-img" />
							{:else}
								<span class="autocomplete-emoji">{match.emoji}</span>
							{/if}
							<span class="autocomplete-name">:{match.name}:</span>
						</button>
					{/each}
				</div>
			{/if}
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
		color: var(--theme-text-primary, #e8e8e8);
		font-size: calc(14 * 1em / 14);
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
		background: var(--theme-border, #666);
		border-radius: 4px;
	}

	.chat-messages::-webkit-scrollbar-thumb:hover {
		background: var(--theme-text-muted, #777);
	}

	.message-line {
		margin-bottom: 2px;
		word-wrap: break-word;
		white-space: pre-wrap;
		color: var(--theme-text-primary, #e8e8e8);
	}

	.msg-time {
		color: var(--theme-text-muted, #888);
	}

	.msg-nickname {
		color: var(--theme-text-primary, #e8e8e8);
		font-weight: normal;
	}

	.msg-content {
		color: var(--theme-text-primary, #e8e8e8);
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
		border: 1px solid var(--theme-text-primary, white);
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
		border: 1px solid var(--theme-text-primary, white);
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
		color: var(--theme-text-primary, #e8e8e8);
	}

	.message-line.system .system-prefix {
		color: var(--theme-text-primary, #e8e8e8);
	}

	.message-line.system.connected .system-message {
		color: #22c55e;
	}

	.message-line.system.nickname .system-message {
		color: #3b82f6;
	}

	.message-line.system.disconnected .system-message {
		color: #ef4444;
	}

	.message-line.system:not(.connected):not(.nickname):not(.disconnected) .system-message {
		color: var(--theme-text-primary, #e8e8e8);
	}

	.chat-input-container {
		border-top: 1px solid var(--theme-border, #666);
		padding: 2px 0 0 0;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
		border-top: 1px solid color-mix(in srgb, var(--theme-border, #666) 30%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--theme-border, #666) 30%, transparent);
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
		background: var(--theme-background, #3a3a3a);
		border: 1px solid var(--theme-border, #555);
		color: var(--theme-text-primary, #e8e8e8);
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
		background: var(--theme-surface, #4a4a4a);
		border-color: var(--theme-border, #666);
		color: var(--theme-text-primary, #ffffff);
	}

	.emoji-button:active:not(:disabled) {
		background: var(--theme-background, #2a2a2a);
		border-color: var(--theme-border, #444);
	}

	.emoji-button:disabled {
		background: var(--theme-background, #2a2a2a);
		border-color: var(--theme-border, #333);
		opacity: 0.5;
		cursor: not-allowed;
	}

	.input-container {
		position: relative;
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.input-wrapper {
		position: relative;
	}

	.emoji-autocomplete {
		position: absolute;
		bottom: calc(100% + 4px);
		left: 0;
		background: var(--theme-surface, #1a1a1a);
		border: 1px solid var(--theme-border, #666);
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
		border-bottom: 1px solid var(--theme-border, #333);
		color: var(--theme-text-primary, #e8e8e8);
		cursor: pointer;
		width: 100%;
		text-align: left;
		font-size: calc(13 * 1em / 14);
		transition: background 0.1s;
	}

	.autocomplete-item:last-child {
		border-bottom: none;
	}

	.autocomplete-item:hover,
	.autocomplete-item.active {
		background: var(--theme-background, #3a3a3a);
	}

	.autocomplete-emoji,
	.autocomplete-emoji-img {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: calc(16 * 1em / 14);
	}

	.autocomplete-emoji-img {
		object-fit: contain;
		image-rendering: -webkit-optimize-contrast;
		image-rendering: crisp-edges;
	}

	.autocomplete-name {
		font-family: 'Courier New', monospace;
	}

	:global(.custom-emoji-inline) {
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
		color: var(--theme-text-primary, #e8e8e8);
		font-size: calc(14 * 1em / 14);
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
		color: var(--theme-text-primary, #e8e8e8);
		font-family: 'Courier New', monospace;
		font-size: calc(14 * 1em / 14);
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
		color: var(--theme-text-muted, #b0b0b0);
		pointer-events: none;
	}

	.chat-input:not(.show-placeholder):before {
		content: '';
	}

	.chat-input:not([contenteditable='true']) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.chat-input :global(.emoji-inline) {
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

	:global(.emoji-hover) {
		display: inline-block;
		position: relative;
		cursor: pointer;
	}

	:global(.emoji-hover .emoji-char) {
		display: inline;
	}

	:global(.emoji-hover .emoji-tooltip-popup) {
		display: none !important;
		position: absolute;
		visibility: hidden;
		pointer-events: none;
	}

	:global(.emoji-hover .tooltip-emoji-char) {
		font-size: calc(32 * 1em / 14);
		line-height: 1;
		display: block;
		text-align: center;
	}

	:global(.emoji-hover .tooltip-emoji-img) {
		width: 40px;
		height: 40px;
		object-fit: contain;
		display: block;
		margin: 0 auto;
	}

	:global(.emoji-hover .tooltip-name) {
		font-size: calc(11 * 1em / 14);
		color: var(--theme-text-muted, #b0b0b0);
		font-family: 'Courier New', monospace;
		display: block;
		text-align: center;
		margin-top: 4px;
	}

	.send-button {
		background: var(--theme-background, #3a3a3a);
		border: 1px solid var(--theme-border, #555);
		color: var(--theme-text-primary, #e8e8e8);
		padding: 6px 12px;
		cursor: pointer;
		font-family: 'Courier New', monospace;
		font-size: calc(15 * 1em / 14);
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
		background: var(--theme-surface, #4a4a4a);
		border-color: var(--theme-border, #666);
		color: var(--theme-text-primary, #ffffff);
	}

	.send-button:active:not(:disabled) {
		background: var(--theme-background, #2a2a2a);
		border-color: var(--theme-border, #444);
	}

	.send-button:disabled {
		background: var(--theme-background, #2a2a2a);
		border-color: var(--theme-border, #333);
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.chat-container {
			height: 180px;
		}

		.chat-messages {
			font-size: calc(12 * 1em / 14);
			padding: 10px;
		}

		.chat-input {
			font-size: calc(12 * 1em / 14);
			padding: 6px 10px;
		}
	}
</style>
