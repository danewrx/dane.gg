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

	onMount(() => {
		// Always fetch data on mount
		fetchTweetData();
		
		// Set up polling for new tweets every 5 minutes
		const pollInterval = setInterval(fetchTweetData, 5 * 60 * 1000);
		
		return () => {
			clearInterval(pollInterval);
		};
	});

	async function fetchTweetData() {
		try {
			error = null;
			
			console.log('Fetching tweet data...');
			const response = await fetch('/api/widgets/latest-tweet');
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();
			tweetData = data;
			hasReceivedApiResponse = true;
			
			if (data.tweetId) {
				console.log(`Latest tweet: ${data.authorName} (@${data.authorUsername}) - ${data.content?.substring(0, 50)}...`);
			} else {
				console.log('No tweet data available');
			}
			
		} catch (err) {
			console.error('Error fetching tweet data:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch tweet data';
			// Only set default data if we haven't received any API response yet
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
			return 'just now';
		} else if (diffInMinutes < 60) {
			return `${diffInMinutes}m ago`;
		} else if (diffInHours < 24) {
			return `${diffInHours}h ago`;
		} else if (diffInDays < 7) {
			return `${diffInDays}d ago`;
		} else if (diffInWeeks < 4) {
			return `${diffInWeeks}w ago`;
		} else if (diffInMonths < 12) {
			return `${diffInMonths}mo ago`;
		} else {
			return `${diffInYears}y ago`;
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
							<img src={tweetData.authorProfileImage} alt="{tweetData.authorName}" />
						{:else}
							<div class="no-image">
								<Twitter size={16} />
							</div>
						{/if}
					</div>
					<div class="author-details">
						<a 
							href={tweetData.authorProfileUrl || `https://x.com/${tweetData.authorUsername}`} 
							target="_blank" 
							rel="noopener noreferrer"
							class="author-name"
						>
							{tweetData.authorName}
						</a>
						<a 
							href={tweetData.authorProfileUrl || `https://x.com/${tweetData.authorUsername}`} 
							target="_blank" 
							rel="noopener noreferrer"
							class="author-username"
						>
							@{tweetData.authorUsername}
						</a>
					</div>
				</div>
				<div class="tweet-time">
					{#if tweetData.createdAt}
						{formatTimeAgo(new Date(tweetData.createdAt))}
					{/if}
				</div>
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
	{:else if !hasReceivedApiResponse}
		<div class="default-placeholder">
			<div class="profile-image">
				<div class="no-image">
					<Twitter size={20} />
				</div>
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
				<div class="no-image">
					<Twitter size={20} />
				</div>
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
	.tweet-widget {
		font-family: var(--font-family-primary, 'Inter', system-ui, sans-serif);
		color: var(--text-primary, #ffffff);
		width: 100%;
	}

	.tweet-info {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm, 8px);
	}

	.tweet-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--spacing-sm, 8px);
	}

	.author-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm, 8px);
		flex: 1;
		min-width: 0;
	}

	.profile-image {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		overflow: hidden;
		background: var(--background-secondary, #2a2a2a);
		display: flex;
		align-items: center;
		justify-content: center;
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
		align-items: center;
		justify-content: center;
		color: var(--text-muted, #999999);
		background: var(--background-secondary, #2a2a2a);
	}

	.author-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.author-name {
		font-weight: 600;
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 0.2s ease;
	}

	.author-name:hover {
		color: var(--accent-color, #4a9eff);
	}

	.author-username {
		font-size: 12px;
		color: var(--text-muted, #999999);
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 0.2s ease;
	}

	.author-username:hover {
		color: var(--accent-color, #4a9eff);
	}

	.tweet-time {
		font-size: 12px;
		color: var(--text-muted, #999999);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.tweet-content {
		margin-top: 4px;
	}

	.tweet-text {
		font-size: 14px;
		line-height: 1.4;
		color: var(--text-primary, #ffffff);
		text-decoration: none;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.tweet-text:hover {
		color: var(--accent-color, #4a9eff);
	}

	.default-placeholder {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm, 8px);
		opacity: 0.6;
	}

	.default-placeholder .profile-image {
		width: 40px;
		height: 40px;
	}

	.tweet-details {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.tweet-title {
		font-weight: 600;
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		margin: 0;
		padding: 0;
		line-height: 1;
	}

	.tweet-subtitle {
		font-size: 12px;
		color: var(--text-primary, #ffffff);
		margin: 0;
		padding: 0;
		line-height: 1;
	}

	.tweet-status {
		font-size: 10px;
		margin: 0;
		padding: 0;
		line-height: 1;
		color: var(--text-muted, #999999);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.tweet-header {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--spacing-xs, 4px);
		}

		.author-info {
			width: 100%;
		}

		.tweet-time {
			align-self: flex-end;
		}

		.profile-image {
			width: 36px;
			height: 36px;
		}

		.default-placeholder .profile-image {
			width: 36px;
			height: 36px;
		}

		.author-name {
			font-size: 13px;
		}

		.author-username {
			font-size: 11px;
		}

		.tweet-text {
			font-size: 13px;
		}

		.tweet-title {
			font-size: 13px;
		}

		.tweet-subtitle {
			font-size: 11px;
		}

		.tweet-status {
			font-size: 9px;
		}
	}

	@media (max-width: 480px) {
		.profile-image {
			width: 32px;
			height: 32px;
		}

		.default-placeholder .profile-image {
			width: 32px;
			height: 32px;
		}

		.author-name {
			font-size: 12px;
		}

		.author-username {
			font-size: 10px;
		}

		.tweet-text {
			font-size: 12px;
		}

		.tweet-title {
			font-size: 12px;
		}

		.tweet-subtitle {
			font-size: 10px;
		}

		.tweet-status {
			font-size: 8px;
		}
	}
</style>
