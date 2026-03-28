<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { MessageSquare, Send, Trash2, Smile, Loader2 } from 'lucide-svelte';
	import AdminEmojiPicker from '$lib/admin/components/AdminEmojiPicker.svelte';
	import AdminEmojiTooltip from '$lib/admin/components/AdminEmojiTooltip.svelte';
	import { getEmojiFromName, getNameFromEmoji } from '$lib/shared/utils/emojiData';
	import { trackEmojiUsage, getRecentEmojis } from '$lib/shared/utils/recentEmojis';

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
			| 'notificationSoundsUpdate';
		data?: ChatMessage | ChatMessage[] | { nickname?: string; color?: string };
		message?: string;
		count?: number;
		messageId?: string;
	}

	interface Emoji {
		name: string;
		emoji: string;
		isCustom: boolean;
		imageUrl?: string;
	}

	// Props
	let {
		allEmojis = $bindable<Emoji[]>([]),
		emojiPickerReloadTrigger = $bindable(0),
		onEmojiUpdate = $bindable<(() => void) | null>(null),
		onNotificationSoundsUpdate = $bindable<(() => void) | null>(null),
		userCount = $bindable(0),
		messageCount = $bindable(0),
		isConnected = $bindable(false),
		connectionStatus = $bindable<'connecting' | 'connected' | 'disconnected'>('disconnected'),
		adminNickname = $bindable('Admin'),
		adminColor = $bindable('#f5b700')
	}: {
		allEmojis?: Emoji[];
		emojiPickerReloadTrigger?: number;
		onEmojiUpdate?: (() => void) | null;
		onNotificationSoundsUpdate?: (() => void) | null;
		userCount?: number;
		messageCount?: number;
		isConnected?: boolean;
		connectionStatus?: 'connecting' | 'connected' | 'disconnected';
		adminNickname?: string;
		adminColor?: string;
	} = $props();

	// State
	let messages = $state<(ChatMessage | SystemMessage)[]>([]);
	let inputValue = $state('');
	let ws: WebSocket | null = null;
	let messagesContainer = $state<HTMLDivElement | null>(null);
	let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	let isDestroyed = $state(false);
	
	// Lazy loading state
	let isLoadingMore = $state(false);
	let hasMoreMessages = $state(true);
	let nextCursor = $state<string | null>(null);
	let isInitialLoad = $state(true);
	
	// Emoji picker state
	let showEmojiPicker = $state(false);
	let isOpeningEmojiPicker = $state(false);
	let emojiButtonRef: HTMLButtonElement | null = $state(null);
	let messageInputDiv: HTMLDivElement | null = null;
	
	// Autocomplete state
	let emojiAutocompleteOpen = $state(false);
	let emojiAutocompleteMatches = $state<Array<{ name: string; emoji: string; isCustom: boolean; imageUrl?: string }>>([]);
	let emojiAutocompleteIndex = $state(0);
	let emojiAutocompleteQuery = $state('');
	
	// Extract text content from contenteditable, converting emoji images back to :name:
	function getInputText(): string {
		if (!messageInputDiv) return inputValue;
		
		let text = '';
		const walker = document.createTreeWalker(
			messageInputDiv,
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
		if (!messageInputDiv) return 0;
		
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return 0;
		
		const range = selection.getRangeAt(0);
		const preCaretRange = range.cloneRange();
		preCaretRange.selectNodeContents(messageInputDiv);
		preCaretRange.setEnd(range.endContainer, range.endOffset);
		
		let position = 0;
		const walker = document.createTreeWalker(
			messageInputDiv,
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
		if (!messageInputDiv) return;
		
		const selection = window.getSelection();
		if (!selection) return;
		
		const range = document.createRange();
		let currentPos = 0;
		
		const walker = document.createTreeWalker(
			messageInputDiv,
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
	
	function isEmptyContentEditable(element: HTMLElement): boolean {
		if (!element) return true;
		const text = element.textContent?.trim() || '';
		const images = element.querySelectorAll('img.emoji-inline');
		return text === '' && images.length === 0;
	}
	
	function handleInputFocus() {
		if (messageInputDiv) {
			messageInputDiv.classList.remove('show-placeholder');
		}
	}
	
	function handleInputBlur(event: FocusEvent) {
		if (showEmojiPicker || isOpeningEmojiPicker) {
			return;
		}
		
		const relatedTarget = event.relatedTarget as HTMLElement;
		if (relatedTarget) {
			if (relatedTarget.closest('.emoji-button') || relatedTarget.closest('.emoji-picker') || relatedTarget.closest('.admin-emoji-picker') || relatedTarget.closest('.emoji-btn')) {
				return;
			}
		}
		
		if (messageInputDiv && isEmptyContentEditable(messageInputDiv)) {
			messageInputDiv.classList.add('show-placeholder');
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
							adminNickname = config.nickname;
						}
						if (config.color) {
							adminColor = config.color;
						}
					} else if (data.type === 'emojiUpdate') {
						// Trigger emoji reload in parent
						if (onEmojiUpdate) {
							onEmojiUpdate();
						}
						emojiPickerReloadTrigger++;
					} else if (data.type === 'notificationSoundsUpdate') {
						onNotificationSoundsUpdate?.();
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
		if (!ws || !isConnected) {
			return;
		}

		const message = getInputText().trim();
		if (!message) {
			return;
		}
		
		ws.send(message);
		inputValue = '';
		if (messageInputDiv) {
			messageInputDiv.textContent = '';
			messageInputDiv.classList.add('show-placeholder');
		}
	}

	// Handle Enter key
	function handleKeyDown(event: KeyboardEvent) {

		if (emojiAutocompleteOpen && emojiAutocompleteMatches.length > 0) {
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				emojiAutocompleteIndex = (emojiAutocompleteIndex + 1) % emojiAutocompleteMatches.length;
				return;
			} else if (event.key === 'ArrowUp') {
				event.preventDefault();
				emojiAutocompleteIndex = emojiAutocompleteIndex === 0 
					? emojiAutocompleteMatches.length - 1 
					: emojiAutocompleteIndex - 1;
				return;
			} else if (event.key === 'Enter' || event.key === 'Tab') {
				event.preventDefault();
				insertAutocompleteEmoji(emojiAutocompleteMatches[emojiAutocompleteIndex]);
				return;
			} else if (event.key === 'Escape') {
				emojiAutocompleteOpen = false;
				return;
			}
		}
		
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}
	
	function insertAutocompleteEmoji(emoji: { name: string; emoji: string; isCustom: boolean; imageUrl?: string }) {
		if (!messageInputDiv) return;
		
		const text = getInputText();
		const cursorPos = getCaretPosition();
		const beforeCursor = text.substring(0, cursorPos);
		
		const match = beforeCursor.match(/:([a-zA-Z0-9_-]*)$/);
		if (!match) return;
		
		if (emoji.isCustom && emoji.imageUrl) {
			trackEmojiUsage(`:${emoji.name}:`, emoji.name);
		} else {
			trackEmojiUsage(emoji.emoji, emoji.name);
		}
		
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			
			if (!messageInputDiv.contains(range.commonAncestorContainer)) {
				range.selectNodeContents(messageInputDiv);
				range.collapse(false);
			}
			
			range.setStart(range.startContainer, Math.max(0, range.startOffset - match[0].length));
			range.deleteContents();
			
			if (emoji.isCustom && emoji.imageUrl) {
				const img = document.createElement('img');
				img.src = emoji.imageUrl;
				img.alt = `:${emoji.name}:`;
				img.className = 'emoji-inline';
				img.style.cssText = 'width: 1.375em; height: 1.375em; max-width: 22px; max-height: 22px; vertical-align: -0.2em; display: inline-block; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;';
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
			
			messageInputDiv.normalize();
			const divs = messageInputDiv.querySelectorAll('div');
			divs.forEach(div => {
				const parent = div.parentNode;
				if (parent) {
					while (div.firstChild) {
						parent.insertBefore(div.firstChild, div);
					}
					parent.removeChild(div);
				}
			});
			messageInputDiv.normalize();
			
			inputValue = getInputText();
			messageInputDiv.focus();
		}
		
		emojiAutocompleteOpen = false;
	}
	
	// Handle emoji selection
	function handleEmojiSelect(event: CustomEvent<{ emoji: string; isCustom?: boolean; imageUrl?: string }>) {
		if (!messageInputDiv) return;
		
		const { emoji: emojiText, isCustom, imageUrl } = event.detail;
		
		let emojiToInsert = emojiText;
		if (emojiText.startsWith(':') && emojiText.endsWith(':')) {
			const emojiName = emojiText.slice(1, -1);
			
			const emoji = allEmojis.find(e => e.name.toLowerCase() === emojiName.toLowerCase());
			if (emoji) {
				if (emoji.isCustom && emoji.imageUrl) {
					// Custom emoji
					emojiToInsert = emojiText;
				} else {
					emojiToInsert = emoji.emoji;
				}
			} else {
				const emojiChar = getEmojiFromName(emojiName);
				if (emojiChar) {
					emojiToInsert = emojiChar;
				}
			}
		}
		
		messageInputDiv.focus();
		
		const selection = window.getSelection();
		let range: Range;
		
		if (!selection || selection.rangeCount === 0) {
			range = document.createRange();
			range.selectNodeContents(messageInputDiv);
			range.collapse(false);
		} else {
			range = selection.getRangeAt(0);
			
			if (!messageInputDiv.contains(range.commonAncestorContainer)) {
				range.selectNodeContents(messageInputDiv);
				range.collapse(false);
			}
		}
		
		range.deleteContents();
		
		let insertContainer = range.commonAncestorContainer;
		if (insertContainer.nodeType === Node.TEXT_NODE) {
			insertContainer = insertContainer.parentNode as Node;
		}
		
		if (insertContainer && (insertContainer as HTMLElement).nodeName === 'DIV' && insertContainer !== messageInputDiv) {
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
		
		messageInputDiv.normalize();
		
		const divs = messageInputDiv.querySelectorAll('div');
		divs.forEach(div => {
			const parent = div.parentNode;
			if (parent) {
				while (div.firstChild) {
					parent.insertBefore(div.firstChild, div);
				}
				parent.removeChild(div);
			}
		});
		
		messageInputDiv.normalize();
		
		inputValue = getInputText();
		
		messageInputDiv.focus();
		
		showEmojiPicker = false;
	}
	
	function handleInputChange() {
		if (!messageInputDiv) return;
		
		const text = getInputText();
		const cursorPos = getCaretPosition();
		inputValue = text;
		
		if (document.activeElement !== messageInputDiv) {
			if (isEmptyContentEditable(messageInputDiv)) {
				messageInputDiv.classList.add('show-placeholder');
			} else {
				messageInputDiv.classList.remove('show-placeholder');
			}
		} else {
			messageInputDiv.classList.remove('show-placeholder');
		}
		
		const beforeCursor = text.substring(0, cursorPos);
		const afterCursor = text.substring(cursorPos);
		
		const incompleteMatch = beforeCursor.match(/:([a-zA-Z0-9_-]*)$/);
		const completeMatch = beforeCursor.match(/:([a-zA-Z0-9_-]+):$/);
		
		if (completeMatch && completeMatch[1].length > 0 && allEmojis.length > 0) {
			const emojiName = completeMatch[1].toLowerCase();
			let emoji = allEmojis.find(e => e.name.toLowerCase() === emojiName);
			
			if (!emoji) {
				const emojiChar = getEmojiFromName(emojiName);
				if (emojiChar) {
					emoji = {
						name: emojiName,
						emoji: emojiChar,
						isCustom: false
					};
				}
			}
			
			if (emoji) {
				// Track emoji usage
				if (emoji.isCustom && emoji.imageUrl) {
					trackEmojiUsage(`:${emoji.name}:`, emoji.name);
				} else {
					trackEmojiUsage(emoji.emoji, emoji.name);
				}
				
				const start = cursorPos - completeMatch[0].length;
				
				const selection = window.getSelection();
				if (selection && selection.rangeCount > 0) {
					const range = selection.getRangeAt(0);
					const textNode = range.startContainer;
					
					if (textNode.nodeType === Node.TEXT_NODE && textNode.parentNode === messageInputDiv) {
						const nodeText = textNode.textContent || '';
						const beforePattern = nodeText.substring(0, start);
						const afterPattern = nodeText.substring(start + completeMatch[0].length);
						
						if (emoji.isCustom && emoji.imageUrl) {
							const img = document.createElement('img');
							img.src = emoji.imageUrl;
							img.alt = `:${emoji.name}:`;
							img.className = 'emoji-inline';
							img.style.cssText = 'width: 1.375em; height: 1.375em; max-width: 22px; max-height: 22px; vertical-align: -0.2em; display: inline-block; object-fit: contain; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;';
							
							const beforeNode = document.createTextNode(beforePattern);
							const afterNode = document.createTextNode(afterPattern + afterCursor);
							
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
								messageInputDiv?.focus();
							}, 0);
						} else {
							textNode.textContent = beforePattern + emoji.emoji + afterPattern + afterCursor;
							
							setTimeout(() => {
								const newPos = start + emoji.emoji.length;
								setCaretPosition(newPos);
								messageInputDiv?.focus();
							}, 0);
						}
						
						inputValue = getInputText();
						emojiAutocompleteOpen = false;
					}
				}
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
						const found = allEmojis.find(e => 
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
				
				const popularEmojis = allEmojis.filter(e => 
					['smile', 'joy', 'heart', 'thumbsup', 'fire', 'star', 'ok_hand', 'wave'].includes(e.name.toLowerCase())
				).slice(0, 8);
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
	
	function toggleEmojiPicker(event?: Event) {
		if (event) {
			event.stopPropagation();
		}
		isOpeningEmojiPicker = true;
		showEmojiPicker = !showEmojiPicker;
		setTimeout(() => {
			isOpeningEmojiPicker = false;
		}, 100);
	}
	
	// Close emoji picker when clicking outside
	$effect(() => {
		if (showEmojiPicker && browser) {
			const handleClickOutside = (event: MouseEvent) => {
				const target = event.target as HTMLElement;

				if (
					target.closest('.emoji-picker') || 
					target.closest('.admin-emoji-picker') || 
					target.closest('.emoji-btn') ||
					target.closest('.picker-tabs') ||
					target.closest('.picker-tab')
				) {
					return;
				}
				showEmojiPicker = false;
			};
			
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
	
	$effect(() => {
		if (!showEmojiPicker && messageInputDiv && isEmptyContentEditable(messageInputDiv) && document.activeElement !== messageInputDiv) {
			messageInputDiv.classList.add('show-placeholder');
		}
	});

	function renderEmojiMessage(message: string): string {
		let html = message
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
		
		html = html.replace(/:([a-zA-Z0-9_-]+):/g, (match, name) => {
			let emoji = allEmojis.find(e => e.name.toLowerCase() === name.toLowerCase());
			
			if (!emoji) {
				const emojiChar = getEmojiFromName(name);
				if (emojiChar) {
					emoji = {
						name: name,
						emoji: emojiChar,
						isCustom: false
					};
				}
			}
			
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
		
		const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\p{Emoji_Modifier}|\u200D\p{Emoji_Presentation}|\u200D\p{Emoji}\uFE0F)*/gu;
		
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

	// Delete message
	function deleteMessage(messageId: string | undefined) {
		if (!ws || !isConnected || !messageId) return;
		ws.send(`/delete ${messageId}`);
	}

	// Expose methods for parent to set admin nickname/color
	export function setAdminNickname(nickname: string) {
		if (ws && isConnected) {
			ws.send(`/set_admin_nickname ${nickname}`);
		}
	}

	export function setAdminColor(color: string) {
		if (ws && isConnected) {
			ws.send(`/set_admin_color ${color}`);
		}
	}

	export function reconnect() {
		connect();
	}

	// Update messageCount when messages change
	$effect(() => {
		messageCount = messages.filter(m => !('isSystem' in m)).length;
	});

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

<AdminEmojiTooltip bind:container={messagesContainer} />

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
								{chatMsg.nickname}{#if chatMsg.source === 'discord'}<span class="discord-badge" title="From Discord">
										<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418z" class="badge-icon"/>
										</svg>
									</span>{:else if chatMsg.source === 'admin'}<span class="crown-badge" title="Admin">
										<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3H5v2h14v-2z" class="badge-icon"/>
										</svg>
									</span>{/if}
							</span>
							<span class="message-content">{@html renderEmojiMessage(chatMsg.message)}</span>
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
			<button 
				class="emoji-btn"
				bind:this={emojiButtonRef}
				onclick={(e) => toggleEmojiPicker(e)}
				type="button"
				disabled={!isConnected}
				title="Add emoji"
			>
				<Smile size={18} />
			</button>
			<div class="input-wrapper">
				<div class="input-container">
					<div
						class="message-input show-placeholder"
						contenteditable={isConnected}
						bind:this={messageInputDiv}
						data-placeholder={isConnected ? "Type a message..." : "Connecting..."}
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
			<button 
				class="send-btn"
				onclick={sendMessage}
				disabled={!isConnected || !getInputText().trim()}
			>
				<Send size={18} />
			</button>
		</div>
		
		{#if showEmojiPicker}
			<AdminEmojiPicker 
				bind:isOpen={showEmojiPicker}
				triggerButton={emojiButtonRef}
				reloadTrigger={emojiPickerReloadTrigger}
				on:select={handleEmojiSelect}
			/>
		{/if}
	</div>
</section>

<style>
	:global(.emoji-hover) {
		display: inline-block;
		cursor: pointer;
		position: relative;
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

	.chat-section {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.chat-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: #2d2d2d;
		border: 1px solid #404040;
		border-radius: 8px;
		overflow: hidden;
		min-height: 0;
		max-height: 100%;
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

	.discord-badge .badge-icon {
		fill: #ffffff;
	}

	:global(html:not(.dark)) .discord-badge .badge-icon {
		fill: #1f2937;
	}

	.crown-badge {
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

	:global(html:not(.dark)) .crown-badge {
		border-color: #1f2937;
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

	.crown-badge .badge-icon {
		fill: #ffffff;
	}

	:global(html:not(.dark)) .crown-badge .badge-icon {
		fill: #1f2937;
	}

	.message-content {
		color: #ffffff;
		word-break: break-word;
	}

	.message-content :global(.custom-emoji-inline) {
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
		align-items: center;
		position: relative;
	}
	
	.input-wrapper {
		position: relative;
		flex: 1;
		min-width: 0;
	}
	
	.input-wrapper > .input-container {
		position: relative;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		padding: 0;
		border: none;
		background: transparent;
	}
	
	.emoji-autocomplete {
		position: absolute;
		bottom: calc(100% + 4px);
		left: 0;
		background: #2d2d2d;
		border: 1px solid #404040;
		border-radius: 8px;
		max-height: 200px;
		overflow-y: auto;
		z-index: 1000;
		min-width: 200px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	}
	
	:global(html:not(.dark)) .emoji-autocomplete {
		background: #ffffff;
		border-color: #e5e7eb;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.autocomplete-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: transparent;
		border: none;
		border-bottom: 1px solid #404040;
		color: #e8e8e8;
		cursor: pointer;
		width: 100%;
		text-align: left;
		font-size: 14px;
		transition: background-color 0.2s;
	}
	
	:global(html:not(.dark)) .autocomplete-item {
		border-bottom-color: #e5e7eb;
		color: #1f2937;
	}
	
	.autocomplete-item:last-child {
		border-bottom: none;
	}
	
	.autocomplete-item:hover,
	.autocomplete-item.active {
		background: #3a3a3a;
	}
	
	:global(html:not(.dark)) .autocomplete-item:hover,
	:global(html:not(.dark)) .autocomplete-item.active {
		background: #f3f4f6;
	}
	
	.autocomplete-emoji {
		font-size: 18px;
		line-height: 1;
	}
	
	.autocomplete-emoji-img {
		width: 18px;
		height: 18px;
		object-fit: contain;
	}
	
	.autocomplete-name {
		font-size: 12px;
		color: #a1a1aa;
	}
	
	:global(html:not(.dark)) .autocomplete-name {
		color: #6b7280;
	}

	:global(html:not(.dark)) .input-container {
		border-top-color: #e5e7eb;
		background: #f9fafb;
	}

	.emoji-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: #3a3a3a;
		border: 1px solid #404040;
		border-radius: 6px;
		color: #a1a1aa;
		cursor: pointer;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.emoji-btn:hover:not(:disabled) {
		background: #404040;
		border-color: #505050;
		color: #ffffff;
	}

	.emoji-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(html:not(.dark)) .emoji-btn {
		background: #ffffff;
		border-color: #d1d5db;
		color: #6b7280;
	}

	:global(html:not(.dark)) .emoji-btn:hover:not(:disabled) {
		background: #f9fafb;
		border-color: #9ca3af;
		color: #1f2937;
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
		min-height: 20px;
		line-height: 1.5;
		white-space: pre-wrap;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	:global(html:not(.dark)) .message-input {
		background: #ffffff;
		border-color: #d1d5db;
		color: #1f2937;
	}

	.message-input:focus {
		border-color: var(--accent-color, #3b82f6);
	}

	.message-input:not([contenteditable="true"]) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.message-input.show-placeholder:before {
		content: attr(data-placeholder);
		color: #6b7280;
		pointer-events: none;
	}
	
	.message-input:not(.show-placeholder):before {
		content: '';
	}

	.message-input :global(.emoji-inline) {
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
	@media (max-width: 768px) {
		.messages-container {
			padding: 12px;
		}

		.input-container {
			padding: 12px;
		}
	}
</style>

