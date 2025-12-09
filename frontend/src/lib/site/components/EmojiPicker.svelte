<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { Smile } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';

	const dispatch = createEventDispatcher<{
		select: { emoji: string; isCustom?: boolean; imageUrl?: string };
	}>();

	let { isOpen = $bindable(false), reloadTrigger = 0 } = $props();

	interface CustomEmoji {
		id: string;
		name: string;
		imageUrl: string;
		isCustom: boolean;
	}

	let customEmojis = $state<CustomEmoji[]>([]);
	let isLoadingCustom = $state(false);
	let pickerElement: HTMLDivElement | null = $state(null);
	let overlayElement: HTMLDivElement | null = $state(null);
	let originalParent: Node | null = $state(null);
	let originalNextSibling: Node | null = $state(null);

	const emojiCategories = [
		{
			name: 'Smileys',
			emojis: [
				{ emoji: '😀', name: 'smile' },
				{ emoji: '😃', name: 'grin' },
				{ emoji: '😄', name: 'smile_big' },
				{ emoji: '😁', name: 'grin_wide' },
				{ emoji: '😆', name: 'laugh' },
				{ emoji: '😅', name: 'sweat_smile' },
				{ emoji: '🤣', name: 'rofl' },
				{ emoji: '😂', name: 'joy' },
				{ emoji: '🙂', name: 'slight_smile' },
				{ emoji: '🙃', name: 'upside_down' },
				{ emoji: '😉', name: 'wink' },
				{ emoji: '😊', name: 'blush' },
				{ emoji: '😇', name: 'innocent' },
				{ emoji: '🥰', name: 'love_eyes' },
				{ emoji: '😍', name: 'heart_eyes' },
				{ emoji: '🤩', name: 'star_eyes' },
				{ emoji: '😘', name: 'kiss' },
				{ emoji: '😗', name: 'kiss_light' },
				{ emoji: '😚', name: 'kiss_blush' },
				{ emoji: '😙', name: 'kiss_smile' }
			]
		},
		{
			name: 'Hearts',
			emojis: [
				{ emoji: '❤️', name: 'heart' },
				{ emoji: '🧡', name: 'orange_heart' },
				{ emoji: '💛', name: 'yellow_heart' },
				{ emoji: '💚', name: 'green_heart' },
				{ emoji: '💙', name: 'blue_heart' },
				{ emoji: '💜', name: 'purple_heart' },
				{ emoji: '🖤', name: 'black_heart' },
				{ emoji: '🤍', name: 'white_heart' },
				{ emoji: '🤎', name: 'brown_heart' },
				{ emoji: '💔', name: 'broken_heart' },
				{ emoji: '❤️‍🔥', name: 'heart_fire' },
				{ emoji: '❤️‍🩹', name: 'heart_bandage' },
				{ emoji: '💕', name: 'two_hearts' },
				{ emoji: '💞', name: 'revolving_hearts' },
				{ emoji: '💓', name: 'beating_heart' },
				{ emoji: '💗', name: 'growing_heart' },
				{ emoji: '💖', name: 'sparkling_heart' },
				{ emoji: '💘', name: 'cupid' },
				{ emoji: '💝', name: 'gift_heart' },
				{ emoji: '💟', name: 'heart_decoration' }
			]
		},
		{
			name: 'Gestures',
			emojis: [
				{ emoji: '👍', name: 'thumbsup' },
				{ emoji: '👎', name: 'thumbsdown' },
				{ emoji: '👌', name: 'ok_hand' },
				{ emoji: '✌️', name: 'peace' },
				{ emoji: '🤞', name: 'crossed_fingers' },
				{ emoji: '🤟', name: 'love_you' },
				{ emoji: '🤘', name: 'rock_on' },
				{ emoji: '🤙', name: 'call_me' },
				{ emoji: '👈', name: 'point_left' },
				{ emoji: '👉', name: 'point_right' },
				{ emoji: '👆', name: 'point_up' },
				{ emoji: '👇', name: 'point_down' },
				{ emoji: '☝️', name: 'point_up_one' },
				{ emoji: '👏', name: 'clap' },
				{ emoji: '🙌', name: 'raised_hands' },
				{ emoji: '👐', name: 'open_hands' },
				{ emoji: '🤲', name: 'palms_up' },
				{ emoji: '🤝', name: 'handshake' },
				{ emoji: '🙏', name: 'pray' },
				{ emoji: '✍️', name: 'writing' }
			]
		},
		{
			name: 'Reactions',
			emojis: [
				{ emoji: '🔥', name: 'fire' },
				{ emoji: '💯', name: 'hundred' },
				{ emoji: '⭐', name: 'star' },
				{ emoji: '✨', name: 'sparkles' },
				{ emoji: '🌟', name: 'star2' },
				{ emoji: '💫', name: 'dizzy' },
				{ emoji: '⚡', name: 'zap' },
				{ emoji: '💥', name: 'boom' },
				{ emoji: '💢', name: 'anger' },
				{ emoji: '💦', name: 'sweat_drops' },
				{ emoji: '💨', name: 'dash' },
				{ emoji: '🎉', name: 'party' },
				{ emoji: '🎊', name: 'confetti' },
				{ emoji: '🎈', name: 'balloon' },
				{ emoji: '🎁', name: 'gift' },
				{ emoji: '🏆', name: 'trophy' },
				{ emoji: '🥇', name: 'first_place' },
				{ emoji: '🥈', name: 'second_place' },
				{ emoji: '🥉', name: 'third_place' },
				{ emoji: '🎖️', name: 'medal' }
			]
		},
		{
			name: 'Animals',
			emojis: [
				{ emoji: '🐶', name: 'dog' },
				{ emoji: '🐱', name: 'cat' },
				{ emoji: '🐭', name: 'mouse' },
				{ emoji: '🐹', name: 'hamster' },
				{ emoji: '🐰', name: 'rabbit' },
				{ emoji: '🦊', name: 'fox' },
				{ emoji: '🐻', name: 'bear' },
				{ emoji: '🐼', name: 'panda' },
				{ emoji: '🐨', name: 'koala' },
				{ emoji: '🐯', name: 'tiger' },
				{ emoji: '🦁', name: 'lion' },
				{ emoji: '🐮', name: 'cow' },
				{ emoji: '🐷', name: 'pig' },
				{ emoji: '🐸', name: 'frog' },
				{ emoji: '🐵', name: 'monkey' },
				{ emoji: '🐔', name: 'chicken' },
				{ emoji: '🐧', name: 'penguin' },
				{ emoji: '🐦', name: 'bird' },
				{ emoji: '🐤', name: 'baby_chick' },
				{ emoji: '🦅', name: 'eagle' }
			]
		},
		{
			name: 'Food',
			emojis: [
				{ emoji: '🍎', name: 'apple' },
				{ emoji: '🍌', name: 'banana' },
				{ emoji: '🍇', name: 'grapes' },
				{ emoji: '🍓', name: 'strawberry' },
				{ emoji: '🍑', name: 'peach' },
				{ emoji: '🍒', name: 'cherries' },
				{ emoji: '🍕', name: 'pizza' },
				{ emoji: '🍔', name: 'hamburger' },
				{ emoji: '🍟', name: 'fries' },
				{ emoji: '🌭', name: 'hotdog' },
				{ emoji: '🍿', name: 'popcorn' },
				{ emoji: '🍩', name: 'doughnut' },
				{ emoji: '🍪', name: 'cookie' },
				{ emoji: '🎂', name: 'birthday' },
				{ emoji: '🍰', name: 'cake' },
				{ emoji: '🧁', name: 'cupcake' },
				{ emoji: '🍫', name: 'chocolate' },
				{ emoji: '🍬', name: 'candy' },
				{ emoji: '🍭', name: 'lollipop' },
				{ emoji: '🍮', name: 'custard' }
			]
		},
		{
			name: 'Objects',
			emojis: [
				{ emoji: '💻', name: 'computer' },
				{ emoji: '📱', name: 'iphone' },
				{ emoji: '⌚', name: 'watch' },
				{ emoji: '🖥️', name: 'desktop' },
				{ emoji: '🖨️', name: 'printer' },
				{ emoji: '⌨️', name: 'keyboard' },
				{ emoji: '🖱️', name: 'mouse' },
				{ emoji: '🖲️', name: 'trackball' },
				{ emoji: '🕹️', name: 'joystick' },
				{ emoji: '🗜️', name: 'clamp' },
				{ emoji: '💾', name: 'floppy_disk' },
				{ emoji: '💿', name: 'cd' },
				{ emoji: '📀', name: 'dvd' },
				{ emoji: '📼', name: 'vhs' },
				{ emoji: '📷', name: 'camera' },
				{ emoji: '📸', name: 'camera_flash' },
				{ emoji: '📹', name: 'video_camera' },
				{ emoji: '🎥', name: 'movie_camera' },
				{ emoji: '📺', name: 'tv' },
				{ emoji: '📻', name: 'radio' }
			]
		},
		{
			name: 'Symbols',
			emojis: [
				{ emoji: '✅', name: 'check' },
				{ emoji: '❌', name: 'x' },
				{ emoji: '⭕', name: 'o' },
				{ emoji: '❓', name: 'question' },
				{ emoji: '❔', name: 'question_white' },
				{ emoji: '❗', name: 'exclamation' },
				{ emoji: '❕', name: 'exclamation_white' },
				{ emoji: '💬', name: 'speech_balloon' },
				{ emoji: '💭', name: 'thought_balloon' },
				{ emoji: '🗯️', name: 'anger_balloon' },
				{ emoji: '♠️', name: 'spades' },
				{ emoji: '♥️', name: 'hearts' },
				{ emoji: '♦️', name: 'diamonds' },
				{ emoji: '♣️', name: 'clubs' },
				{ emoji: '🃏', name: 'joker' },
				{ emoji: '🀄', name: 'mahjong' },
				{ emoji: '🎴', name: 'flower_playing_cards' },
				{ emoji: '🎭', name: 'performing_arts' },
				{ emoji: '🖼️', name: 'frame_photo' },
				{ emoji: '🎨', name: 'art' }
			]
		}
	];

	let selectedCategory = $state('All');

	// Load custom emojis from API
	async function loadCustomEmojis() {
		if (!browser) return;
		
		try {
			isLoadingCustom = true;
			const response = await fetch('/api/emojis');
			if (response.ok) {
				const data = await response.json();
				customEmojis = data.data || [];
			}
		} catch (error) {
			console.error('Failed to load custom emojis:', error);
		} finally {
			isLoadingCustom = false;
		}
	}

	function selectEmoji(emojiData: { emoji: string; name: string } | string, isCustom = false, imageUrl?: string, emojiName?: string) {
		if (isCustom && imageUrl && emojiName) {
			dispatch('select', { emoji: `:${emojiName}:`, isCustom: true, imageUrl });
		} else if (typeof emojiData === 'object') {
			dispatch('select', { emoji: `:${emojiData.name}:`, isCustom: false });
		} else {
			dispatch('select', { emoji: emojiData, isCustom: false });
		}
		isOpen = false;
	}

	function closePicker(event?: Event) {
		if (event) {
			event.stopPropagation();
		}
		isOpen = false;
	}

	// Close picker when clicking outside
	function handleOverlayClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closePicker();
		}
	}

	$effect(() => {
		if (isOpen && customEmojis.length === 0 && !isLoadingCustom) {
			loadCustomEmojis();
		}
	});

	// Function to position picker
	function positionPicker() {
		if (!browser || !pickerElement || !isOpen) return;
		
		let button = document.querySelector('.emoji-button') as HTMLElement;
		if (!button && originalParent) {
			button = (originalParent as Element).querySelector('.emoji-button') as HTMLElement;
		}

		if (!button) {
			const chatContainer = document.querySelector('.chat-container, .chat-input-container');
			if (chatContainer) {
				button = chatContainer.querySelector('.emoji-button') as HTMLElement;
			}
		}
		
		if (button) {
			const rect = button.getBoundingClientRect();
			void pickerElement.offsetHeight;
			const pickerWidth = pickerElement.offsetWidth || 360;
			const pickerHeight = pickerElement.offsetHeight || 320;
			const spaceAbove = rect.top;
			const spaceBelow = window.innerHeight - rect.bottom;
			
			let leftPos = rect.right - pickerWidth;
			
			if (leftPos < 10) {
				leftPos = 10;
			}
			
			if (leftPos + pickerWidth > window.innerWidth - 10) {
				leftPos = window.innerWidth - pickerWidth - 10;
			}
			
			if (spaceAbove >= pickerHeight + 10) {
				pickerElement.style.top = 'auto';
				pickerElement.style.bottom = `${window.innerHeight - rect.top + 4}px`;
				pickerElement.style.left = `${leftPos}px`;
				pickerElement.style.right = 'auto';
				pickerElement.style.transform = 'none';
			} else if (spaceBelow >= pickerHeight + 10) {
				pickerElement.style.bottom = 'auto';
				pickerElement.style.top = `${rect.bottom + 4}px`;
				pickerElement.style.left = `${leftPos}px`;
				pickerElement.style.right = 'auto';
				pickerElement.style.transform = 'none';
			} else {

				pickerElement.style.top = '50%';
				pickerElement.style.bottom = 'auto';
				pickerElement.style.left = `${Math.max(10, Math.min(leftPos, window.innerWidth - pickerWidth - 10))}px`;
				pickerElement.style.right = 'auto';
				pickerElement.style.transform = 'translateY(-50%)';
			}
		}
	}

	// Position picker relative to button when opened
	$effect(() => {
		if (isOpen && browser && pickerElement && pickerElement.parentNode === document.body) {
			const handleResize = () => {
				if (isOpen && pickerElement) {
					positionPicker();
				}
			};
			
			window.addEventListener('resize', handleResize);
			
			return () => {
				window.removeEventListener('resize', handleResize);
			};
		} else if (!isOpen && pickerElement) {
			pickerElement.style.top = '';
			pickerElement.style.bottom = '';
			pickerElement.style.left = '';
			pickerElement.style.right = '';
			pickerElement.style.transform = '';
			pickerElement.style.width = '';
		}
	});

	$effect(() => {
		if (reloadTrigger > 0) {
			loadCustomEmojis();
		}
	});

	onMount(() => {
		loadCustomEmojis();
	});
	
	onDestroy(() => {
		if (pickerElement && originalParent) {
			if (pickerElement.parentNode === document.body) {
				document.body.removeChild(pickerElement);
			}
		}
		if (overlayElement && originalParent) {
			if (overlayElement.parentNode === document.body) {
				document.body.removeChild(overlayElement);
			}
		}
	});
	
	$effect(() => {
		if (isOpen && browser && pickerElement && overlayElement) {
			if (!originalParent && pickerElement.parentNode && pickerElement.parentNode !== document.body) {
				originalParent = pickerElement.parentNode;
				originalNextSibling = pickerElement.nextSibling;
			}
			
			setTimeout(() => {
				if (pickerElement && overlayElement) {
					if (overlayElement.parentNode !== document.body) {
						document.body.appendChild(overlayElement);
					}
					
					if (pickerElement.parentNode !== document.body) {
						document.body.appendChild(pickerElement);
					}
					
					positionPicker();
				}
			}, 0);
		} else if (!isOpen && pickerElement && overlayElement) {
			setTimeout(() => {
				if (pickerElement && overlayElement) {
					if (pickerElement.parentNode === document.body) {
						document.body.removeChild(pickerElement);
					}
					if (overlayElement.parentNode === document.body) {
						document.body.removeChild(overlayElement);
					}
					originalParent = null;
					originalNextSibling = null;
				}
			}, 0);
		}
	});
</script>

{#if isOpen}
	<div class="emoji-picker-overlay" bind:this={overlayElement} onclick={handleOverlayClick} role="button" tabindex="-1"></div>
	<div class="emoji-picker" bind:this={pickerElement} onclick={(e) => e.stopPropagation()}>
		<div class="win95-titlebar">
			<div class="titlebar-icon">☺</div>
			<div class="titlebar-text">Character Map</div>
			<div class="titlebar-buttons">
				<button class="titlebar-button close" type="button" onclick={closePicker} title="Close">×</button>
			</div>
		</div>

		<!-- Menu Bar -->
		<!-- <div class="win95-menubar">
			<span class="menu-item">File</span>
			<span class="menu-item">Edit</span>
			<span class="menu-item">View</span>
			<span class="menu-item">Help</span>
		</div> -->

		<!-- Category Tabs -->
		<div class="win95-tabs">
			<button
				class="win95-tab"
				class:active={selectedCategory === 'All'}
				onclick={() => selectedCategory = 'All'}
				type="button"
			>
				All
			</button>
			{#each emojiCategories as category}
				<button
					class="win95-tab"
					class:active={selectedCategory === category.name}
					onclick={() => selectedCategory = category.name}
					type="button"
				>
					{category.name}
				</button>
			{/each}
			{#if customEmojis.length > 0}
				<button
					class="win95-tab"
					class:active={selectedCategory === 'Custom'}
					onclick={() => selectedCategory = 'Custom'}
					type="button"
				>
					Custom
				</button>
			{/if}
		</div>

		<div class="win95-content">
			<div class="win95-grid-container">
				{#if selectedCategory === 'All'}
					<div class="emoji-category-section">
						{#if customEmojis.length > 0}
							<div class="category-heading">Custom</div>
							<div class="win95-grid">
								{#each customEmojis as customEmoji}
									<button
										class="win95-char-button"
										onclick={() => selectEmoji('', true, customEmoji.imageUrl, customEmoji.name)}
										type="button"
										title={`:${customEmoji.name}:`}
									>
										<img 
											src={customEmoji.imageUrl} 
											alt={customEmoji.name}
											loading="lazy"
										/>
									</button>
								{/each}
							</div>
						{/if}
						{#each emojiCategories as category}
							<div class="category-heading">{category.name}</div>
							<div class="win95-grid">
								{#each category.emojis as emojiData}
									<button
										class="win95-char-button"
										onclick={() => selectEmoji(emojiData)}
										type="button"
										title={`:${emojiData.name}:`}
									>
										{emojiData.emoji}
									</button>
								{/each}
							</div>
						{/each}
					</div>
				{:else if selectedCategory === 'Custom'}
					<div class="win95-grid">
						{#each customEmojis as customEmoji}
							<button
								class="win95-char-button"
								onclick={() => selectEmoji('', true, customEmoji.imageUrl, customEmoji.name)}
								type="button"
								title={`:${customEmoji.name}:`}
							>
								<img 
									src={customEmoji.imageUrl} 
									alt={customEmoji.name}
									loading="lazy"
								/>
							</button>
						{/each}
					</div>
				{:else}
					<div class="win95-grid">
						{#each emojiCategories.find(c => c.name === selectedCategory)?.emojis || [] as emojiData}
							<button
								class="win95-char-button"
								onclick={() => selectEmoji(emojiData)}
								type="button"
								title={`:${emojiData.name}:`}
							>
								{emojiData.emoji}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Status Bar -->
		<div class="win95-statusbar">
			<div class="statusbar-left">
				{#if selectedCategory === 'Custom' && customEmojis.length > 0}
					<span>{customEmojis.length} custom emoji{customEmojis.length !== 1 ? 's' : ''}</span>
				{:else}
					<span>Select a character</span>
				{/if}
			</div>
			<div class="statusbar-right">
				<span>Unicode</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.emoji-picker-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 999;
		background: transparent;
	}

	.emoji-picker {
		position: fixed;
		bottom: auto;
		top: auto;
		right: auto;
		left: auto;
		width: 360px;
		max-width: calc(100vw - 20px);
		height: 320px;
		max-height: calc(100vh - 40px);
		display: flex;
		flex-direction: column;
		z-index: 10000;
		overflow: hidden;
		font-family: 'MS Sans Serif', 'Segoe UI', sans-serif;
		font-size: 12px;
		border: 2px outset #4a4a4a;
		background: #2a2a2a;
		box-shadow: 
			inset -1px -1px 0 #000000,
			inset 1px 1px 0 #666666,
			inset -2px -2px 0 #1a1a1a,
			inset 2px 2px 0 #555555;
		box-sizing: border-box;
	}

	@media (max-width: 768px) {
		.emoji-picker {
			width: calc(100vw - 20px);
			max-width: calc(100vw - 20px);
			height: 50vh;
			max-height: calc(100vh - 100px);
		}
	}

	@media (max-width: 480px) {
		.emoji-picker {
			width: calc(100vw - 16px);
			max-width: calc(100vw - 16px);
			height: 60vh;
			max-height: calc(100vh - 80px);
		}
	}

	.win95-titlebar {
		display: flex;
		align-items: center;
		height: 22px;
		background: #3a3a3a;
		color: #e0e0e0;
		padding: 0 3px;
		font-weight: bold;
		font-size: 12px;
		user-select: none;
		cursor: default;
		border-bottom: 1px solid #1a1a1a;
		border-top: 1px solid #555555;
	}

	.titlebar-icon {
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 3px;
		font-size: 14px;
	}

	.titlebar-text {
		flex: 1;
		padding-left: 4px;
	}

	.titlebar-buttons {
		display: flex;
		gap: 2px;
	}

	.titlebar-button {
		width: 18px;
		height: 16px;
		padding: 0;
		margin: 0;
		border: 1px solid #4a4a4a;
		background: #3a3a3a;
		color: #e0e0e0;
		font-size: 12px;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'MS Sans Serif', sans-serif;
		box-shadow: 
			inset -1px -1px 0 #000000,
			inset 1px 1px 0 #666666;
	}

	.titlebar-button:hover:not(:disabled) {
		background: #4a4a4a;
		color: #ffffff;
	}

	.titlebar-button:active:not(:disabled) {
		box-shadow: 
			inset 1px 1px 0 #000000,
			inset -1px -1px 0 #666666;
	}

	.titlebar-button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.titlebar-button.close {
		font-weight: bold;
		font-size: 12px;
	}

	.win95-menubar {
		display: flex;
		height: 22px;
		background: #3a3a3a;
		border-top: 1px solid #1a1a1a;
		border-bottom: 1px solid #555555;
		padding: 0 3px;
		gap: 0;
	}

	.menu-item {
		padding: 3px 10px;
		cursor: default;
		color: #e0e0e0;
		font-size: 12px;
		user-select: none;
	}

	.menu-item:hover {
		background: #1a3a5a;
		color: #ffffff;
	}

	.win95-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		padding: 3px;
		background: #2a2a2a;
		border-bottom: 1px solid #1a1a1a;
		overflow-y: auto;
		max-height: 80px;
	}

	.win95-tabs::-webkit-scrollbar {
		width: 12px;
		height: 12px;
	}

	.win95-tabs::-webkit-scrollbar-track {
		background: #2a2a2a;
		border: 1px inset #2a2a2a;
	}

	.win95-tabs::-webkit-scrollbar-thumb {
		background: #3a3a3a;
		border: 1px outset #3a3a3a;
		box-shadow: 
			inset -1px -1px 0 #000000,
			inset 1px 1px 0 #666666;
	}

	.win95-tab {
		padding: 3px 10px;
		background: #3a3a3a;
		border: 1px outset #3a3a3a;
		color: #e0e0e0;
		font-size: 12px;
		cursor: pointer;
		white-space: nowrap;
		font-family: inherit;
		box-shadow: 
			inset -1px -1px 0 #000000,
			inset 1px 1px 0 #666666;
	}

	.win95-tab:hover {
		background: #4a4a4a;
		color: #ffffff;
	}

	.win95-tab.active {
		background: #2a2a2a;
		border: 1px inset #2a2a2a;
		color: #ffffff;
		box-shadow: 
			inset 1px 1px 0 #000000,
			inset -1px -1px 0 #666666;
	}

	.win95-content {
		flex: 1;
		background: #1a1a1a;
		border: 1px inset #2a2a2a;
		margin: 2px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.win95-grid-container {
		flex: 1;
		overflow: auto;
		padding: 6px;
	}

	.win95-grid-container::-webkit-scrollbar {
		width: 16px;
		height: 16px;
	}

	.win95-grid-container::-webkit-scrollbar-track {
		background: #2a2a2a;
		border: 1px inset #2a2a2a;
	}

	.win95-grid-container::-webkit-scrollbar-thumb {
		background: #3a3a3a;
		border: 1px outset #3a3a3a;
		box-shadow: 
			inset -1px -1px 0 #000000,
			inset 1px 1px 0 #666666;
	}

	.win95-grid-container::-webkit-scrollbar-corner {
		background: #2a2a2a;
		border: 1px inset #2a2a2a;
	}

	.emoji-category-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.category-heading {
		color: #e0e0e0;
		font-size: 13px;
		font-weight: bold;
		padding: 4px 0;
		border-bottom: 1px solid #3a3a3a;
		margin-top: 8px;
	}

	.category-heading:first-child {
		margin-top: 0;
	}

	.win95-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
		gap: 3px;
		background: #1a1a1a;
	}

	@media (max-width: 480px) {
		.win95-grid {
			grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
		}
	}

	.win95-char-button {
		width: 100%;
		aspect-ratio: 1;
		min-width: 36px;
		background: #1a1a1a;
		border: 1px solid #3a3a3a;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #e0e0e0;
		box-shadow: 
			inset -1px -1px 0 #000000,
			inset 1px 1px 0 #555555;
	}

	@media (max-width: 480px) {
		.win95-char-button {
			min-width: 32px;
			font-size: 18px;
		}
	}

	.win95-char-button:hover {
		background: #1a3a5a;
		color: #ffffff;
		border-color: #2a5a7a;
	}

	.win95-char-button:active {
		box-shadow: 
			inset 1px 1px 0 #000000,
			inset -1px -1px 0 #555555;
	}

	.win95-char-button img {
		width: 28px;
		height: 28px;
		object-fit: contain;
		image-rendering: -webkit-optimize-contrast;
		image-rendering: crisp-edges;
	}

	/* Status Bar */
	.win95-statusbar {
		display: flex;
		justify-content: space-between;
		height: 22px;
		background: #3a3a3a;
		border-top: 1px solid #1a1a1a;
		border-bottom: 1px solid #555555;
		padding: 0 6px;
		align-items: center;
		font-size: 12px;
		color: #e0e0e0;
	}

	.statusbar-left,
	.statusbar-right {
		display: flex;
		align-items: center;
	}

	/* Consistent dark theme styling */
	:global(html.dark) .emoji-picker,
	:global(html:not(.dark)) .emoji-picker {
		border: 2px outset #4a4a4a;
		background: #2a2a2a;
	}
</style>

