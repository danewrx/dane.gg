<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	// The container element to attach mouse events to
	let { container = $bindable<HTMLElement | null>(null) }: { container?: HTMLElement | null } = $props();

	// Global tooltip element
	let tooltipElement: HTMLElement | null = null;

	function createTooltip() {
		if (!browser || tooltipElement) return;

		tooltipElement = document.createElement('div');
		tooltipElement.className = 'emoji-global-tooltip';
		tooltipElement.innerHTML = `
			<div class="tooltip-emoji"></div>
			<div class="tooltip-name"></div>
		`;
		tooltipElement.style.cssText = `
			display: none;
			position: fixed;
			z-index: 99999;
			pointer-events: none;
			background: rgba(0, 0, 0, 0.95);
			border: 1px solid rgba(255, 255, 255, 0.2);
			border-radius: 8px;
			padding: 8px 12px;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
			backdrop-filter: blur(8px);
			flex-direction: column;
			align-items: center;
			gap: 4px;
			min-width: 60px;
		`;
		document.body.appendChild(tooltipElement);
	}

	function destroyTooltip() {
		if (tooltipElement && tooltipElement.parentNode) {
			tooltipElement.parentNode.removeChild(tooltipElement);
			tooltipElement = null;
		}
	}

	function positionTooltip(e: MouseEvent) {
		if (!tooltipElement) return;

		let left = e.clientX + 15;
		let top = e.clientY - 20;

		const tooltipRect = tooltipElement.getBoundingClientRect();
		const tooltipWidth = tooltipRect.width || 100;
		const tooltipHeight = tooltipRect.height || 80;

		if (left + tooltipWidth > window.innerWidth - 10) {
			left = e.clientX - tooltipWidth - 15;
		}

		if (top < 10) top = 10;
		if (top + tooltipHeight > window.innerHeight - 10) {
			top = window.innerHeight - tooltipHeight - 10;
		}
		if (left < 10) left = 10;

		tooltipElement.style.top = `${top}px`;
		tooltipElement.style.left = `${left}px`;
	}

	function handleMouseOver(e: MouseEvent) {
		const target = e.target as HTMLElement;

		const emojiHover = target.closest('.emoji-hover') as HTMLElement;
		if (!emojiHover || !tooltipElement) return;

		const inlineTooltip = emojiHover.querySelector('.emoji-tooltip-popup') as HTMLElement;
		if (!inlineTooltip) return;

		const emojiContent = inlineTooltip.querySelector('.tooltip-emoji-char, .tooltip-emoji-img');
		const nameContent = inlineTooltip.querySelector('.tooltip-name');

		if (!emojiContent || !nameContent) return;

		const tooltipEmoji = tooltipElement.querySelector('.tooltip-emoji') as HTMLElement;
		const tooltipName = tooltipElement.querySelector('.tooltip-name') as HTMLElement;

		if (emojiContent.tagName === 'IMG') {
			tooltipEmoji.innerHTML = `<img src="${(emojiContent as HTMLImageElement).src}" style="width: 40px; height: 40px; object-fit: contain;">`;
		} else {
			tooltipEmoji.textContent = emojiContent.textContent;
			tooltipEmoji.style.fontSize = '32px';
			tooltipEmoji.style.lineHeight = '1';
			tooltipEmoji.style.textAlign = 'center';
		}
		tooltipName.textContent = nameContent.textContent;
		tooltipName.style.cssText =
			'font-size: 11px; color: #b0b0b0; font-family: monospace; margin-top: 4px; text-align: center;';

		tooltipElement.style.display = 'flex';
		positionTooltip(e);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!tooltipElement || tooltipElement.style.display !== 'flex') return;

		const target = e.target as HTMLElement;
		const emojiHover = target.closest('.emoji-hover') as HTMLElement;
		if (!emojiHover) return;

		positionTooltip(e);
	}

	function handleMouseOut(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const emojiHover = target.closest('.emoji-hover') as HTMLElement;
		if (!emojiHover) return;

		const relatedTarget = e.relatedTarget as HTMLElement;
		if (!emojiHover.contains(relatedTarget) && tooltipElement) {
			tooltipElement.style.display = 'none';
		}
	}

	function attachListeners(element: HTMLElement) {
		element.addEventListener('mouseover', handleMouseOver);
		element.addEventListener('mousemove', handleMouseMove);
		element.addEventListener('mouseout', handleMouseOut);
	}

	function detachListeners(element: HTMLElement) {
		element.removeEventListener('mouseover', handleMouseOver);
		element.removeEventListener('mousemove', handleMouseMove);
		element.removeEventListener('mouseout', handleMouseOut);
	}

	$effect(() => {
		if (browser && container) {
			createTooltip();
			attachListeners(container);

			return () => {
				detachListeners(container!);
			};
		}
	});

	onMount(() => {
		createTooltip();
	});

	onDestroy(() => {
		if (container) {
			detachListeners(container);
		}
		destroyTooltip();
	});
</script>

