<script lang="ts">
	import { onMount } from 'svelte';

	interface DiscordStatusData {
		status: number;
		lastUpdate: string;
	}

	let status: DiscordStatusData = { status: 0, lastUpdate: new Date().toISOString() };
	let isLoading = true;
	let error: string | null = null;

	// Fetch Discord status from backend API
	async function fetchDiscordStatus() {
		try {
			isLoading = true;
			error = null;
			
			const response = await fetch(`/api/widgets/discord-status`);
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const data = await response.json();
			status = data;
		} catch (err) {
			console.error('Error fetching Discord status:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch Discord status';
			// Set default offline status on error
			status = { status: 0, lastUpdate: new Date().toISOString() };
		} finally {
			isLoading = false;
		}
	}

	// Auto-refresh status every 30 seconds
	let refreshInterval: NodeJS.Timeout;

	onMount(() => {
		fetchDiscordStatus();
		
		// Set up auto-refresh
		refreshInterval = setInterval(fetchDiscordStatus, 30000);
		
		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval);
			}
		};
	});

	// Computed values
	$: isOnline = status.status === 1;
	$: statusText = isOnline ? 'ONLINE' : 'OFFLINE';
	$: statusClass = isOnline ? 'online' : 'offline';
</script>

<div class="discord-status">
	<div class="status-text">
		<span class="status-prefix">I'm</span>
		<div class="status-indicator">
			{#if isLoading}
				<span class="status-state loading">LOADING...</span>
			{:else if error}
				<span class="status-state error">ERROR</span>
			{:else}
				<span class="status-state {statusClass}">{statusText}</span>
			{/if}
			<span class="status-exclaim {statusClass}">!</span>
		</div>
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
		background: transparent !important;
	}

	:global(*:focus) {
		box-shadow: none !important;
		outline: none !important;
		background: transparent !important;
	}

	:global(*:active) {
		box-shadow: none !important;
		outline: none !important;
		background: transparent !important;
	}

	:global(*:focus-visible) {
		box-shadow: none !important;
		outline: none !important;
	}

	:global(*:focus-within) {
		box-shadow: none !important;
		outline: none !important;
	}
	.discord-status {
		font-family: 'Courier New', monospace;
		display: flex;
		align-items: center;
		justify-content: flex-start;
		height: 100%;
		min-height: 32px;
	}

	.status-text {
		display: flex;
		align-items: center;
		height: 100%;
		position: relative;
		padding-top: 3px;
	}

	.status-prefix {
		font-size: 20px;
		font-weight: normal;
		color: #cccccc;
		display: inline-block;
		margin-right: 4px;
		line-height: 1;
		vertical-align: baseline;
	}

	.status-indicator {
		display: inline-flex;
		align-items: center;
		line-height: 1;
		vertical-align: baseline;
	}

	.status-state {
		font-size: 28px;
		font-weight: bold;
		background: linear-gradient(to bottom, #440000, #ff0000, #ff4444);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		transition: all 0.3s ease;
		line-height: 1;
		display: inline-block;
		vertical-align: baseline;
	}

	.status-state.online {
		background: linear-gradient(to bottom, #004400, #00ff00, #44ff44);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.status-state.loading {
		color: #ffff00;
		background: none;
		-webkit-text-fill-color: #ffff00;
		animation: pulse 1s infinite;
	}

	.status-state.error {
		color: #ff0000;
		background: none;
		-webkit-text-fill-color: #ff0000;
		animation: shake 0.5s ease-in-out;
	}

	.status-exclaim {
		font-size: 28px;
		font-weight: bold;
		background: linear-gradient(to bottom, #440000, #ff0000, #ff4444);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-left: 2px;
		transform: skew(-15deg);
		display: inline-block;
		transition: all 0.3s ease;
		line-height: 1;
		vertical-align: baseline;
	}

	.status-exclaim.online {
		background: linear-gradient(to bottom, #004400, #00ff00, #44ff44);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	/* Animations */
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	@keyframes shake {
		0%, 100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-2px);
		}
		75% {
			transform: translateX(2px);
		}
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.discord-status {
			text-align: left;
		}
		
		.status-prefix {
			font-size: 20px;
		}
		
		.status-state, .status-exclaim {
			font-size: 26px;
		}
		
	}

	@media (max-width: 480px) {
		.discord-status {
			text-align: left;
		}
		
		.status-prefix {
			font-size: 18px;
		}
		
		.status-state, .status-exclaim {
			font-size: 24px;
		}
		
	}

	/* Dark mode support for text colors */
	:global(html:not(.dark)) .status-prefix {
		color: #666666;
	}

	:global(html:not(.dark)) .status-exclaim {
		background: linear-gradient(to bottom, #330000, #cc0000, #ff4444);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	:global(html:not(.dark)) .status-exclaim.online {
		background: linear-gradient(to bottom, #003300, #00aa00, #44cc44);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	:global(html:not(.dark)) .status-state {
		background: linear-gradient(to bottom, #330000, #cc0000, #ff4444);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	:global(html:not(.dark)) .status-state.online {
		background: linear-gradient(to bottom, #003300, #00aa00, #44cc44);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
</style>
