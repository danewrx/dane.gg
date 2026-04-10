<script lang="ts">
	import { onMount } from 'svelte';
	import { Twitter } from 'lucide-svelte';

	interface TweetData {
		tweetId: string | null;
		content: string | null;
		authorName: string | null;
		authorUsername: string | null;
		authorProfileImage: string | null;
		authorProfileUrl: string | null;
		tweetUrl: string | null;
		createdAt: string | null;
		lastUpdate: string;
	}

	let { tweetData = $bindable() }: { tweetData?: TweetData | null } = $props();
	let error: string | null = $state(null);
	let hasReceivedApiResponse = $state(!!tweetData);
	let lastTweetId: string | null = $state(tweetData?.tweetId || null);
	let isPageVisible = $state(true);

	onMount(() => {
		// Set initial lastTweetId from props
		if (tweetData?.tweetId) {
			lastTweetId = tweetData.tweetId;
		}

		fetchTweetData();

		const pollInterval = setInterval(() => {
			if (isPageVisible) {
				fetchTweetData();
			}
		}, 30000);

		function handleVisibilityChange() {
			isPageVisible = !document.hidden;

			if (isPageVisible) {
				fetchTweetData();
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			clearInterval(pollInterval);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});

	async function fetchTweetData() {
		try {
			error = null;

			const response = await fetch('/api/widgets/latest-tweet');

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			hasReceivedApiResponse = true;

			if (data.tweetId) {
				// Check if new tweet
				if (lastTweetId !== data.tweetId) {
					lastTweetId = data.tweetId;
					tweetData = data;
					console.log(
						`[TweetWidget] New tweet detected: @${data.authorUsername} - ${data.content?.substring(0, 50)}...`
					);
				} else if (tweetData && tweetData.tweetId === data.tweetId) {
					if (tweetData.lastUpdate !== data.lastUpdate) {
						tweetData = data;
					}
				} else {
					// First time loading or tweetData is null
					tweetData = data;
					lastTweetId = data.tweetId;
				}
			} else {
				// No tweet available
				if (tweetData?.tweetId) {
					tweetData = {
						tweetId: null,
						content: null,
						authorName: null,
						authorUsername: null,
						authorProfileImage: null,
						authorProfileUrl: null,
						tweetUrl: null,
						createdAt: null,
						lastUpdate: new Date().toISOString()
					};
					lastTweetId = null;
				} else if (!hasReceivedApiResponse) {
					tweetData = {
						tweetId: null,
						content: null,
						authorName: null,
						authorUsername: null,
						authorProfileImage: null,
						authorProfileUrl: null,
						tweetUrl: null,
						createdAt: null,
						lastUpdate: new Date().toISOString()
					};
				}
			}
		} catch (err) {
			console.error('Error fetching tweet data:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch tweet data';
			// Only set default data if no API response received
			if (!hasReceivedApiResponse) {
				tweetData = {
					tweetId: null,
					content: null,
					authorName: null,
					authorUsername: null,
					authorProfileImage: null,
					authorProfileUrl: null,
					tweetUrl: null,
					createdAt: null,
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
		const diffInMonths = Math.floor(diffInDays / 30);
		const diffInYears = Math.floor(diffInDays / 365);

		if (diffInSeconds < 60) {
			return 'now';
		} else if (diffInMinutes < 60) {
			return `${diffInMinutes}m`;
		} else if (diffInHours < 24) {
			return `${diffInHours}h`;
		} else if (diffInDays < 7) {
			return `${diffInDays}d`;
		} else if (diffInWeeks < 4) {
			return `${diffInWeeks}w`;
		} else if (diffInMonths < 12) {
			return `${diffInMonths}mo`;
		} else {
			return `${diffInYears}y`;
		}
	}

	function truncateText(text: string, maxLength: number): string {
		return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
	}
</script>

<div class="tweet-widget">
	{#if tweetData && tweetData.tweetId}
		<div class="tweet-info">
			<div class="tweet-header">
				<div class="author-info">
					<div class="profile-image">
						{#if tweetData.authorProfileImage}
							<img src={tweetData.authorProfileImage} alt={tweetData.authorName} />
						{:else}
							<div class="no-image">
								{tweetData.authorName?.toLowerCase() || 'dane'}
							</div>
						{/if}
					</div>
					<div class="author-details">
						<div class="author-header">
							<a
								href={tweetData.authorProfileUrl || `https://x.com/${tweetData.authorUsername}`}
								target="_blank"
								rel="noopener noreferrer"
								class="author-name"
							>
								{tweetData.authorName}
							</a>
							<span class="author-username">
								@<span class="username-text">{tweetData.authorUsername}</span>
							</span>
							<span class="time-separator">•</span>
							<span class="tweet-time">
								{#if tweetData.createdAt}
									{formatTimeAgo(new Date(tweetData.createdAt))}
								{/if}
							</span>
						</div>
						<div class="tweet-content">
							{#if tweetData.tweetUrl}
								<a
									href={tweetData.tweetUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="tweet-text"
								>
									{tweetData.content}
								</a>
							{:else}
								<div class="tweet-text">
									{tweetData.content}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else if !hasReceivedApiResponse}
		<div class="default-placeholder">
			<div class="profile-image">
				<div class="no-image">dane</div>
			</div>
			<div class="tweet-details">
				<div class="tweet-title">No recent tweets</div>
				<div class="tweet-subtitle">Twitter unavailable</div>
				<div class="tweet-status">Check back later</div>
			</div>
		</div>
	{:else}
		<div class="default-placeholder">
			<div class="profile-image">
				<div class="no-image">dane</div>
			</div>
			<div class="tweet-details">
				<div class="tweet-title">No recent tweets</div>
				<div class="tweet-subtitle">No tweet data available</div>
				<div class="tweet-status">Check back later</div>
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
	.tweet-widget {
		font-family: var(--font-family-primary, 'Inter', system-ui, sans-serif);
		color: var(--text-primary, #ffffff);
		width: 100%;
		overflow: hidden;
	}

	.tweet-info {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		width: 100%;
		min-width: 0;
	}

	.tweet-header {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		width: 100%;
		min-width: 0;
	}

	.author-info {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
		width: 100%;
		overflow: hidden;
	}

	.profile-image {
		flex-shrink: 0;
		width: 52px;
		height: 52px;
		border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.15));
		background: var(--theme-background, var(--background-secondary, #2a2a2a));
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0;
	}

	.profile-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.no-image {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: flex-start;
		justify-content: flex-start;
		padding: 6px 8px;
		color: var(--text-primary, #ffffff);
		font-size: calc(11 * 1em / 14);
		font-weight: 500;
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		text-transform: lowercase;
	}

	.author-details {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		gap: 4px;
		min-width: 0;
		flex: 1;
		padding-top: 0;
		width: 100%;
		overflow: hidden;
	}

	.author-header {
		display: flex;
		align-items: baseline;
		gap: 4px;
		flex-wrap: nowrap;
		line-height: 1.4;
		min-width: 0;
		width: 100%;
		overflow: hidden;
	}

	.author-name {
		font-weight: 600;
		font-size: calc(15 * 1em / 14);
		color: var(--text-primary, #ffffff);
		text-decoration: none;
		white-space: nowrap;
		transition: color 0.2s ease;
		flex-shrink: 0;
	}

	.author-name:hover {
		color: var(--accent-color, #4a9eff);
	}

	.author-username {
		font-size: calc(12 * 1em / 14);
		color: var(--text-muted, #71767a);
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 0.2s ease;
		flex-shrink: 1;
		min-width: 0;
	}

	.username-text {
		margin-left: 0;
	}

	.author-username:hover {
		color: var(--accent-color, #4a9eff);
	}

	.time-separator {
		font-size: calc(12 * 1em / 14);
		color: var(--text-muted, #71767a);
		flex-shrink: 0;
		margin: 0 2px;
	}

	.tweet-time {
		font-size: calc(12 * 1em / 14);
		color: var(--text-primary, #ffffff);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.tweet-content {
		flex: 1;
		display: flex;
		align-items: flex-start;
		overflow: hidden;
		margin-top: 2px;
		width: 100%;
		min-width: 0;
	}

	.tweet-text {
		font-size: calc(15 * 1em / 14);
		line-height: 1.4;
		color: var(--text-primary, #ffffff);
		text-decoration: none;
		word-wrap: break-word;
		overflow-wrap: break-word;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 100%;
		min-height: 0;
		flex: 1;
	}

	.tweet-text:hover {
		color: var(--accent-color, #4a9eff);
	}

	.default-placeholder {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		opacity: 0.6;
	}

	.default-placeholder .profile-image {
		width: 52px;
		height: 52px;
	}

	.tweet-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.tweet-title {
		font-weight: 500;
		font-size: calc(14 * 1em / 14);
		color: var(--text-primary, #ffffff);
		margin: 0;
		padding: 0;
		line-height: 1.4;
	}

	.tweet-subtitle {
		font-size: calc(14 * 1em / 14);
		color: var(--text-muted, #999999);
		margin: 0;
		padding: 0;
		line-height: 1.4;
	}

	.tweet-status {
		font-size: calc(12 * 1em / 14);
		margin: 0;
		padding: 0;
		line-height: 1.4;
		color: var(--text-muted, #999999);
	}

	/* Responsive design */
	@media (max-width: 1024px) {
		.profile-image {
			width: 48px;
			height: 48px;
		}

		.default-placeholder .profile-image {
			width: 48px;
			height: 48px;
		}

		.no-image {
			font-size: calc(17 * 1em / 14);
		}

		.author-name {
			font-size: calc(13 * 1em / 14);
		}

		.author-username {
			font-size: calc(11 * 1em / 14);
		}

		.time-separator {
			font-size: calc(11 * 1em / 14);
		}

		.tweet-time {
			font-size: calc(11 * 1em / 14);
		}

		.tweet-text {
			font-size: calc(13 * 1em / 14);
			-webkit-line-clamp: 2;
			line-clamp: 2;
		}

		.tweet-title {
			font-size: calc(13 * 1em / 14);
		}

		.tweet-subtitle {
			font-size: calc(13 * 1em / 14);
		}

		.tweet-status {
			font-size: calc(11 * 1em / 14);
		}
	}

	@media (max-width: 900px) {
		.profile-image {
			width: 46px;
			height: 46px;
		}

		.default-placeholder .profile-image {
			width: 46px;
			height: 46px;
		}

		.no-image {
			font-size: calc(16 * 1em / 14);
		}

		.author-name {
			font-size: calc(12 * 1em / 14);
		}

		.author-username {
			font-size: calc(10 * 1em / 14);
		}

		.time-separator {
			font-size: calc(10 * 1em / 14);
		}

		.tweet-time {
			font-size: calc(10 * 1em / 14);
		}

		.tweet-text {
			font-size: calc(12 * 1em / 14);
			-webkit-line-clamp: 2;
			line-clamp: 2;
		}

		.tweet-title {
			font-size: calc(12 * 1em / 14);
		}

		.tweet-subtitle {
			font-size: calc(12 * 1em / 14);
		}

		.tweet-status {
			font-size: calc(10 * 1em / 14);
		}
	}

	@media (max-width: 768px) {
		.profile-image {
			width: 44px;
			height: 44px;
		}

		.default-placeholder .profile-image {
			width: 44px;
			height: 44px;
		}

		.no-image {
			font-size: calc(16 * 1em / 14);
		}

		.author-name {
			font-size: calc(13 * 1em / 14);
		}

		.author-username {
			font-size: calc(11 * 1em / 14);
		}

		.time-separator {
			font-size: calc(11 * 1em / 14);
		}

		.tweet-time {
			font-size: calc(11 * 1em / 14);
		}

		.tweet-text {
			font-size: calc(13 * 1em / 14);
			-webkit-line-clamp: 2;
			line-clamp: 2;
		}

		.tweet-title {
			font-size: calc(13 * 1em / 14);
		}

		.tweet-subtitle {
			font-size: calc(13 * 1em / 14);
		}

		.tweet-status {
			font-size: calc(11 * 1em / 14);
		}
	}

	@media (max-width: 600px) {
		.profile-image {
			width: 40px;
			height: 40px;
		}

		.default-placeholder .profile-image {
			width: 40px;
			height: 40px;
		}

		.no-image {
			font-size: calc(15 * 1em / 14);
		}

		.author-name {
			font-size: calc(11 * 1em / 14);
		}

		.author-username {
			font-size: calc(9 * 1em / 14);
		}

		.time-separator {
			font-size: calc(9 * 1em / 14);
		}

		.tweet-time {
			font-size: calc(9 * 1em / 14);
		}

		.tweet-text {
			font-size: calc(11 * 1em / 14);
			-webkit-line-clamp: 2;
			line-clamp: 2;
		}

		.tweet-title {
			font-size: calc(11 * 1em / 14);
		}

		.tweet-subtitle {
			font-size: calc(11 * 1em / 14);
		}

		.tweet-status {
			font-size: calc(9 * 1em / 14);
		}
	}

	@media (max-width: 480px) {
		.profile-image {
			width: 38px;
			height: 38px;
		}

		.default-placeholder .profile-image {
			width: 38px;
			height: 38px;
		}

		.no-image {
			font-size: calc(14 * 1em / 14);
		}

		.author-name {
			font-size: calc(12 * 1em / 14);
		}

		.author-username {
			font-size: calc(10 * 1em / 14);
		}

		.time-separator {
			font-size: calc(10 * 1em / 14);
		}

		.tweet-time {
			font-size: calc(10 * 1em / 14);
		}

		.tweet-text {
			font-size: calc(12 * 1em / 14);
			-webkit-line-clamp: 2;
			line-clamp: 2;
		}

		.tweet-title {
			font-size: calc(12 * 1em / 14);
		}

		.tweet-subtitle {
			font-size: calc(12 * 1em / 14);
		}

		.tweet-status {
			font-size: calc(10 * 1em / 14);
		}
	}
</style>
