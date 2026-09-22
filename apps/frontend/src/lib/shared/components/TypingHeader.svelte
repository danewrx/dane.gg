<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		text?: string;
		typingSpeed?: number;
		deletingSpeed?: number;
		pauseTime?: number;
	}

	let { text = 'Blog', typingSpeed = 150, deletingSpeed = 100, pauseTime = 2000 }: Props = $props();

	let displayedText = $state('');
	let isDeleting = $state(false);
	let typeTimeout: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		startTypingAnimation();
	});

	onDestroy(() => {
		if (typeTimeout) {
			clearTimeout(typeTimeout);
		}
	});

	function startTypingAnimation() {
		let charIndex = 0;

		function type() {
			if (!isDeleting && charIndex < text.length) {
				displayedText = text.substring(0, charIndex + 1);
				charIndex++;
				typeTimeout = setTimeout(type, typingSpeed);
			} else if (!isDeleting && charIndex === text.length) {
				typeTimeout = setTimeout(() => {
					isDeleting = true;
					type();
				}, pauseTime);
			} else if (isDeleting && charIndex > 0) {
				charIndex--;
				displayedText = text.substring(0, charIndex);
				typeTimeout = setTimeout(type, deletingSpeed);
			} else {
				isDeleting = false;
				charIndex = 0;
				typeTimeout = setTimeout(type, typingSpeed);
			}
		}

		type();
	}
</script>

<div class="typing-header">
	<span class="typing-text">{displayedText}</span>
	<span class="cursor">|</span>
</div>

<style>
	.typing-header {
		background: var(--bg-secondary, #1a1a1a);
		border: 1px solid var(--border-color, #4a4a4a);
		border-radius: 4px;
		padding: 16px 24px;
		margin-bottom: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
	}

	.typing-text {
		color: var(--text-primary, #ffffff);
		font-size: calc(24 * 1em / 14);
		font-weight: 600;
		letter-spacing: 1px;
	}

	.cursor {
		color: var(--text-primary, #ffffff);
		font-size: calc(24 * 1em / 14);
		font-weight: 600;
		animation: blink 1s infinite;
		margin-left: 2px;
	}

	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		51%,
		100% {
			opacity: 0;
		}
	}

	@media (max-width: 480px) {
		.typing-header {
			padding: 12px 16px;
			margin-bottom: 16px;
		}

		.typing-text,
		.cursor {
			font-size: calc(20 * 1em / 14);
		}
	}
</style>
