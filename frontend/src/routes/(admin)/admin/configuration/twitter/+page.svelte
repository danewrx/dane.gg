<script lang="ts">
	import { onMount } from 'svelte';
	import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Twitter, ExternalLink, Calendar, User, Edit2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface ConnectionStatus {
		connected: boolean;
		message: string;
		failureType?: string;
		details?: string;
		request?: {
			method: string;
			endpoint: string;
			username: string;
			hasCookies: boolean;
		};
		response?: {
			status?: number;
			data?: any;
			error?: string;
		};
	}

	interface TwitterStatus {
		configured: boolean;
		username: string | null;
		usernameSource?: 'database' | 'environment';
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
	let showRequestResponse = $state(false);
	let editingUsername = $state(false);
	let usernameInput = $state('');
	let savingUsername = $state(false);

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
				if (latestTweet?.tweetId) {
					lastTweetId = latestTweet.tweetId;
				}
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
					lastTweetId = result.tweetId;
				} else {
					latestTweet = null;
					lastTweetId = null;
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
			showRequestResponse = false;

			const response = await fetch('/api/twitter/status', {
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to test connection');
			}

			const result = await response.json();
			status = result;

			if (result.connection) {
				showRequestResponse = true;
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

	async function startEditingUsername() {
		editingUsername = true;
		usernameInput = status?.username || '';
	}

	function cancelEditingUsername() {
		editingUsername = false;
		usernameInput = '';
	}

	async function saveUsername() {
		if (!usernameInput.trim()) {
			toast.error('Username cannot be empty');
			return;
		}

		try {
			savingUsername = true;
			error = '';

			const response = await fetch('/api/twitter/username', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					username: usernameInput.trim()
				})
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to save username');
			}

			toast.success('Username saved successfully');
			editingUsername = false;
			usernameInput = '';
			
			await loadStatus();
		} catch (err) {
			console.error('Error saving username:', err);
			error = err instanceof Error ? err.message : 'Failed to save username';
			toast.error(error);
		} finally {
			savingUsername = false;
		}
	}

	let pollInterval: ReturnType<typeof setInterval> | null = null;
	let lastTweetId: string | null = null;
	let isPageVisible = $state(true);

	async function pollForUpdates() {
		if (!isPageVisible || !status?.configured) {
			return;
		}

		try {
			const statusResponse = await fetch('/api/twitter/status', {
				credentials: 'include'
			});

			if (statusResponse.ok) {
				const statusResult = await statusResponse.json();
				
				if (status && statusResult.connection) {
					const oldConnected = status.connection?.connected;
					const newConnected = statusResult.connection.connected;
					
					if (oldConnected !== newConnected || statusResult.username !== status.username) {
						status = statusResult;
					}
				}
			}

			// Check for new latest tweet
			const tweetResponse = await fetch('/api/widgets/latest-tweet', {
				credentials: 'include'
			});

			if (tweetResponse.ok) {
				const tweetResult = await tweetResponse.json();
				
				if (tweetResult.tweetId) {
					// Check if tweet ID changed
					if (lastTweetId !== tweetResult.tweetId) {
						lastTweetId = tweetResult.tweetId;
						
						// Update latest tweet
						latestTweet = {
							id: tweetResult.tweetId,
							tweetId: tweetResult.tweetId,
							content: tweetResult.content,
							authorName: tweetResult.authorName,
							authorUsername: tweetResult.authorUsername,
							authorProfileImage: tweetResult.authorProfileImage,
							authorProfileUrl: tweetResult.authorProfileUrl,
							tweetUrl: tweetResult.tweetUrl,
							createdAt: tweetResult.createdAt,
							updatedAt: tweetResult.lastUpdate
						};
						await loadAllTweets();
					} else if (latestTweet && latestTweet.tweetId === tweetResult.tweetId) {
						if (latestTweet.updatedAt !== tweetResult.lastUpdate) {
							latestTweet = {
								...latestTweet,
								content: tweetResult.content,
								updatedAt: tweetResult.lastUpdate
							};
						}
					}
				} else if (latestTweet) {
					latestTweet = null;
					lastTweetId = null;
				}
			}
		} catch (err) {
			console.debug('Polling update failed:', err);
		}
	}

	// Handle page visibility changes
	function handleVisibilityChange() {
		isPageVisible = !document.hidden;
		
		if (isPageVisible && status?.configured) {
			pollForUpdates();
		}
	}

	onMount(() => {
		loadStatus();
		setTimeout(() => {
			if (status?.configured) {
				loadAllTweets();
				if (latestTweet?.tweetId) {
					lastTweetId = latestTweet.tweetId;
				}
			}
		}, 1000);

		pollInterval = setInterval(pollForUpdates, 30000);

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			if (pollInterval) {
				clearInterval(pollInterval);
			}
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
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
		<div class="config-form">
			<!-- Twitter Configuration -->
			<div class="form-section">
				<h2 class="section-title">Twitter Configuration</h2>
				
				{#if !status?.configured}
					<div class="config-warning">
						<AlertCircle size={20} />
						<div class="warning-content">
							<p class="warning-title">Twitter API is not configured</p>
							<p class="warning-text">
								Please set the following environment variables:
							</p>
							<ul class="env-vars-list">
								<li><code>TWITTER_COOKIES</code> - Twitter/X authentication cookies (obtained from a logged-in session)</li>
								<li><code>TWITTER_USERNAME</code> - Your Twitter/X username (without @)</li>
							</ul>
							<p class="warning-text">
								After setting these variables, restart your server for the changes to take effect.
							</p>
						</div>
					</div>
				{:else}
					<div class="config-info">
						<div class="info-item">
							<span class="info-label">Username:</span>
							{#if editingUsername}
								<div class="username-edit">
									<input
										type="text"
										bind:value={usernameInput}
										placeholder="Enter username (without @)"
										class="username-input"
										disabled={savingUsername}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												saveUsername();
											} else if (e.key === 'Escape') {
												cancelEditingUsername();
											}
										}}
									/>
									<div class="username-edit-actions">
										<button
											type="button"
											class="icon-button"
											onclick={saveUsername}
											disabled={savingUsername}
											title="Save"
										>
											<CheckCircle2 size={16} />
										</button>
										<button
											type="button"
											class="icon-button"
											onclick={cancelEditingUsername}
											disabled={savingUsername}
											title="Cancel"
										>
											<XCircle size={16} />
										</button>
									</div>
								</div>
							{:else}
								<div class="username-display">
									<span class="info-value">{status.username || 'Not set'}</span>
									{#if status.usernameSource}
										<span class="username-source" class:database={status.usernameSource === 'database'} class:environment={status.usernameSource === 'environment'}>
											({status.usernameSource === 'database' ? 'Database' : 'Environment'})
										</span>
									{/if}
									<button
										type="button"
										class="icon-button small"
										onclick={startEditingUsername}
										title="Edit username"
									>
										<Edit2 size={14} />
									</button>
								</div>
							{/if}
						</div>
						<div class="info-item">
							<span class="info-label">Cookies:</span>
							<span class="info-value">{status.hasCookies ? 'Configured' : 'Not configured'}</span>
						</div>
						<div class="connection-status-section">
							<div class="connection-status-header">
								<span class="info-label">Connection Status:</span>
								{#if testingConnection}
									<RefreshCw size={16} class="spinning" />
								{/if}
							</div>
							{#if status.connection}
								<div class="connection-status" class:connected={status.connection.connected} class:disconnected={!status.connection.connected}>
									{#if status.connection.connected}
										<CheckCircle2 size={16} />
									{:else}
										<XCircle size={16} />
									{/if}
									<span class="connection-status-text">
										{status.connection.connected ? 'Connected' : 'Disconnected'}
									</span>
									{#if status.connection.message}
										<span class="connection-status-message">{status.connection.message}</span>
									{/if}
								</div>
								{#if !status.connection.connected && status.connection.details}
									<div class="connection-error-details">
										<p class="error-detail-text">{status.connection.details}</p>
										{#if status.connection.failureType}
											<p class="error-type-text">Type: {status.connection.failureType}</p>
										{/if}
									</div>
								{/if}
							{:else if !testingConnection}
								<div class="connection-status-placeholder">
									<span class="connection-status-text">Not tested</span>
								</div>
							{/if}
						</div>
						<p class="help-text">Configuration is read from environment variables. To change these values, update your environment configuration and restart the server.</p>
					</div>

					<!-- Test Button -->
					<div class="test-section">
						<button 
							class="btn btn-primary"
							onclick={testConnection}
							disabled={testingConnection}
						>
							{#if testingConnection}
								<RefreshCw size={16} class="spinning" />
							{:else}
								<RefreshCw size={16} />
							{/if}
							{testingConnection ? 'Testing...' : 'Test Connection'}
						</button>
					</div>

					<!-- Request/Response Details -->
					{#if showRequestResponse && status?.connection && (status.connection.request || status.connection.response)}
						<div class="request-response-section">
							<h3 class="subsection-title">Request & Response Details</h3>
							
							{#if status.connection.request}
								<div class="request-response-box">
									<div class="request-response-header">
										<span class="request-response-label">Request</span>
										<span class="request-response-method">{status.connection.request.method}</span>
									</div>
									<div class="request-response-content">
										<div class="request-response-item">
											<span class="request-response-key">Endpoint:</span>
											<span class="request-response-value">{status.connection.request.endpoint}</span>
										</div>
										<div class="request-response-item">
											<span class="request-response-key">Username:</span>
											<span class="request-response-value">{status.connection.request.username}</span>
										</div>
										<div class="request-response-item">
											<span class="request-response-key">Cookies Configured:</span>
											<span class="request-response-value" class:success={status.connection.request.hasCookies} class:error={!status.connection.request.hasCookies}>
												{status.connection.request.hasCookies ? 'Yes' : 'No'}
											</span>
										</div>
									</div>
								</div>
							{/if}

							{#if status.connection.response}
								<div class="request-response-box">
									<div class="request-response-header">
										<span class="request-response-label">Response</span>
										{#if status.connection.response.status}
											<span class="request-response-status" class:success={status.connection.response.status >= 200 && status.connection.response.status < 300} class:error={status.connection.response.status >= 400}>
												{status.connection.response.status}
											</span>
										{/if}
									</div>
									<div class="request-response-content">
										{#if status.connection.response.error}
											<div class="request-response-item">
												<span class="request-response-key">Error:</span>
												<span class="request-response-value error-text">{status.connection.response.error}</span>
											</div>
										{/if}
										{#if status.connection.response.data}
											<div class="request-response-item full-width">
												<span class="request-response-key">Data:</span>
												<pre class="request-response-json">{JSON.stringify(status.connection.response.data, null, 2)}</pre>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				{/if}
			</div>

			<!-- Latest Tweet Section -->
			{#if latestTweet}
				<div class="form-section">
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
			<div class="form-section">
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
		padding: 0;
	}

	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 20px;
		gap: 16px;
		color: var(--text-secondary, #9ca3af);
	}

	.error-state {
		color: #ef4444;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--border-color, #3a3a3a);
		border-top-color: var(--accent-color);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.config-form {
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.section-title {
		font-size: 20px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.config-warning {
		padding: 20px;
		border: 2px solid #f59e0b;
		border-radius: 8px;
		background: rgba(245, 158, 11, 0.1);
		display: flex;
		gap: 16px;
		margin-bottom: 20px;
	}

	.config-warning :global(svg) {
		color: #f59e0b;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.warning-content {
		flex: 1;
	}

	.warning-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin: 0 0 12px 0;
	}

	.warning-text {
		font-size: 14px;
		color: var(--text-secondary, #9ca3af);
		margin: 0 0 8px 0;
		line-height: 1.5;
	}

	.env-vars-list {
		margin: 12px 0;
		padding-left: 20px;
		color: var(--text-secondary, #9ca3af);
	}

	.env-vars-list li {
		margin: 8px 0;
		line-height: 1.5;
	}

	.env-vars-list code {
		background: rgba(245, 158, 11, 0.2);
		padding: 2px 6px;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 13px;
		color: #fbbf24;
	}

	.config-info {
		padding: 16px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		background: var(--bg-secondary, #2d2d2d);
		margin-bottom: 20px;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.info-item:last-child {
		border-bottom: none;
	}

	.info-label {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.info-value {
		font-size: 14px;
		color: var(--text-secondary, #9ca3af);
		font-family: 'Courier New', monospace;
	}

	.username-display {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
	}

	.username-source {
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 4px;
		font-weight: 500;
	}

	.username-source.database {
		background: var(--accent-color-light);
		color: var(--accent-color);
	}

	.username-source.environment {
		background: rgba(156, 163, 175, 0.2);
		color: #9ca3af;
	}

	.icon-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		width: 24px;
		height: 24px;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 4px;
		color: var(--text-secondary, #9ca3af);
		cursor: pointer;
		transition: all 0.2s;
	}

	.icon-button.small {
		width: 20px;
		height: 20px;
		padding: 2px;
	}

	.icon-button:hover {
		background: var(--bg-secondary, #2d2d2d);
		border-color: var(--accent-color);
		color: var(--accent-color);
	}

	.icon-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.username-edit {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
	}

	.username-input {
		flex: 1;
		padding: 6px 10px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--accent-color);
		border-radius: 4px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-family: 'Courier New', monospace;
	}

	.username-input:focus {
		outline: none;
		border-color: var(--accent-color);
		box-shadow: 0 0 0 2px var(--accent-color-medium);
	}

	.username-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.username-edit-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.connection-status-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 12px 0;
	}

	.connection-status-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.connection-status-header :global(.spinning) {
		animation: spin 1s linear infinite;
		color: var(--text-secondary, #9ca3af);
	}

	.connection-status {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		border-radius: 6px;
		font-size: 14px;
	}

	.connection-status.connected {
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.3);
		color: #10b981;
	}

	.connection-status.disconnected {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.connection-status-text {
		font-weight: 500;
	}

	.connection-status-message {
		font-size: 12px;
		opacity: 0.8;
		margin-left: auto;
	}

	.connection-status-placeholder {
		padding: 10px 12px;
		color: var(--text-secondary, #9ca3af);
		font-size: 13px;
		font-style: italic;
	}

	.connection-error-details {
		padding: 12px;
		background: rgba(239, 68, 68, 0.05);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 6px;
		margin-top: 8px;
	}

	.error-detail-text {
		font-size: 13px;
		color: #fca5a5;
		margin: 0 0 4px 0;
		line-height: 1.4;
	}

	.error-type-text {
		font-size: 12px;
		color: #fca5a5;
		opacity: 0.8;
		margin: 0;
	}

	.help-text {
		font-size: 12px;
		color: var(--text-secondary, #9ca3af);
		margin: 0;
		margin-top: 12px;
	}

	.test-section {
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background: var(--accent-color);
		color: var(--accent-color-contrast, #ffffff);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--accent-color-dark);
		color: var(--accent-color-dark-contrast, #ffffff);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.request-response-section {
		margin-top: 24px;
		padding-top: 24px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.subsection-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin: 0 0 12px 0;
	}

	.request-response-box {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 16px;
		margin-bottom: 16px;
	}

	.request-response-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.request-response-label {
		font-weight: 600;
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.request-response-method {
		padding: 4px 10px;
		background: var(--accent-color-light);
		border: 1px solid var(--accent-color-medium);
		border-radius: 4px;
		font-size: 12px;
		font-weight: 600;
		color: var(--accent-color);
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}

	.request-response-status {
		padding: 4px 10px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 600;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}

	.request-response-status.success {
		background: rgba(16, 185, 129, 0.2);
		border: 1px solid rgba(16, 185, 129, 0.4);
		color: #34d399;
	}

	.request-response-status.error {
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid rgba(239, 68, 68, 0.4);
		color: #fca5a5;
	}

	.request-response-content {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.request-response-item {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	.request-response-item.full-width {
		flex-direction: column;
		gap: 8px;
	}

	.request-response-key {
		font-weight: 500;
		font-size: 13px;
		color: var(--text-secondary, #9ca3af);
		min-width: 140px;
		flex-shrink: 0;
	}

	.request-response-value {
		font-size: 13px;
		color: var(--text-primary, #ffffff);
		font-family: 'Courier New', monospace;
		word-break: break-word;
		flex: 1;
	}

	.request-response-value.success {
		color: #34d399;
		font-weight: 600;
	}

	.request-response-value.error {
		color: #fca5a5;
		font-weight: 600;
	}

	.request-response-value.error-text {
		color: #fca5a5;
	}

	.request-response-json {
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		padding: 12px;
		margin: 0;
		font-size: 12px;
		line-height: 1.6;
		color: var(--text-primary, #ffffff);
		overflow-x: auto;
		font-family: 'Courier New', monospace;
		max-height: 400px;
		overflow-y: auto;
	}

	.tweet-card {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 20px;
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
		background: var(--accent-color-light);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent-color);
	}

	.tweet-author {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.author-name {
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		font-size: 16px;
	}

	.author-username {
		color: var(--text-secondary, #9ca3af);
		font-size: 14px;
	}

	.tweet-link {
		color: var(--accent-color);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.tweet-link:hover {
		color: var(--accent-color-dark);
	}

	.tweet-content {
		margin-bottom: 16px;
		color: var(--text-primary, #ffffff);
		line-height: 1.6;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.tweet-footer {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-secondary, #9ca3af);
		font-size: 14px;
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
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.tweets-table {
		width: 100%;
		border-collapse: collapse;
	}

	.tweets-table thead {
		background: var(--bg-secondary, #2d2d2d);
	}

	.tweets-table th {
		padding: 12px 16px;
		text-align: left;
		font-weight: 600;
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.tweets-table td {
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.tweets-table tbody tr:hover {
		background: var(--bg-secondary, #2d2d2d);
	}

	.date-cell {
		white-space: nowrap;
		color: var(--text-secondary, #9ca3af);
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
		color: var(--accent-color);
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		transition: color 0.2s ease;
	}

	.action-link:hover {
		color: var(--accent-color-dark);
	}
</style>


