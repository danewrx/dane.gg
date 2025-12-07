<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Smile } from 'lucide-svelte';

	const dispatch = createEventDispatcher<{
		select: { emoji: string };
	}>();

	let { isOpen = $bindable(false) } = $props();

	const emojiCategories = [
		{
			name: 'Smileys',
			emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙']
		},
		{
			name: 'Hearts',
			emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
		},
		{
			name: 'Gestures',
			emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️']
		},
		{
			name: 'Reactions',
			emojis: ['🔥', '💯', '⭐', '✨', '🌟', '💫', '⚡', '💥', '💢', '💦', '💨', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🎖️']
		},
		{
			name: 'Animals',
			emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦅']
		},
		{
			name: 'Food',
			emojis: ['🍎', '🍌', '🍇', '🍓', '🍑', '🍒', '🍕', '🍔', '🍟', '🌭', '🍿', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍮']
		},
		{
			name: 'Objects',
			emojis: ['💻', '📱', '⌚', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '🕹️', '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📺', '📻']
		},
		{
			name: 'Symbols',
			emojis: ['✅', '❌', '⭕', '❓', '❔', '❗', '❕', '💬', '💭', '🗯️', '♠️', '♥️', '♦️', '♣️', '🃏', '🀄', '🎴', '🎭', '🖼️', '🎨']
		}
	];

	let selectedCategory = $state('Smileys');

	function selectEmoji(emoji: string) {
		dispatch('select', { emoji });
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
		</div>

		<div class="emoji-grid">
			{#each emojiCategories.find(c => c.name === selectedCategory)?.emojis || [] as emoji}
				<button
					class="emoji-button"
					onclick={() => selectEmoji(emoji)}
					type="button"
					title={emoji}
				>
					{emoji}
				</button>
			{/each}
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

