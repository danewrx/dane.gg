<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { X } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	import { getEmojiCategories } from '$lib/shared/utils/emojiData';
	import { trackEmojiUsage, getRecentEmojis } from '$lib/shared/utils/recentEmojis';

	const dispatch = createEventDispatcher<{
		select: { emoji: string; isCustom?: boolean; imageUrl?: string };
	}>();

	let { isOpen = $bindable(false), reloadTrigger = 0, triggerButton: triggerButtonRef } = $props();

	interface CustomEmoji {
		id: string;
		name: string;
		imageUrl: string;
		isCustom: boolean;
	}

	let customEmojis = $state<CustomEmoji[]>([]);
	let isLoadingCustom = $state(false);
	let hasLoadedEmojis = $state(false);
	let pickerElement: HTMLDivElement | null = $state(null);
	let overlayElement: HTMLDivElement | null = $state(null);

	function generateEmojiCategories(): Array<{
		name: string;
		emojis: Array<{ emoji: string; name: string }>;
	}> {
		if (!browser) return [];

		const categories = getEmojiCategories();

		return categories.map(
			(cat: { name: string; emojis: Array<{ emoji: string; name: string }> }) => ({
				name: cat.name,
				emojis: cat.emojis
			})
		);
	}

	let emojiCategories = $state<
		Array<{ name: string; emojis: Array<{ emoji: string; name: string }> }>
	>([]);
	let recentEmojis = $state<Array<{ emoji: string; name: string }>>([]);

	let selectedCategory = $state('All');

	// Load custom emojis from API
	async function loadCustomEmojis() {
		if (!browser || isLoadingCustom) return;

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

	function selectEmoji(
		emojiData: { emoji: string; name: string } | string,
		isCustom = false,
		imageUrl?: string,
		emojiName?: string
	) {
		if (isCustom && imageUrl && emojiName) {
			// Track custom emoji usage
			trackEmojiUsage(`:${emojiName}:`, emojiName);
			dispatch('select', { emoji: `:${emojiName}:`, isCustom: true, imageUrl });
		} else if (typeof emojiData === 'object') {
			// Track default emoji usage
			trackEmojiUsage(emojiData.emoji, emojiData.name);
			dispatch('select', { emoji: `:${emojiData.name}:`, isCustom: false });
		} else {
			// Track emoji character usage
			trackEmojiUsage(emojiData);
			dispatch('select', { emoji: emojiData, isCustom: false });
		}
		recentEmojis = getRecentEmojis();
		isOpen = false;
	}

	function closePicker(event?: Event) {
		if (event) {
			event.stopPropagation();
		}
		console.log('closePicker called', { event, stack: new Error().stack });
		isOpen = false;
	}

	function handleOverlayClick(event: MouseEvent) {
		if (pickerElement) {
			const pickerRect = pickerElement.getBoundingClientRect();
			const clickX = event.clientX;
			const clickY = event.clientY;

			if (
				clickX >= pickerRect.left &&
				clickX <= pickerRect.right &&
				clickY >= pickerRect.top &&
				clickY <= pickerRect.bottom
			) {
				event.stopPropagation();
				event.preventDefault();
				return;
			}
		}

		const path = event.composedPath();
		if (pickerElement && path.includes(pickerElement)) {
			event.stopPropagation();
			event.preventDefault();
			return;
		}

		closePicker();
	}

	let lastReloadTrigger = $state(0);

	$effect(() => {
		if (isOpen && customEmojis.length === 0 && !isLoadingCustom && !hasLoadedEmojis) {
			loadCustomEmojis().then(() => {
				hasLoadedEmojis = true;
			});
		}
	});

	$effect(() => {
		if (reloadTrigger > 0 && reloadTrigger !== lastReloadTrigger && !isLoadingCustom) {
			lastReloadTrigger = reloadTrigger;
			hasLoadedEmojis = false;
			loadCustomEmojis().then(() => {
				hasLoadedEmojis = true;
			});
		}
	});

	// Function to position picker relative to trigger button
	function positionPicker() {
		if (!browser || !pickerElement || !isOpen) return;

		let button: HTMLElement | null = null;
		if (triggerButtonRef) {
			button = triggerButtonRef as HTMLElement;
		} else {
			// Fallback: try to find button by class
			button = document.querySelector('.emoji-btn, .emoji-button') as HTMLElement;
		}

		if (button) {
			const rect = button.getBoundingClientRect();
			const pickerWidth = pickerElement.offsetWidth || 360;
			const pickerHeight = pickerElement.offsetHeight || 320;
			const spaceAbove = rect.top;
			const spaceBelow = window.innerHeight - rect.bottom;

			let leftPos = rect.right - pickerWidth;

			// Ensure picker stays within viewport
			if (leftPos < 10) {
				leftPos = 10;
			}
			if (leftPos + pickerWidth > window.innerWidth - 10) {
				leftPos = window.innerWidth - pickerWidth - 10;
			}

			// Position above or below button
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
				// Center vertically if not enough space
				pickerElement.style.top = '50%';
				pickerElement.style.bottom = 'auto';
				pickerElement.style.left = `${Math.max(10, Math.min(leftPos, window.innerWidth - pickerWidth - 10))}px`;
				pickerElement.style.right = 'auto';
				pickerElement.style.transform = 'translateY(-50%)';
			}
		}
	}

	// Position picker when opened
	$effect(() => {
		if (isOpen && browser && pickerElement) {
			// Move picker to body for proper positioning
			if (pickerElement.parentNode !== document.body) {
				document.body.appendChild(pickerElement);
			}
			if (overlayElement && overlayElement.parentNode !== document.body) {
				document.body.appendChild(overlayElement);
			}

			// Position after a short delay to ensure dimensions are calculated
			setTimeout(() => {
				positionPicker();
			}, 10);

			// Update position on resize/scroll
			const handleResize = () => {
				if (isOpen && pickerElement) {
					positionPicker();
				}
			};

			window.addEventListener('resize', handleResize);
			window.addEventListener('scroll', handleResize, true);

			return () => {
				window.removeEventListener('resize', handleResize);
				window.removeEventListener('scroll', handleResize, true);
			};
		} else if (!isOpen && pickerElement && overlayElement) {
			// Clean up positioning styles
			pickerElement.style.top = '';
			pickerElement.style.bottom = '';
			pickerElement.style.left = '';
			pickerElement.style.right = '';
			pickerElement.style.transform = '';
		}
	});

	onMount(() => {
		if (browser) {
			emojiCategories = generateEmojiCategories();
			recentEmojis = getRecentEmojis();
			console.log(
				'Admin emoji categories loaded:',
				emojiCategories.length,
				'categories with',
				emojiCategories.reduce((sum, cat) => sum + cat.emojis.length, 0),
				'total emojis'
			);
		}
		if (!hasLoadedEmojis) {
			loadCustomEmojis().then(() => {
				hasLoadedEmojis = true;
			});
		}
	});

	$effect(() => {
		if (isOpen && browser) {
			recentEmojis = getRecentEmojis();
		}
	});

	onDestroy(() => {
		if (pickerElement && pickerElement.parentNode === document.body) {
			document.body.removeChild(pickerElement);
		}
		if (overlayElement && overlayElement.parentNode === document.body) {
			document.body.removeChild(overlayElement);
		}
	});
</script>

{#if isOpen}
	<div
		class="emoji-picker-overlay"
		bind:this={overlayElement}
		onclick={(e) => {
			if (pickerElement) {
				const pickerRect = pickerElement.getBoundingClientRect();
				if (
					e.clientX >= pickerRect.left &&
					e.clientX <= pickerRect.right &&
					e.clientY >= pickerRect.top &&
					e.clientY <= pickerRect.bottom
				) {
					e.stopPropagation();
					e.preventDefault();
					return;
				}
			}

			if (pickerElement && e.composedPath().includes(pickerElement)) {
				e.stopPropagation();
				e.preventDefault();
				return;
			}

			handleOverlayClick(e);
		}}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				closePicker(e);
			}
		}}
	></div>
	<div
		class="emoji-picker"
		bind:this={pickerElement}
		role="dialog"
		aria-modal="true"
		aria-label="Emoji picker"
		tabindex="-1"
		onclick={(e) => {
			e.stopPropagation();
			e.preventDefault();
		}}
		onkeydown={(e) => e.stopPropagation()}
		onmousedown={(e) => {
			e.stopPropagation();
			e.preventDefault();
		}}
	>
		<div class="picker-header">
			<div class="picker-title">Emoji Picker</div>
			<button class="close-button" type="button" onclick={closePicker} title="Close">
				<X size={16} />
			</button>
		</div>

		<!-- Category Tabs -->
		<div class="picker-tabs" role="toolbar" aria-label="Emoji categories">
			<button
				class="picker-tab"
				class:active={selectedCategory === 'All'}
				onclick={(e) => {
					e.stopPropagation();
					e.preventDefault();
					selectedCategory = 'All';
				}}
				onmousedown={(e) => e.stopPropagation()}
				type="button"
			>
				All
			</button>
			{#if recentEmojis.length > 0}
				<button
					class="picker-tab"
					class:active={selectedCategory === 'Recently Used'}
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						selectedCategory = 'Recently Used';
					}}
					onmousedown={(e) => e.stopPropagation()}
					type="button"
				>
					Recently Used
				</button>
			{/if}
			{#each emojiCategories as category}
				<button
					class="picker-tab"
					class:active={selectedCategory === category.name}
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						selectedCategory = category.name;
					}}
					onmousedown={(e) => e.stopPropagation()}
					type="button"
				>
					{category.name}
				</button>
			{/each}
			{#if customEmojis.length > 0}
				<button
					class="picker-tab"
					class:active={selectedCategory === 'Custom'}
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						selectedCategory = 'Custom';
					}}
					onmousedown={(e) => e.stopPropagation()}
					type="button"
				>
					Custom
				</button>
			{/if}
		</div>

		<div class="picker-content">
			<div class="picker-grid-container">
				{#if selectedCategory === 'All'}
					<div class="emoji-category-section">
						{#if recentEmojis.length > 0}
							<div class="category-heading">Recently Used</div>
							<div class="picker-grid">
								{#each recentEmojis as emojiData}
									{@const isCustomEmoji =
										emojiData.emoji.startsWith(':') && emojiData.emoji.endsWith(':')}
									{@const customEmoji = isCustomEmoji
										? customEmojis.find((c) => c.name === emojiData.name)
										: null}
									<button
										class="emoji-button"
										onclick={() =>
											isCustomEmoji && customEmoji
												? selectEmoji('', true, customEmoji.imageUrl, customEmoji.name)
												: selectEmoji(emojiData)}
										type="button"
										title={`:${emojiData.name}:`}
									>
										{#if isCustomEmoji && customEmoji}
											<img src={customEmoji.imageUrl} alt={customEmoji.name} loading="lazy" />
										{:else}
											{emojiData.emoji}
										{/if}
									</button>
								{/each}
							</div>
						{/if}
						{#if customEmojis.length > 0}
							<div class="category-heading">Custom</div>
							<div class="picker-grid">
								{#each customEmojis as customEmoji}
									<button
										class="emoji-button"
										onclick={() => selectEmoji('', true, customEmoji.imageUrl, customEmoji.name)}
										type="button"
										title={`:${customEmoji.name}:`}
									>
										<img src={customEmoji.imageUrl} alt={customEmoji.name} loading="lazy" />
									</button>
								{/each}
							</div>
						{/if}
						{#each emojiCategories as category}
							<div class="category-heading">{category.name}</div>
							<div class="picker-grid">
								{#each category.emojis as emojiData}
									<button
										class="emoji-button"
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
				{:else if selectedCategory === 'Recently Used'}
					<div class="picker-grid">
						{#each recentEmojis as emojiData}
							{@const isCustomEmoji =
								emojiData.emoji.startsWith(':') && emojiData.emoji.endsWith(':')}
							{@const customEmoji = isCustomEmoji
								? customEmojis.find((c) => c.name === emojiData.name)
								: null}
							<button
								class="emoji-button"
								onclick={() =>
									isCustomEmoji && customEmoji
										? selectEmoji('', true, customEmoji.imageUrl, customEmoji.name)
										: selectEmoji(emojiData)}
								type="button"
								title={`:${emojiData.name}:`}
							>
								{#if isCustomEmoji && customEmoji}
									<img src={customEmoji.imageUrl} alt={customEmoji.name} loading="lazy" />
								{:else}
									{emojiData.emoji}
								{/if}
							</button>
						{/each}
					</div>
				{:else if selectedCategory === 'Custom'}
					<div class="picker-grid">
						{#each customEmojis as customEmoji}
							<button
								class="emoji-button"
								onclick={() => selectEmoji('', true, customEmoji.imageUrl, customEmoji.name)}
								type="button"
								title={`:${customEmoji.name}:`}
							>
								<img src={customEmoji.imageUrl} alt={customEmoji.name} loading="lazy" />
							</button>
						{/each}
					</div>
				{:else}
					<div class="picker-grid">
						{#each emojiCategories.find((c) => c.name === selectedCategory)?.emojis || [] as emojiData}
							<button
								class="emoji-button"
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
		pointer-events: auto;
	}

	.emoji-picker-overlay:has(+ .emoji-picker) {
		pointer-events: auto;
	}

	.emoji-picker {
		position: fixed;
		width: 360px;
		max-width: calc(100vw - 20px);
		height: 320px;
		max-height: calc(100vh - 40px);
		display: flex;
		flex-direction: column;
		z-index: 10000;
		overflow: hidden;
		pointer-events: auto;
		background: #2d2d2d;
		border: 1px solid #404040;
		border-radius: 8px;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		box-sizing: border-box;
	}

	:global(html:not(.dark)) .emoji-picker {
		background: #ffffff;
		border-color: #e5e7eb;
	}

	@media (max-width: 768px) {
		.emoji-picker {
			width: calc(100vw - 20px);
			max-width: calc(100vw - 20px);
			height: 50vh;
			max-height: calc(100vh - 100px);
		}
	}

	.picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: #3a3a3a;
		border-bottom: 1px solid #404040;
		border-radius: 8px 8px 0 0;
	}

	:global(html:not(.dark)) .picker-header {
		background: #f9fafb;
		border-bottom-color: #e5e7eb;
	}

	.picker-title {
		font-size: 14px;
		font-weight: 500;
		color: #ffffff;
	}

	:global(html:not(.dark)) .picker-title {
		color: #1f2937;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: #a1a1aa;
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
	}

	.close-button:hover {
		background: #ef4444;
		color: #ffffff;
	}

	:global(html:not(.dark)) .close-button {
		color: #6b7280;
	}

	:global(html:not(.dark)) .close-button:hover {
		background: #ef4444;
		color: #ffffff;
	}

	.picker-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		padding: 6px 8px;
		background: #252525;
		border-bottom: 1px solid #404040;
		overflow: hidden;
		max-height: 70px;
		align-items: flex-start;
		align-content: flex-start;
	}

	:global(html:not(.dark)) .picker-tabs {
		background: #f3f4f6;
		border-bottom-color: #e5e7eb;
	}

	.picker-tabs::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	.picker-tabs::-webkit-scrollbar-track {
		background: transparent;
	}

	.picker-tabs::-webkit-scrollbar-thumb {
		background: #404040;
		border-radius: 4px;
	}

	:global(html:not(.dark)) .picker-tabs::-webkit-scrollbar-thumb {
		background: #d1d5db;
	}

	.picker-tab {
		padding: 4px 10px;
		background: #2d2d2d;
		border: 1px solid #404040;
		border-radius: 4px;
		color: #a1a1aa;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s ease;
		font-family: inherit;
		position: relative;
		line-height: 1.3;
		height: fit-content;
	}

	.picker-tab:hover {
		background: #3a3a3a;
		border-color: #505050;
		color: #ffffff;
		transform: translateY(-1px);
	}

	.picker-tab.active {
		background: #3a3a3a;
		border-color: var(--accent-color, #3b82f6);
		color: #ffffff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.picker-tab.active::after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--accent-color, #3b82f6);
		border-radius: 0 0 6px 6px;
	}

	:global(html:not(.dark)) .picker-tab {
		background: #ffffff;
		border-color: #e5e7eb;
		color: #6b7280;
	}

	:global(html:not(.dark)) .picker-tab:hover {
		background: #f9fafb;
		border-color: #d1d5db;
		color: #1f2937;
	}

	:global(html:not(.dark)) .picker-tab.active {
		background: #ffffff;
		border-color: var(--accent-color, #3b82f6);
		color: #1f2937;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.picker-content {
		flex: 1;
		background: #2d2d2d;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	:global(html:not(.dark)) .picker-content {
		background: #ffffff;
	}

	.picker-grid-container {
		flex: 1;
		overflow: auto;
		padding: 8px;
	}

	.picker-grid-container::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	.picker-grid-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.picker-grid-container::-webkit-scrollbar-thumb {
		background: #404040;
		border-radius: 4px;
	}

	:global(html:not(.dark)) .picker-grid-container::-webkit-scrollbar-thumb {
		background: #d1d5db;
	}

	.emoji-category-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.category-heading {
		color: #a1a1aa;
		font-size: 12px;
		font-weight: 500;
		padding: 8px 4px 4px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	:global(html:not(.dark)) .category-heading {
		color: #6b7280;
	}

	.picker-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
		gap: 4px;
	}

	@media (max-width: 480px) {
		.picker-grid {
			grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
		}
	}

	.emoji-button {
		width: 100%;
		aspect-ratio: 1;
		min-width: 36px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 6px;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: inherit;
		transition: all 0.15s;
	}

	@media (max-width: 480px) {
		.emoji-button {
			min-width: 32px;
			font-size: 18px;
		}
	}

	.emoji-button:hover {
		background: #3a3a3a;
		border-color: #404040;
	}

	:global(html:not(.dark)) .emoji-button:hover {
		background: #f3f4f6;
		border-color: #d1d5db;
	}

	.emoji-button:active {
		transform: scale(0.95);
	}

	.emoji-button img {
		width: 28px;
		height: 28px;
		object-fit: contain;
		image-rendering: -webkit-optimize-contrast;
		image-rendering: crisp-edges;
	}

	@media (max-width: 480px) {
		.emoji-button img {
			width: 24px;
			height: 24px;
		}
	}
</style>
