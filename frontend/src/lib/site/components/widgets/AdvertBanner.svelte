<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import type { Advert } from '$lib/site/stores/adverts';

	interface Props {
		items: Advert[];
		rotationSeconds?: number;
		/** Transition between adverts: none, fade, slide, slide-up, zoom, flip. */
		transition?: string;
		/** Transition animation length in milliseconds. */
		transitionDurationMs?: number;
		alt?: string;
	}

	let {
		items,
		rotationSeconds = 8,
		transition = 'fade',
		transitionDurationMs = 600,
		alt = 'Advertisement'
	}: Props = $props();

	// Only adverts with an image are displayable.
	const visibleItems = $derived((items ?? []).filter((item) => item?.imageUrl));

	let index = $state(0);

	// Keep the index in range if the list shrinks.
	$effect(() => {
		if (index >= visibleItems.length) {
			index = 0;
		}
	});

	const current = $derived(visibleItems[index]);

	// Rotate between adverts. Only runs when there is more than one to show.
	$effect(() => {
		if (visibleItems.length <= 1) return;

		const intervalMs = Math.max(1, rotationSeconds) * 1000;
		const timer = setInterval(() => {
			index = (index + 1) % visibleItems.length;
		}, intervalMs);

		return () => clearInterval(timer);
	});

	// One transition function for both directions
	function advertTransition(node: Element, { out: isOut = false } = {}) {
		const dir = isOut ? -1 : 1;
		const DURATION = Math.max(0, transitionDurationMs) || 600;
		switch (transition) {
			case 'none':
				return { duration: 0 };
			case 'slide':
				return {
					duration: DURATION,
					easing: cubicOut,
					css: (t: number) => `transform: translateX(${dir * (1 - t) * 100}%)`
				};
			case 'slide-up':
				return {
					duration: DURATION,
					easing: cubicOut,
					css: (t: number) => `transform: translateY(${dir * (1 - t) * 100}%)`
				};
			case 'zoom':
				return {
					duration: DURATION,
					easing: cubicOut,
					css: (t: number) => `opacity: ${t}; transform: scale(${1 + (1 - t) * 0.12})`
				};
			case 'flip':
				return {
					duration: DURATION,
					easing: cubicOut,
					css: (t: number) =>
						`opacity: ${t}; transform: perspective(800px) rotateX(${dir * (1 - t) * 80}deg)`
				};
			case 'fade':
			default:
				return { duration: DURATION, css: (t: number) => `opacity: ${t}` };
		}
	}
</script>

{#if current}
	<div class="advert-banner-frame">
		{#key current.id ?? index}
			<div class="advert-slide" in:advertTransition out:advertTransition={{ out: true }}>
				{#if current.linkUrl}
					<a
						class="advert-banner"
						href={current.linkUrl}
						target="_blank"
						rel="noopener noreferrer nofollow sponsored"
						aria-label={current.title || alt}
					>
						<img
							src={current.imageUrl}
							alt={current.title || alt}
							loading="lazy"
							decoding="async"
						/>
					</a>
				{:else}
					<div class="advert-banner">
						<img
							src={current.imageUrl}
							alt={current.title || alt}
							loading="lazy"
							decoding="async"
						/>
					</div>
				{/if}
			</div>
		{/key}
	</div>
{/if}

<style>
	.advert-banner-frame {
		position: relative;
		width: 100%;
		aspect-ratio: 1456 / 180;
		overflow: hidden;
	}

	.advert-slide {
		position: absolute;
		inset: 0;
	}

	.advert-banner {
		display: block;
		width: 100%;
		height: 100%;
		line-height: 0;
	}

	.advert-banner img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}
</style>
