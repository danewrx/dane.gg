<script lang="ts">
	import { onMount } from 'svelte';
	import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Twitter, ExternalLink, Calendar, User } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface ConnectionStatus {
		connected: boolean;
		message: string;
		failureType?: string;
		details?: string;
	}

	interface TwitterStatus {
		configured: boolean;
		username: string | null;
		hasCookies: boolean;
		connection: ConnectionStatus | null;
		timestamp: string;
	}

	interface Tweet {
		id: string;
		tweetId: string;
		content: string;
		authorName: string;
		authorUsername: string;
		authorProfileImage: string | null;
		authorProfileUrl: string | null;
		tweetUrl: string | null;
		createdAt: string;
		updatedAt: string;
	}

	let status = $state<TwitterStatus | null>(null);
	let latestTweet = $state<Tweet | null>(null);
	let allTweets = $state<Tweet[]>([]);
	let loading = $state(true);
	let testingConnection = $state(false);
	let loadingTweets = $state(false);
	let error = $state('');

	async function loadStatus() {
		try {
			loading = true;
			error = '';

			const response = await fetch('/api/twitter/status', {
				credentials: 'include'
			});

			if (!response.ok) {
				if (response.status === 401) {
					error = 'Authentication required. Please log in to view Twitter status.';
					return;
				}
				
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || errorData.message || 'Failed to load Twitter status');
			}

			const result = await response.json();
			status = result;

			if (result.configured) {
				await loadLatestTweet();
			}
		} catch (err) {
			console.error('Error loading status:', err);
			error = err instanceof Error ? err.message : 'Failed to load status';
		} finally {
			loading = false;
		}
	}

	async function loadLatestTweet() {
		try {
			const response = await fetch('/api/widgets/latest-tweet', {
				credentials: 'include'
			});

			if (response.ok) {
				const result = await response.json();
				if (result.tweetId) {
					latestTweet = {
						id: result.tweetId,
						tweetId: result.tweetId,
						content: result.content,
						authorName: result.authorName,
						authorUsername: result.authorUsername,
						authorProfileImage: result.authorProfileImage,
						authorProfileUrl: result.authorProfileUrl,
						tweetUrl: result.tweetUrl,
						createdAt: result.createdAt,
						updatedAt: result.lastUpdate
					};
				}
			}
		} catch (err) {
			console.error('Error loading latest tweet:', err);
		}
	}

	async function loadAllTweets() {
		try {
			loadingTweets = true;
			error = '';

			// Add a small delay
			await new Promise(resolve => setTimeout(resolve, 500));

			const response = await fetch('/api/twitter/tweets', {
				credentials: 'include'
			});

			if (!response.ok) {
				if (response.status === 401) {
					error = 'Authentication required. Please log in to view tweets.';
					return;
				}
				
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || errorData.message || 'Failed to load tweets');
			}

			const result = await response.json();
			if (result.success) {
				allTweets = result.data || [];
			}
		} catch (err) {
			console.error('Error loading tweets:', err);
			error = err instanceof Error ? err.message : 'Failed to load tweets';
		} finally {
			loadingTweets = false;
		}
	}

	async function testConnection() {
		if (!status?.configured) {
			toast.error('Twitter is not configured');
			return;
		}

		try {
			testingConnection = true;
			error = '';

			const response = await fetch('/api/twitter/status', {
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to test connection');
			}

			const result = await response.json();
			status = result;

			if (result.connection) {
				if (result.connection.connected) {
					toast.success('Connection successful!');
				} else {
					toast.error(`Connection failed: ${result.connection.message}`);
				}
			}
		} catch (err) {
			console.error('Error testing connection:', err);
			error = err instanceof Error ? err.message : 'Failed to test connection';
			toast.error(error);
		} finally {
			testingConnection = false;
		}
	}

	function formatDate(dateString: string): string {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		return date.toLocaleString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getConnectionStatusColor(connection: ConnectionStatus | null): string {
		if (!connection) return '#6b7280';
		return connection.connected ? '#10b981' : '#ef4444';
	}

	onMount(() => {
		loadStatus();
		setTimeout(() => {
			if (status?.configured) {
				loadAllTweets();
			}
		}, 1000);
	});
</script>

<div class="twitter-config">
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading Twitter configuration...</p>
		</div>
	{:else if error && !status}
		<div class="error-state">
			<AlertCircle size={24} />
			<p>{error}</p>
		</div>
	{:else}
		<div class="config-content">
			<!-- Connection Details Section -->
			<div class="config-section">
				<h2 class="section-title">Connection Details</h2>
				
				{#if !status?.configured}
					<div class="config-warning">
						<AlertCircle size={20} />
						<p>Twitter API is not configured. Please set TWITTER_COOKIES and TWITTER_USERNAME environment variables.</p>
					</div>
				{:else}
					<div class="connection-info">
						<div class="info-row">
							<span class="info-label">Username:</span>
							<span class="info-value">{status.username || 'Not set'}</span>
						</div>
						<div class="info-row">
							<span class="info-label">Cookies:</span>
							<span class="info-value">{status.hasCookies ? 'Configured' : 'Not configured'}</span>
						</div>
						{#if status.connection}
							<div class="info-row">
								<span class="info-label">Status:</span>
								<span class="info-value" style="color: {getConnectionStatusColor(status.connection)}">
									{status.connection.connected ? 'Connected' : 'Disconnected'}
								</span>
							</div>
							{#if !status.connection.connected && status.connection.details}
								<div class="connection-error">
									<AlertCircle size={16} />
									<div class="error-details">
										<p class="error-message">{status.connection.message}</p>
										{#if status.connection.failureType}
											<p class="error-type">Type: {status.connection.failureType}</p>
										{/if}
										{#if status.connection.details}
											<p class="error-detail">{status.connection.details}</p>
										{/if}
									</div>
								</div>
							{/if}
						{/if}
					</div>

					<!-- Test Button -->
					<div class="test-section">
						<button 
							class="test-button"
							onclick={testConnection}
							disabled={testingConnection}
						>
							{#if testingConnection}
								<RefreshCw size={16} class="spinning" />
							{:else}
								<RefreshCw size={16} />
							{/if}
							<span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
						</button>
					</div>
				{/if}
			</div>

			<!-- Latest Tweet Section -->
			{#if latestTweet}
				<div class="config-section">
					<h2 class="section-title">Latest Tweet</h2>
					<div class="tweet-card">
						<div class="tweet-header">
							{#if latestTweet.authorProfileImage}
								<img 
									src={latestTweet.authorProfileImage} 
									alt={latestTweet.authorName}
									class="profile-image"
								/>
							{:else}
								<div class="profile-image-placeholder">
									<User size={20} />
								</div>
							{/if}
							<div class="tweet-author">
								<span class="author-name">{latestTweet.authorName}</span>
								<span class="author-username">@{latestTweet.authorUsername}</span>
							</div>
							{#if latestTweet.tweetUrl}
								<a 
									href={latestTweet.tweetUrl} 
									target="_blank" 
									rel="noopener noreferrer"
									class="tweet-link"
								>
									<ExternalLink size={16} />
								</a>
							{/if}
						</div>
						<div class="tweet-content">
							<p>{latestTweet.content}</p>
						</div>
						<div class="tweet-footer">
							<div class="tweet-date">
								<Calendar size={14} />
								<span>{formatDate(latestTweet.createdAt)}</span>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Previous Tweets Table -->
			<div class="config-section">
				<h2 class="section-title">Previous Tweets</h2>
				{#if loadingTweets}
					<div class="loading-tweets">
						<div class="spinner"></div>
						<p>Loading tweets...</p>
					</div>
				{:else if allTweets.length === 0}
					<div class="no-tweets">
						<p>No tweets found in database</p>
					</div>
				{:else}
					<div class="tweets-table-container">
						<table class="tweets-table">
							<thead>
								<tr>
									<th>Date</th>
									<th>Content</th>
									<th>Author</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each allTweets as tweet (tweet.id)}
									<tr>
										<td class="date-cell">
											{formatDate(tweet.createdAt)}
										</td>
										<td class="content-cell">
											<div class="tweet-preview">
												{tweet.content.length > 100 
													? tweet.content.substring(0, 100) + '...' 
													: tweet.content}
											</div>
										</td>
										<td class="author-cell">
											<div class="author-info">
												{#if tweet.authorProfileImage}
													<img 
														src={tweet.authorProfileImage} 
														alt={tweet.authorName}
														class="author-avatar"
													/>
												{/if}
												<span>{tweet.authorName}</span>
											</div>
										</td>
										<td class="actions-cell">
											{#if tweet.tweetUrl}
												<a 
													href={tweet.tweetUrl} 
													target="_blank" 
													rel="noopener noreferrer"
													class="action-link"
												>
													<ExternalLink size={14} />
												</a>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.twitter-config {
		padding: 24px;
	}

	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px;
		gap: 16px;
		color: #a1a1aa;
	}

	.error-state {
		color: #ef4444;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(99, 102, 241, 0.2);
		border-top-color: #6366f1;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.config-content {
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.config-section {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 24px;
	}

	:global(html:not(.dark)) .config-section {
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.section-title {
		font-size: 20px;
		font-weight: 600;
		margin: 0 0 20px 0;
		color: #ffffff;
	}

	:global(html:not(.dark)) .section-title {
		color: #1f2937;
	}

	.config-warning {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		color: #fca5a5;
	}

	.connection-info {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 20px;
	}

	.info-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.info-label {
		font-weight: 500;
		color: #a1a1aa;
		min-width: 120px;
	}

	:global(html:not(.dark)) .info-label {
		color: #6b7280;
	}

	.info-value {
		color: #ffffff;
	}

	:global(html:not(.dark)) .info-value {
		color: #1f2937;
	}

	.connection-error {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		margin-top: 12px;
		color: #fca5a5;
	}

	.error-details {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.error-message {
		font-weight: 500;
		margin: 0;
	}

	.error-type {
		font-size: 14px;
		opacity: 0.8;
		margin: 0;
	}

	.error-detail {
		font-size: 13px;
		opacity: 0.7;
		margin: 0;
	}

	.test-section {
		margin-top: 20px;
	}

	.test-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: #6366f1;
		color: #ffffff;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.test-button:hover:not(:disabled) {
		background: #4f46e5;
		transform: translateY(-1px);
	}

	.test-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.tweet-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 20px;
	}

	:global(html:not(.dark)) .tweet-card {
		background: rgba(0, 0, 0, 0.03);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.tweet-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.profile-image,
	.profile-image-placeholder {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		object-fit: cover;
	}

	.profile-image-placeholder {
		background: rgba(99, 102, 241, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #6366f1;
	}

	.tweet-author {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.author-name {
		font-weight: 600;
		color: #ffffff;
		font-size: 16px;
	}

	:global(html:not(.dark)) .author-name {
		color: #1f2937;
	}

	.author-username {
		color: #a1a1aa;
		font-size: 14px;
	}

	:global(html:not(.dark)) .author-username {
		color: #6b7280;
	}

	.tweet-link {
		color: #6366f1;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.tweet-link:hover {
		color: #4f46e5;
	}

	.tweet-content {
		margin-bottom: 16px;
		color: #ffffff;
		line-height: 1.6;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	:global(html:not(.dark)) .tweet-content {
		color: #1f2937;
	}

	.tweet-footer {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #a1a1aa;
		font-size: 14px;
	}

	:global(html:not(.dark)) .tweet-footer {
		color: #6b7280;
	}

	.tweet-date {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.loading-tweets,
	.no-tweets {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px;
		gap: 16px;
		color: #a1a1aa;
	}

	.tweets-table-container {
		overflow-x: auto;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(html:not(.dark)) .tweets-table-container {
		border-color: rgba(0, 0, 0, 0.1);
	}

	.tweets-table {
		width: 100%;
		border-collapse: collapse;
	}

	.tweets-table thead {
		background: rgba(255, 255, 255, 0.05);
	}

	:global(html:not(.dark)) .tweets-table thead {
		background: rgba(0, 0, 0, 0.05);
	}

	.tweets-table th {
		padding: 12px 16px;
		text-align: left;
		font-weight: 600;
		font-size: 14px;
		color: #ffffff;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(html:not(.dark)) .tweets-table th {
		color: #1f2937;
		border-bottom-color: rgba(0, 0, 0, 0.1);
	}

	.tweets-table td {
		padding: 12px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		color: #ffffff;
		font-size: 14px;
	}

	:global(html:not(.dark)) .tweets-table td {
		color: #1f2937;
		border-bottom-color: rgba(0, 0, 0, 0.05);
	}

	.tweets-table tbody tr:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	:global(html:not(.dark)) .tweets-table tbody tr:hover {
		background: rgba(0, 0, 0, 0.03);
	}

	.date-cell {
		white-space: nowrap;
		color: #a1a1aa;
	}

	:global(html:not(.dark)) .date-cell {
		color: #6b7280;
	}

	.content-cell {
		max-width: 400px;
	}

	.tweet-preview {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.author-cell {
		white-space: nowrap;
	}

	.author-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.author-avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		object-fit: cover;
	}

	.actions-cell {
		white-space: nowrap;
	}

	.action-link {
		color: #6366f1;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: color 0.2s ease;
	}

	.action-link:hover {
		color: #4f46e5;
	}
</style>

