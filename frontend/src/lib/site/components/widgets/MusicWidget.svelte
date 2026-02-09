<script lang="ts">
	import { onMount } from 'svelte';
	import { Radio } from 'lucide-svelte';

	interface MusicData {
		track: string | null;
		artist: string | null;
		album: string | null;
		image: string | null;
		url: string | null;
		nowPlaying: boolean;
		lastUpdate: string;
	}

	let { musicData = $bindable() }: { musicData?: MusicData | null } = $props();
	let error: string | null = $state(null);
	let hasReceivedApiResponse = $state(!!musicData);
	let isCheckingOverflow = $state(false);

	onMount(() => {
		// Always fetch data on mount
		fetchMusicData();
		
		let fetchInterval: NodeJS.Timeout;
		let timeUpdateInterval: NodeJS.Timeout;
		
		// Function to set up dynamic polling based on play status
		function setupPolling() {
			// Clear existing intervals
			if (fetchInterval) clearInterval(fetchInterval);
			if (timeUpdateInterval) clearInterval(timeUpdateInterval);
			
			// More frequent polling when music is playing (15 seconds)
			// Less frequent when not playing (45 seconds)
			const pollInterval = musicData?.nowPlaying ? 15000 : 45000;
			
			console.log(`Setting up polling: ${pollInterval/1000}s interval (playing: ${musicData?.nowPlaying})`);
			
			fetchInterval = setInterval(fetchMusicData, pollInterval);
			
			// Update time formatting every minute
			timeUpdateInterval = setInterval(() => {
				if (musicData) {
					musicData = { ...musicData };
				}
			}, 60000);
		}
		
		// Initial setup
		setupPolling();
		
		// Re-setup polling when play status changes
		const checkPlayStatusChange = () => {
			setupPolling();
		};
		
		// Check for status changes every time musicData updates
		let lastPlayingState = musicData?.nowPlaying;
		const statusCheckInterval = setInterval(() => {
			if (musicData?.nowPlaying !== lastPlayingState) {
				lastPlayingState = musicData?.nowPlaying;
				checkPlayStatusChange();
			}
		}, 1000);
		
		return () => {
			clearInterval(fetchInterval);
			clearInterval(timeUpdateInterval);
			clearInterval(statusCheckInterval);
		};
	});

	// Check if text overflows and add scroll class
	function checkTextOverflow(): void {
		if (typeof window === 'undefined' || isCheckingOverflow) return;
		
		isCheckingOverflow = true;
		
		const titleElement = document.querySelector('.music-widget .track-title') as HTMLElement | null;
		const artistElement = document.querySelector('.music-widget .track-artist') as HTMLElement | null;
		
		console.log('Checking text overflow - elements found:', {
			title: !!titleElement,
			artist: !!artistElement
		});
		
		[titleElement, artistElement].forEach((element, index) => {
			if (element) {
				const elementType = ['title', 'artist'][index];
				
				element.classList.remove('scroll');
				element.style.removeProperty('--scroll-distance');
				
				element.style.display = 'none';
				element.offsetHeight;
				element.style.display = '';
				
				setTimeout(() => {
					const trackDetails = document.querySelector('.music-widget .track-details') as HTMLElement;
					const containerWidth = trackDetails?.clientWidth || 0;
					
					const originalTextOverflow = element.style.textOverflow;
					element.style.textOverflow = 'unset';
					element.style.overflow = 'visible';
					element.style.whiteSpace = 'nowrap';
					
					const scrollWidth = element.scrollWidth;
					const clientWidth = element.clientWidth;
					
					element.style.textOverflow = originalTextOverflow;
					element.style.overflow = '';
					element.style.whiteSpace = '';
					
					const availableWidth = containerWidth - 16; // Account for some padding
					const shouldScroll = scrollWidth > availableWidth && scrollWidth > clientWidth;
					
					console.log(`${elementType}:`, {
						text: element.textContent?.slice(0, 40),
						scrollWidth,
						clientWidth,
						containerWidth,
						availableWidth,
						shouldScroll,
						tagName: element.tagName
					});
					
					if (shouldScroll) {
						element.classList.add('scroll');
						const actualOverflow = scrollWidth - availableWidth;
						const scrollDistance = Math.max(actualOverflow, 0);
						element.style.setProperty('--scroll-distance', `-${scrollDistance}px`);
						console.log(`${elementType} scroll distance:`, `-${scrollDistance}px`, `(overflow: ${actualOverflow}px)`);
					} else {
						element.classList.remove('scroll');
						element.style.removeProperty('--scroll-distance');
					}
				}, 100);
			}
		});
		
		setTimeout(() => {
			isCheckingOverflow = false;
		}, 150);
	}

	// Overflow check for when music data changes
	$effect(() => {
		if (musicData) {
			setTimeout(checkTextOverflow, 200);
		}
	});

	// Window resize listener and container observer for overflow
	onMount(() => {
		let resizeTimeout: NodeJS.Timeout;
		
		function handleResize() {
			// Debounce resize events
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(() => {
				if (musicData) {
					console.log('Resize detected, recalculating text overflow...');
					document.querySelectorAll('.music-widget .track-title, .music-widget .track-artist').forEach(el => {
						el.classList.remove('scroll');
						(el as HTMLElement).style.removeProperty('--scroll-distance');
					});
					setTimeout(checkTextOverflow, 100);
				}
			}, 200);
		}

		window.addEventListener('resize', handleResize);
		
		
		setTimeout(() => {
			console.log('Initial overflow check on mount...');
			checkTextOverflow();
		}, 200);

		return () => {
			window.removeEventListener('resize', handleResize);
			clearTimeout(resizeTimeout);
		};
	});

	async function fetchMusicData() {
		try {
			error = null;
			
			console.log('Fetching music data from Last.fm...');
			const response = await fetch('/api/widgets/nowplaying');
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();
			const previousPlayingState = musicData?.nowPlaying;
			
			musicData = data;
			hasReceivedApiResponse = true;
			
			if (previousPlayingState !== data.nowPlaying) {
				console.log(`Music status changed: ${previousPlayingState ? 'playing' : 'not playing'} -> ${data.nowPlaying ? 'playing' : 'not playing'}`);
				if (data.nowPlaying) {
					console.log(`Now playing: ${data.artist} - ${data.track}`);
				} else {
					console.log(`Last played: ${data.artist} - ${data.track}`);
				}
			}
			
			if (data.track) {
				console.log(`Current status: ${data.nowPlaying ? 'Now Playing' : 'Recently Played'} - ${data.artist} - ${data.track}`);
			} else {
				console.log('No music data available');
			}
			
		} catch (err) {
			console.error('Error fetching music data:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch music data';
			// Only set default data if no API response yet
			if (!hasReceivedApiResponse) {
				musicData = {
					track: "Inferno",
					artist: "Bladee & Yung Lean",
					album: "Inferno",
					image: "https://i.scdn.co/image/ab67616d0000b273244ae1071898d7ba2bc76d25",
					url: "https://www.last.fm/music/Bladee/_/Inferno",
					nowPlaying: false,
					lastUpdate: new Date().toISOString()
				};
			}
			hasReceivedApiResponse = true;
		}
	}

	function formatTimeAgo(date: Date): string {
		const now = new Date();
		const diffInMs = now.getTime() - date.getTime();
		const diffInSeconds = Math.floor(diffInMs / 1000);
		const diffInMinutes = Math.floor(diffInSeconds / 60);
		const diffInHours = Math.floor(diffInMinutes / 60);
		const diffInDays = Math.floor(diffInHours / 24);
		const diffInWeeks = Math.floor(diffInDays / 7);
		const diffInMonths = Math.floor(diffInDays / 30.44);
		const diffInYears = Math.floor(diffInDays / 365.25);
		
		
		// Handle negative differences
		if (diffInMs < 0) return 'just now';
		
		// Less than 1 minute
		if (diffInSeconds < 60) {
			return diffInSeconds <= 10 ? 'just now' : `${diffInSeconds} seconds ago`;
		}
		
		// Less than 1 hour (1-59 minutes)
		if (diffInMinutes < 60) {
			return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
		}
		
		// Less than 1 day (1-23 hours)
		if (diffInHours < 24) {
			return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
		}
		
		// Less than 1 week (1-6 days)
		if (diffInDays < 7) {
			return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
		}
		
		// Less than 1 month (1-4 weeks)
		if (diffInWeeks < 4) {
			return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
		}
		
		// Less than 1 year (1-11 months)
		if (diffInMonths < 12) {
			return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
		}
		
		// 1 year or more
		if (diffInYears < 10) {
			return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;
		}
		
		// Decades (10+ years)
		const decades = Math.floor(diffInYears / 10);
		return decades === 1 ? '1 decade ago' : `${decades} decades ago`;
	}

	function truncateText(text: string, maxLength: number): string {
		return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
	}
</script>

<div class="music-widget">
	{#if musicData && musicData.track}
		<div class="track-info">
			<div class="track-image">
				{#if musicData.image}
					<img src={musicData.image} alt="{musicData.artist} - {musicData.track}" />
				{:else}
					<div class="no-image">
						<span>♪</span>
					</div>
				{/if}
			</div>
			
			<div class="track-details">
				{#if musicData.url}
					<a href={musicData.url} target="_blank" rel="noopener noreferrer" class="track-title">
						{musicData.track}
					</a>
				{:else}
					<div class="track-title">{musicData.track}</div>
				{/if}
				
				<div class="track-artist">{musicData.artist || 'Unknown Artist'}</div>
				
				<div class="track-status">
					{#if !musicData.nowPlaying && musicData.lastUpdate}
						<span class="last-played">Last Played: {formatTimeAgo(new Date(musicData.lastUpdate))}</span>
					{/if}
				</div>
			</div>
		</div>
	{:else if !hasReceivedApiResponse}
		<div class="default-placeholder">
			<div class="track-image">
				<div class="no-image">
					<Radio size={20} />
				</div>
			</div>
			<div class="track-details">
				<div class="track-title">No music playing</div>
				<div class="track-artist">Last.fm unavailable</div>
				<div class="track-status">Check back later</div>
			</div>
		</div>
	{:else}
		<div class="default-placeholder">
			<div class="track-image">
				<div class="no-image">
					<Radio size={20} />
				</div>
			</div>
			<div class="track-details">
				<div class="track-title">No recent tracks</div>
				<div class="track-artist">No music data available</div>
				<div class="track-status">Check back later</div>
			</div>
		</div>
	{/if}
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
	.music-widget {
		font-family: var(--font-family-primary, 'Inter', system-ui, sans-serif);
		color: var(--text-primary, #ffffff);
		min-height: 60px;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm, 8px);
	}

	.default-placeholder {
		display: flex;
		align-items: center;
		gap: 12px;
		opacity: 0.6;
	}

	.default-placeholder .track-image {
		flex-shrink: 0;
	}

	.default-placeholder .track-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		gap: 4px;
		overflow: hidden;
	}

	.default-placeholder .track-title {
		font-weight: 500;
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		margin: 0;
		padding: 0;
		line-height: 1.4;
		width: 100%;
		max-width: 100%;
	}

	.default-placeholder .track-artist {
		font-size: 14px;
		color: var(--text-muted, #999999);
		margin: 0;
		padding: 0;
		line-height: 1.4;
		width: 100%;
		max-width: 100%;
	}

	.default-placeholder .track-status {
		font-size: 12px;
		margin: 0;
		padding: 0;
		line-height: 1.4;
		width: 100%;
		max-width: 100%;
		color: var(--text-muted, #999999);
		overflow: hidden !important;
		text-overflow: ellipsis !important;
	}

	.track-info {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.track-image {
		position: relative;
		flex-shrink: 0;
	}

	.track-image img {
		width: 52px;
		height: 52px;
		border-radius: 0;
		object-fit: cover;
		border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.15));
	}

	.no-image {
		width: 52px;
		height: 52px;
		background: var(--theme-background, var(--background-secondary, #2a2a2a));
		border-radius: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		color: var(--theme-text-muted, var(--text-muted, #999999));
		border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.15));
	}


	.track-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: flex-start;
		gap: 4px;
		overflow: hidden;
		padding-top: 0;
	}

	.track-title {
		font-weight: 600;
		font-size: 15px;
		color: var(--text-primary, #ffffff);
		margin: 0;
		padding: 0;
		line-height: 1.4;
		text-decoration: none;
		display: block;
		white-space: nowrap;
		width: 100%;
		max-width: 100%;
	}

	.track-title:not(.scroll) {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-title:hover {
		color: var(--accent-color, #4a9eff);
	}

	.track-artist {
		font-size: 15px;
		color: var(--text-primary, #ffffff);
		margin: 0;
		padding: 0;
		line-height: 1.4;
		font-weight: 400;
		white-space: nowrap;
		width: 100%;
		max-width: 100%;
	}

	.track-artist:not(.scroll) {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-status {
		font-size: 12px;
		margin: 0;
		padding: 0;
		line-height: 1.4;
		white-space: nowrap;
		width: 100%;
		max-width: 100%;
		color: var(--text-muted, #71767a);
		/* Always show ellipsis, never scroll */
		overflow: hidden !important;
		text-overflow: ellipsis !important;
	}

	.track-status:not(.scroll) {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Scrolling text for overflow only */
	:global(.track-title.scroll),
	:global(.track-artist.scroll) {
		animation: scroll-text 12s ease-in-out infinite !important;
		/* Ensure the element can scroll properly */
		position: relative;
		display: inline-block;
		max-width: 100%;
		overflow: visible !important;
		white-space: nowrap !important;
		text-overflow: unset !important;
	}

	:global(.track-title.scroll:hover),
	:global(.track-artist.scroll:hover) {
		animation-play-state: paused;
	}

	@keyframes scroll-text {
		0% { transform: translateX(0); }
		20% { transform: translateX(0); }
		50% { transform: translateX(var(--scroll-distance, -100px)); }
		70% { transform: translateX(var(--scroll-distance, -100px)); }
		100% { transform: translateX(0); }
	}


	@media (max-width: 768px) {
		.track-info {
			gap: 10px;
		}
		
		.track-image img, .no-image {
			width: 44px;
			height: 44px;
		}
		
		.track-title {
			font-size: 13px;
		}
		
		.track-artist {
			font-size: 13px;
		}
		
		.track-status {
			font-size: 11px;
		}

		.default-placeholder .track-title {
			font-size: 13px;
		}

		.default-placeholder .track-artist {
			font-size: 13px;
		}

		.default-placeholder .track-status {
			font-size: 11px;
		}
		
		:global(.track-title.scroll),
		:global(.track-artist.scroll) {
			animation-duration: 14s !important;
		}
	}

	@media (max-width: 480px) {
		:global(.track-title.scroll),
		:global(.track-artist.scroll) {
			animation-duration: 16s !important;
		}
		
		.track-info {
			gap: 10px;
		}
		
		.track-image img, .no-image {
			width: 38px;
			height: 38px;
		}
		
		.track-title {
			font-size: 12px;
		}
		
		.track-artist {
			font-size: 12px;
		}
		
		.track-status {
			font-size: 10px;
		}

		.default-placeholder .track-title {
			font-size: 12px;
		}

		.default-placeholder .track-artist {
			font-size: 12px;
		}

		.default-placeholder .track-status {
			font-size: 10px;
		}
	}
</style>
