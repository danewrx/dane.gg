<script lang="ts">
	import type { BannerConfig } from '$lib/admin/services/bannerService';
	import { onMount } from 'svelte';

	interface Props {
		config: BannerConfig;
	}

	let { config }: Props = $props();

	let bannerContainer: HTMLDivElement;
	let bannerContent: HTMLDivElement;
	let animationId: number;

	function startAnimation() {
		if (!bannerContainer || !bannerContent) return;

		const containerWidth = bannerContainer.offsetWidth;
		const contentWidth = bannerContent.offsetWidth;
		
		// Calculate total distance to travel (from right edge to completely off left)
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
			const position = containerWidth - (progress * totalDistance);
			
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
	style:color={config.textColor}
	bind:this={bannerContainer}
>
	<div class="banner-content" bind:this={bannerContent}>
		{config.text}
	</div>
</div>

<style>
	.banner-container {
		width: 100%;
		overflow: hidden;
		position: relative;
		padding: 4px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.banner-content {
		display: inline-block;
		font-size: 14px;
		font-weight: 500;
		letter-spacing: 0.5px;
		white-space: nowrap;
		will-change: transform;
	}

	@media (max-width: 768px) {
		.banner-container {
			padding: 3px 0;
		}

		.banner-content {
			font-size: 13px;
		}
	}

	@media (max-width: 480px) {
		.banner-container {
			padding: 2px 0;
		}

		.banner-content {
			font-size: 12px;
		}
	}
</style>
