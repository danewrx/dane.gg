<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { Smile } from 'lucide-svelte';
	import { browser } from '$app/environment';

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

	let selectedCategory = $state('Smileys');

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

	$effect(() => {
		if (reloadTrigger > 0) {
			loadCustomEmojis();
		}
	});

	onMount(() => {
		loadCustomEmojis();
	});
</script>

{#if isOpen}
	<div class="emoji-picker-overlay" onclick={handleOverlayClick} role="button" tabindex="-1"></div>
	<div class="emoji-picker" onclick={(e) => e.stopPropagation()}>
		<div class="emoji-picker-header">
			<div class="picker-title">
				<Smile size={18} />
				<span>Pick an emoji</span>
			</div>
			<button class="close-button" onclick={closePicker} type="button">
				×
			</button>
		</div>

		<div class="emoji-categories">
			{#each emojiCategories as category}
				<button
					class="category-tab"
					class:active={selectedCategory === category.name}
					onclick={() => selectedCategory = category.name}
					type="button"
				>
					{category.name}
				</button>
			{/each}
			{#if customEmojis.length > 0}
				<button
					class="category-tab"
					class:active={selectedCategory === 'Custom'}
					onclick={() => selectedCategory = 'Custom'}
					type="button"
				>
					Custom
				</button>
			{/if}
		</div>

		<div class="emoji-grid">
			{#if selectedCategory === 'Custom'}
				{#each customEmojis as customEmoji}
					<button
						class="emoji-button custom-emoji"
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
			{:else}
				{#each emojiCategories.find(c => c.name === selectedCategory)?.emojis || [] as emojiData}
					<button
						class="emoji-button"
						onclick={() => selectEmoji(emojiData)}
						type="button"
						title={`:${emojiData.name}:`}
					>
						{emojiData.emoji}
					</button>
				{/each}
			{/if}
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
		position: absolute;
		bottom: 100%;
		right: 0;
		margin-bottom: 4px;
		background: #1a1a1a;
		border: 1px solid #666;
		border-radius: 0;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
		width: 320px;
		max-height: 400px;
		display: flex;
		flex-direction: column;
		z-index: 1000;
		overflow: hidden;
		font-family: 'Courier New', monospace;
	}

	.emoji-picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-bottom: 1px solid #666;
		background: #2a2a2a;
	}

	.picker-title {
		display: flex;
		align-items: center;
		gap: 6px;
		color: #e8e8e8;
		font-size: 13px;
		font-weight: normal;
		font-family: 'Courier New', monospace;
	}

	.close-button {
		background: transparent;
		border: 1px solid #666;
		color: #e8e8e8;
		font-size: 16px;
		line-height: 1;
		cursor: pointer;
		padding: 2px 6px;
		width: auto;
		height: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0;
		transition: all 0.1s;
		font-family: 'Courier New', monospace;
	}

	.close-button:hover {
		background: #3a3a3a;
		border-color: #888;
	}

	.emoji-categories {
		display: flex;
		gap: 2px;
		padding: 4px;
		border-bottom: 1px solid #666;
		overflow-x: auto;
		background: #2a2a2a;
	}

	.emoji-categories::-webkit-scrollbar {
		height: 4px;
	}

	.emoji-categories::-webkit-scrollbar-thumb {
		background: #666;
		border-radius: 0;
	}

	.category-tab {
		padding: 4px 8px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 0;
		color: #a1a1aa;
		font-size: 11px;
		font-weight: normal;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.1s;
		font-family: 'Courier New', monospace;
	}

	.category-tab:hover {
		background: #3a3a3a;
		border-color: #666;
		color: #e8e8e8;
	}

	.category-tab.active {
		background: #3a3a3a;
		border-color: #888;
		color: #e8e8e8;
	}

	.emoji-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 2px;
		padding: 8px;
		overflow-y: auto;
		max-height: 280px;
		background: #1a1a1a;
	}

	.emoji-grid::-webkit-scrollbar {
		width: 8px;
	}

	.emoji-grid::-webkit-scrollbar-track {
		background: transparent;
	}

	.emoji-grid::-webkit-scrollbar-thumb {
		background: #666;
		border-radius: 0;
	}

	.emoji-button {
		background: transparent;
		border: 1px solid transparent;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		padding: 6px;
		border-radius: 0;
		transition: all 0.1s;
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
	}

	.emoji-button:hover {
		background: #3a3a3a;
		border-color: #666;
		transform: none;
	}

	.emoji-button:active {
		background: #4a4a4a;
		transform: none;
	}

	.emoji-button.custom-emoji img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		image-rendering: -webkit-optimize-contrast;
		image-rendering: crisp-edges;
	}

	:global(html:not(.dark)) .emoji-picker {
		background: #1a1a1a;
		border-color: #666;
	}

	:global(html:not(.dark)) .emoji-picker-header {
		background: #2a2a2a;
		border-bottom-color: #666;
	}

	:global(html:not(.dark)) .picker-title {
		color: #e8e8e8;
	}

	:global(html:not(.dark)) .close-button {
		color: #e8e8e8;
		border-color: #666;
	}

	:global(html:not(.dark)) .close-button:hover {
		background: #3a3a3a;
		border-color: #888;
	}

	:global(html:not(.dark)) .emoji-categories {
		background: #2a2a2a;
		border-bottom-color: #666;
	}

	:global(html:not(.dark)) .category-tab {
		color: #a1a1aa;
	}

	:global(html:not(.dark)) .category-tab:hover {
		background: #3a3a3a;
		border-color: #666;
		color: #e8e8e8;
	}

	:global(html:not(.dark)) .category-tab.active {
		background: #3a3a3a;
		border-color: #888;
		color: #e8e8e8;
	}

	:global(html:not(.dark)) .emoji-button:hover {
		background: #3a3a3a;
		border-color: #666;
	}
</style>

