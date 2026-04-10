<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface ButtonLink {
		id: string;
		title: string;
		url: string;
		imageUrl: string;
		alt: string;
	}

	interface ButtonImage {
		id: string;
		imageUrl: string;
		alt: string;
	}

	// Real button links for top row
	let buttonLinks: ButtonLink[] = $state([
		{
			id: '1',
			title: 'DimDen',
			url: 'https://dimden.dev/',
			imageUrl: 'https://dimden.dev/services/images/88x31.gif',
			alt: 'DimDen'
		},
		{
			id: '2',
			title: 'Melankorin',
			url: 'https://melankorin.net/',
			imageUrl: 'https://melankorin.net/assets/img/buttons/button-1.gif',
			alt: 'Melankorin'
		},
		{
			id: '3',
			title: 'JESX',
			url: 'https://jesx.dev',
			imageUrl: 'https://jesx.dev/images/buttons/footer/jesx.gif',
			alt: 'jesx.dev'
		},
		{
			id: '4',
			title: 'NekoWeb',
			url: 'https://nekoweb.org/',
			imageUrl: 'https://nekoweb.org/assets/buttons/button6.gif',
			alt: 'NekoWeb'
		}
	]);

	let buttonImages: ButtonImage[] = $state([
		{
			id: '1',
			imageUrl: '/assets/img/buttons/blink-0.gif',
			alt: 'Blink Button'
		},
		{
			id: '2',
			imageUrl: '/assets/img/buttons/corp.gif',
			alt: 'Corp Button'
		},
		{
			id: '3',
			imageUrl: '/assets/img/buttons/heart.gif',
			alt: 'Heart Button'
		},
		{
			id: '4',
			imageUrl: '/assets/img/buttons/iestop.gif',
			alt: 'IE Stop Button'
		},
		{
			id: '5',
			imageUrl: '/assets/img/buttons/kawaiibutton.gif',
			alt: 'Kawaii Button'
		},
		{
			id: '6',
			imageUrl: '/assets/img/buttons/made_with_windows.gif',
			alt: 'Made with Windows'
		},
		{
			id: '7',
			imageUrl: '/assets/img/buttons/winrar.gif',
			alt: 'WinRAR Button'
		},
		{
			id: '8',
			imageUrl: '/assets/img/buttons/svelte.gif',
			alt: 'Svelte Button'
		}
	]);

	let topRowRef: HTMLDivElement;
	let bottomRowRef: HTMLDivElement;
	let topRowAnimation: Animation | null = null;
	let bottomRowAnimation: Animation | null = null;
	let isTopRowHovered = $state(false);
	let isBottomRowHovered = $state(false);

	// Duplicate arrays many times for truly seamless scrolling
	let topRowItems = $derived([
		...buttonLinks,
		...buttonLinks,
		...buttonLinks,
		...buttonLinks,
		...buttonLinks,
		...buttonLinks
	]);
	let bottomRowItems = $derived([
		...buttonImages,
		...buttonImages,
		...buttonImages,
		...buttonImages,
		...buttonImages,
		...buttonImages
	]);

	onMount(() => {
		startAnimations();
	});

	onDestroy(() => {
		stopAnimations();
	});

	function startAnimations() {
		if (!topRowRef || !bottomRowRef) return;

		const topRowWidth = topRowRef.scrollWidth / 6;
		const bottomRowWidth = bottomRowRef.scrollWidth / 6;

		topRowAnimation = topRowRef.animate(
			[{ transform: 'translateX(0)' }, { transform: `translateX(-${topRowWidth}px)` }],
			{
				duration: 10000, // 10 seconds
				iterations: Infinity,
				easing: 'linear'
			}
		);

		bottomRowAnimation = bottomRowRef.animate(
			[{ transform: 'translateX(0)' }, { transform: `translateX(-${bottomRowWidth}px)` }],
			{
				duration: 3000, // 3 seconds
				iterations: Infinity,
				easing: 'linear'
			}
		);
	}

	function stopAnimations() {
		if (topRowAnimation) {
			topRowAnimation.cancel();
			topRowAnimation = null;
		}
		if (bottomRowAnimation) {
			bottomRowAnimation.cancel();
			bottomRowAnimation = null;
		}
	}

	function handleTopRowHover() {
		isTopRowHovered = true;
		if (topRowAnimation) {
			topRowAnimation.pause();
		}
	}

	function handleTopRowLeave() {
		isTopRowHovered = false;
		if (topRowAnimation) {
			topRowAnimation.play();
		}
	}

	function handleBottomRowHover() {
		isBottomRowHovered = true;
	}

	function handleBottomRowLeave() {
		isBottomRowHovered = false;
	}

	function handleLinkClick(url: string) {
		window.open(url, '_blank', 'noopener,noreferrer');
	}
</script>

<div class="button-banner">
	<!-- Top row (pause on hover) -->
	<div
		class="button-row top-row"
		class:hovered={isTopRowHovered}
		bind:this={topRowRef}
		onmouseenter={handleTopRowHover}
		onmouseleave={handleTopRowLeave}
		role="banner"
		aria-label="Clickable button links"
	>
		{#each topRowItems as item, index}
			<a
				href={item.url}
				target="_blank"
				rel="noopener noreferrer"
				class="button-link"
				title={item.title}
				onclick={(e) => {
					e.preventDefault();
					handleLinkClick(item.url);
				}}
			>
				<img src={item.imageUrl} alt={item.alt} width="88" height="31" loading="lazy" />
			</a>
		{/each}
	</div>

	<!-- Bottom row -->
	<div
		class="button-row bottom-row"
		class:hovered={isBottomRowHovered}
		bind:this={bottomRowRef}
		onmouseenter={handleBottomRowHover}
		onmouseleave={handleBottomRowLeave}
		role="banner"
		aria-label="Scrolling button images"
	>
		{#each bottomRowItems as item, index}
			<div class="button-image">
				<img src={item.imageUrl} alt={item.alt} width="88" height="31" loading="lazy" />
			</div>
		{/each}
	</div>
</div>

<style>
	:global(*) {
		box-shadow: none !important;
		outline: none !important;
		transition: none !important;
	}

	:global(*:hover) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:active) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus-visible) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus-within) {
		box-shadow: none !important;
		outline: none !important;
	}
	.button-banner {
		width: 100%;
		overflow: hidden;
		background: transparent;
		padding: 16px 0;
		margin: 0;
	}

	.button-row {
		display: flex;
		width: 600%;
		gap: 8px;
		padding: 0 8px;
		box-sizing: border-box;
	}

	.top-row {
		margin-bottom: 8px;
	}

	.bottom-row {
		margin-bottom: 0;
	}

	.button-link {
		flex-shrink: 0;
		display: block;
		text-decoration: none;
		transition:
			transform 0.2s ease,
			opacity 0.2s ease;
		border-radius: 0;
		overflow: hidden;
	}

	.button-link:hover {
		transform: scale(1.05);
		opacity: 0.9;
	}

	.button-image {
		flex-shrink: 0;
		display: block;
		border-radius: 0;
		overflow: hidden;
	}

	.button-link img,
	.button-image img {
		display: block;
		width: 88px;
		height: 31px;
		object-fit: cover;
		border: none;
		transition: opacity 0.2s ease;
	}

	.button-link:hover img {
		opacity: 0.9;
	}

	@media (max-width: 768px) {
		.button-banner {
			padding: 12px 0;
		}

		.button-row {
			width: 600%;
			gap: 6px;
			padding: 0 6px;
		}

		.top-row {
			margin-bottom: 6px;
		}

		.button-link img,
		.button-image img {
			width: 80px;
			height: 28px;
		}
	}

	@media (max-width: 480px) {
		.button-banner {
			padding: 8px 0;
		}

		.button-row {
			width: 600%;
			gap: 4px;
			padding: 0 4px;
		}

		.top-row {
			margin-bottom: 4px;
		}

		.button-link img,
		.button-image img {
			width: 72px;
			height: 25px;
		}
	}

	@media (max-width: 320px) {
		.button-row {
			width: 600%;
			gap: 2px;
			padding: 0 2px;
		}

		.button-link img,
		.button-image img {
			width: 64px;
			height: 22px;
		}
	}
</style>
