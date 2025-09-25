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
	let isLoading = $state(!musicData); // Don't show loading if we already have data
	let error: string | null = $state(null);

	onMount(() => {
		// Only fetch immediately if we don't have pre-loaded data
		if (!musicData) {
			fetchMusicData();
		}
		
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
		if (typeof window === 'undefined') return;
		
		// Use more specific selectors to handle both <a> and <div> elements
		const titleElement = document.querySelector('.music-widget .track-title') as HTMLElement | null;
		const artistElement = document.querySelector('.music-widget .track-artist') as HTMLElement | null;
		const statusElement = document.querySelector('.music-widget .track-status') as HTMLElement | null;
		
		console.log('Checking text overflow - elements found:', {
			title: !!titleElement,
			artist: !!artistElement, 
			status: !!statusElement
		});
		
		[titleElement, artistElement, statusElement].forEach((element, index) => {
			if (element) {
				const elementType = ['title', 'artist', 'status'][index];
				
				// Force a reflow to ensure accurate measurements
				element.style.display = 'none';
				element.offsetHeight; // Force reflow
				element.style.display = '';
				
				// Wait a bit for the element to be properly rendered
				setTimeout(() => {
					const scrollWidth = element.scrollWidth;
					const clientWidth = element.clientWidth;
					const parentWidth = element.parentElement?.clientWidth || 0;
					const containerWidth = document.querySelector('.music-widget .track-details')?.clientWidth || 0;
					
					// More aggressive overflow detection - if text is longer than a reasonable threshold
					const textLength = element.textContent?.length || 0;
					const shouldScroll = scrollWidth > clientWidth || textLength > 20; // Force scroll for long text
					
					console.log(`${elementType}:`, {
						text: element.textContent?.slice(0, 40),
						textLength,
						scrollWidth,
						clientWidth,
						parentWidth,
						containerWidth,
						shouldScroll,
						tagName: element.tagName
					});
					
					if (shouldScroll) {
						element.classList.add('scroll');
						// Calculate exact scroll distance to show all text without going too far
						const actualOverflow = scrollWidth - clientWidth;
						// Only scroll as much as needed to reveal the hidden text, plus small buffer
						const scrollDistance = Math.max(actualOverflow, 0) + 10;
						element.style.setProperty('--scroll-distance', `-${scrollDistance}px`);
						console.log(`${elementType} scroll distance:`, `-${scrollDistance}px`, `(overflow: ${actualOverflow}px)`);
					} else {
						element.classList.remove('scroll');
						element.style.removeProperty('--scroll-distance');
					}
				}, 50);
			}
		});
	}

	// Check overflow when music data changes
	$effect(() => {
		if (musicData) {
			// Multiple attempts to ensure elements are rendered
			setTimeout(checkTextOverflow, 100);
			setTimeout(checkTextOverflow, 300);
			setTimeout(checkTextOverflow, 500);
		}
	});

	// Add window resize listener and container observer for responsive overflow detection
	onMount(() => {
		let resizeTimeout: NodeJS.Timeout;
		let resizeObserver: ResizeObserver | null = null;
		
		function handleResize() {
			// Debounce resize events to avoid excessive recalculations
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(() => {
				if (musicData) {
					console.log('Resize detected, recalculating text overflow...');
					checkTextOverflow();
				}
			}, 150);
		}

		// Window resize listener for general responsiveness
		window.addEventListener('resize', handleResize);
		
		// ResizeObserver for container size changes (more precise)
		const musicWidget = document.querySelector('.music-widget');
		if (musicWidget && typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver((entries) => {
				for (let entry of entries) {
					console.log('Container size changed:', entry.contentRect.width, 'x', entry.contentRect.height);
					handleResize();
					// Also trigger text overflow check when container resizes
					setTimeout(checkTextOverflow, 200);
				}
			});
			resizeObserver.observe(musicWidget);
		}
		
		// Also check on initial mount after a short delay
		setTimeout(() => {
			console.log('Initial overflow check on mount...');
			checkTextOverflow();
		}, 200);

		return () => {
			window.removeEventListener('resize', handleResize);
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
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
			
			// Log status changes
			if (previousPlayingState !== data.nowPlaying) {
				console.log(`Music status changed: ${previousPlayingState ? 'playing' : 'not playing'} -> ${data.nowPlaying ? 'playing' : 'not playing'}`);
				if (data.nowPlaying) {
					console.log(`Now playing: ${data.artist} - ${data.track}`);
				} else {
					console.log(`Last played: ${data.artist} - ${data.track}`);
				}
			}
			
			// Log current status
			if (data.track) {
				console.log(`Current status: ${data.nowPlaying ? 'Now Playing' : 'Recently Played'} - ${data.artist} - ${data.track}`);
			} else {
				console.log('No music data available');
			}
			
		} catch (err) {
			console.error('Error fetching music data:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch music data';
		} finally {
			isLoading = false;
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
		const diffInMonths = Math.floor(diffInDays / 30.44); // Average days per month
		const diffInYears = Math.floor(diffInDays / 365.25); // Account for leap years
		
		
		// Handle negative differences (future dates) gracefully
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
	{#if isLoading}
		<div class="loading-state">
			<div class="loading-spinner"></div>
			<span>Loading music...</span>
		</div>
	{:else if error}
		<div class="error-state">
			<span class="error-icon">♪</span>
			<span>Music unavailable</span>
		</div>
	{:else if musicData && musicData.track}
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
	{:else}
		<div class="no-data">
			<span class="no-data-icon">♪</span>
			<span>No recent tracks</span>
		</div>
	{/if}
</div>

<style>
	.music-widget {
		font-family: var(--font-family-primary, 'Inter', system-ui, sans-serif);
		color: var(--text-primary, #ffffff);
		min-height: 60px;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm, 8px);
	}

	.loading-state, .error-state, .no-data {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm, 8px);
		color: var(--text-secondary, #cccccc);
		font-size: var(--font-size-sm, 14px);
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border-color, #555555);
		border-top: 2px solid var(--accent-color, #4a9eff);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error-icon, .no-data-icon {
		font-size: 18px;
		opacity: 0.6;
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
		width: 56px;
		height: 56px;
		border-radius: 0;
		object-fit: cover;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.no-image {
		width: 56px;
		height: 56px;
		background: var(--bg-secondary, #2d2d2d);
		border-radius: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		color: var(--text-muted, #999999);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.playing-indicator {
		position: absolute;
		top: -4px;
		right: -4px;
		width: 16px;
		height: 16px;
		background: var(--accent-color, #4a9eff);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.pulse {
		width: 8px;
		height: 8px;
		background: white;
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.5; transform: scale(0.8); }
	}

	.track-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		gap: 1px;
		overflow: hidden; /* Contain scrolling text */
		height: 56px; /* Match the album art height for proper centering */
	}

	.track-title {
		font-weight: 600;
		font-size: 16px;
		color: var(--text-primary, #ffffff);
		margin: 0;
		padding: 0;
		line-height: 1;
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
		text-decoration: underline;
	}

	.track-artist {
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		margin: 0;
		padding: 0;
		line-height: 1;
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
		line-height: 1;
		white-space: nowrap;
		width: 100%;
		max-width: 100%;
	}

	.track-status:not(.scroll) {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Scrolling text for overflow only */
	:global(.track-title.scroll),
	:global(.track-artist.scroll),
	:global(.track-status.scroll) {
		animation: scroll-text 8s ease-in-out infinite !important;
		/* Ensure the element can scroll properly */
		position: relative;
		display: inline-block;
		max-width: 100%;
	}

	:global(.track-title.scroll:hover),
	:global(.track-artist.scroll:hover),
	:global(.track-status.scroll:hover) {
		animation-play-state: paused;
	}

	@keyframes scroll-text {
		0% { transform: translateX(0); }
		20% { transform: translateX(0); }
		50% { transform: translateX(var(--scroll-distance, -100px)); }
		70% { transform: translateX(var(--scroll-distance, -100px)); }
		100% { transform: translateX(0); }
	}

	.now-playing {
		color: var(--accent-color, #4a9eff);
		font-weight: 500;
	}

	.last-played {
		color: var(--text-muted, #999999);
		font-weight: 400;
	}

	.track-link {
		font-size: var(--font-size-xs, 12px);
		color: var(--accent-color, #4a9eff);
		text-decoration: none;
		opacity: 0.8;
		transition: opacity 0.2s ease;
	}

	.track-link:hover {
		opacity: 1;
		text-decoration: underline;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.track-info {
			gap: var(--spacing-sm, 8px);
			/* Ensure info section uses full width on mobile */
			flex: 1;
			min-width: 0;
		}
		
		.track-image img, .no-image {
			width: 36px;
			height: 36px;
		}
		
		.track-title {
			font-size: var(--font-size-sm, 14px);
		}
		
		.track-artist {
			font-size: var(--font-size-xs, 12px);
		}
		
		/* Slower scroll animation on mobile for better readability */
		:global(.track-title.scroll),
		:global(.track-artist.scroll),
		:global(.track-status.scroll) {
			animation-duration: 10s !important;
		}
	}

	@media (max-width: 480px) {
		/* Even slower on very small screens */
		:global(.track-title.scroll),
		:global(.track-artist.scroll),
		:global(.track-status.scroll) {
			animation-duration: 12s !important;
		}
		
		.track-details {
			/* Ensure full width utilization on very small screens */
			flex: 1;
			min-width: 0;
			height: 36px; /* Match mobile album art height */
		}
	}
</style>
