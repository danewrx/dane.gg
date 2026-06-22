<script lang="ts">
	import type { BannerConfig } from '$lib/admin/services/bannerService';
	import { onMount } from 'svelte';
	import { siteTheme } from '$lib/site/stores/theme';
	import { getReadableTextColor } from '$lib/site/constants/tagContrast';

	interface Props {
		config: BannerConfig;
	}

	let { config }: Props = $props();

	const adjustedTextColor = $derived.by(() => {
		const bg = config.transparentBackground ? $siteTheme.surfaceColor : config.backgroundColor;
		return getReadableTextColor(config.textColor, bg);
	});

	function convertBannerText(text: string): string {
		// If it's already HTML, return
		if (/<[a-z][\s\S]*>/i.test(text)) {
			return text;
		}

		let html = text;

		html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
		html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

		html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
		html = html.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');

		html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');

		return html;
	}

	let displayText = $derived(convertBannerText(config.text));

	let bannerContainer: HTMLDivElement;
	let bannerContent: HTMLDivElement;
	let animationId: number;

	function startAnimation() {
		if (!bannerContainer || !bannerContent) return;

		const containerWidth = bannerContainer.offsetWidth;
		const contentWidth = bannerContent.offsetWidth;

		// Calculate total distance to travel
		const totalDistance = containerWidth + contentWidth;

		// Calculate duration based on speed (px/s)
		const speed = Number(config.speed) || 50;
		const duration = (totalDistance / speed) * 1000; // Convert to milliseconds

		let startTime: number | null = null;

		function animate(currentTime: number) {
			if (!startTime) startTime = currentTime;
			const elapsed = currentTime - startTime;
			const progress = (elapsed % duration) / duration;

			// Move from right (100%) to left (-contentWidth)
			const position = containerWidth - progress * totalDistance;

			if (bannerContent) {
				bannerContent.style.transform = `translateX(${position}px)`;
			}

			animationId = requestAnimationFrame(animate);
		}

		animationId = requestAnimationFrame(animate);
	}

	onMount(() => {
		startAnimation();

		return () => {
			if (animationId) {
				cancelAnimationFrame(animationId);
			}
		};
	});

	// Restart animation when speed changes
	$effect(() => {
		config.speed; // Track speed changes
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
		startAnimation();
	});
</script>

<div
	class="banner-container"
	style:background-color={config.transparentBackground ? 'transparent' : config.backgroundColor}
	style:color={adjustedTextColor}
	bind:this={bannerContainer}
>
	<div class="banner-content" bind:this={bannerContent}>
		{@html displayText}
	</div>
</div>

<style>
	.banner-container {
		width: 100%;
		overflow: hidden;
		position: relative;
		padding: 4px 0;
		margin-top: 12px;
		margin-bottom: 12px;
	}

	.banner-content {
		display: inline-block;
		font-size: calc(14 * 1em / 14);
		font-weight: 500;
		letter-spacing: 0.5px;
		white-space: nowrap;
		will-change: transform;
	}

	@media (max-width: 768px) {
		.banner-container {
			padding: 3px 0;
			margin-top: 10px;
			margin-bottom: 10px;
		}

		.banner-content {
			font-size: calc(13 * 1em / 14);
		}
	}

	@media (max-width: 480px) {
		.banner-container {
			padding: 2px 0;
			margin-top: 8px;
			margin-bottom: 8px;
		}

		.banner-content {
			font-size: calc(12 * 1em / 14);
		}
	}
</style>
