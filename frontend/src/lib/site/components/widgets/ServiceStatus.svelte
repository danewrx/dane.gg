<script lang="ts">
	import { logger } from '$lib/logger';

	import { onMount, onDestroy } from 'svelte';
	import { RefreshCw } from 'lucide-svelte';

	function monitorStatusClass(status: string): string {
		switch (status) {
			case 'up':
				return 'status-monitor-up';
			case 'down':
				return 'status-monitor-down';
			case 'maintenance':
				return 'status-monitor-maintenance';
			case 'pending':
				return 'status-monitor-pending';
			default:
				return 'status-monitor-unknown';
		}
	}

	interface Monitor {
		id: number;
		name: string;
		customName?: string;
		url?: string;
		type: string;
		status: 'up' | 'down' | 'pending' | 'maintenance';
		uptime?: number;
		avgResponseTime?: number;
		lastCheck?: string;
		group?: string;
	}

	let { overallStatus = $bindable('UNKNOWN') } = $props();

	let monitors = $state<Monitor[]>([]);
	let loading = $state(true);
	let error = $state('');
	let updateInterval: ReturnType<typeof setInterval> | null = null;

	const UPDATE_INTERVAL = 300000; // 5 minutes

	const allMonitors = $derived.by(() => {
		return monitors;
	});

	$effect(() => {
		if (monitors.length === 0) {
			overallStatus = 'UNKNOWN';
			return;
		}

		// DOWN
		if (monitors.some((m) => m.status === 'down')) {
			overallStatus = 'DOWN';
			return;
		}
		// MAINTENCANCE
		if (monitors.some((m) => m.status === 'maintenance')) {
			overallStatus = 'MAINTENANCE';
			return;
		}
		// PENDING
		if (monitors.some((m) => m.status === 'pending')) {
			overallStatus = 'PENDING';
			return;
		}
		// OKAY
		if (monitors.every((m) => m.status === 'up')) {
			overallStatus = 'OK';
			return;
		}

		overallStatus = 'UNKNOWN';
	});

	async function loadStatus() {
		try {
			loading = true;
			error = '';

			const response = await fetch('/api/uptime-kuma/status');

			if (!response.ok) {
				throw new Error('Failed to fetch service status');
			}

			const result = await response.json();
			if (result.success) {
				monitors = result.data || [];
			} else {
				throw new Error(result.error || 'Failed to load status');
			}
		} catch (err) {
			logger.error('Error loading service status:', err);
			error = err instanceof Error ? err.message : 'Failed to load service status';
			monitors = [];
		} finally {
			loading = false;
		}
	}

	function getStatusText(status: string): string {
		switch (status) {
			case 'up':
				return 'OK';
			case 'down':
				return 'DOWN';
			case 'maintenance':
				return 'MAINTENANCE';
			case 'pending':
				return 'PENDING';
			default:
				return 'UNKNOWN';
		}
	}

	onMount(() => {
		loadStatus();

		updateInterval = setInterval(() => {
			loadStatus();
		}, UPDATE_INTERVAL);
	});

	onDestroy(() => {
		if (updateInterval) {
			clearInterval(updateInterval);
		}
	});
</script>

<div class="service-status-widget">
	{#if loading && monitors.length === 0}
		<div class="loading-state">
			<RefreshCw size={16} class="spinning" />
			<span>Loading service status...</span>
		</div>
	{:else if error && monitors.length === 0}
		<div class="error-state">
			<span>{error}</span>
		</div>
	{:else if monitors.length === 0}
		<div class="empty-state">
			<span>No services configured</span>
		</div>
	{:else}
		<div class="status-container">
			<div class="status-list">
				{#each allMonitors as monitor (monitor.id)}
					<div class="status-item">
						<span class="status-name">{monitor.customName || monitor.name}</span>
						<span class="status-indicator {monitorStatusClass(monitor.status)}">
							[ {getStatusText(monitor.status)} ]
						</span>
					</div>
				{/each}
			</div>
			{#if loading}
				<div class="updating-indicator">
					<RefreshCw size={12} class="spinning" />
					<span>Updating...</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.service-status-widget {
		display: flex;
		flex-direction: column;
	}

	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px;
		color: var(--theme-text-secondary, var(--text-secondary, #9ca3af));
		font-size: calc(14 * 1em / 14);
		justify-content: center;
		font-family: var(--ascii-font-family, 'JetBrains Mono', 'Courier New', monospace);
	}

	.error-state {
		color: var(--status-down, #ffb6c1);
	}

	.status-container {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px 0;
		font-family: var(--ascii-font-family, 'JetBrains Mono', 'Courier New', monospace);
	}

	.status-list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 6px 16px;
	}

	@media (max-width: 768px) {
		.status-list {
			grid-template-columns: 1fr;
			gap: 2px;
		}
	}

	.status-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.status-name {
		font-size: calc(14 * 1em / 14);
		color: var(--theme-text-primary, #333333);
		font-weight: 500;
		flex-shrink: 0;
	}

	.status-indicator {
		font-size: calc(14 * 1em / 14);
		font-weight: 600;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.status-monitor-up {
		color: var(--status-ok, #90ee90);
	}

	.status-monitor-down {
		color: var(--status-down, #ffb6c1);
	}

	.status-monitor-maintenance {
		color: var(--status-warn, #fde68a);
	}

	.status-monitor-pending {
		color: var(--status-pending, #e5e7eb);
	}

	.status-monitor-unknown {
		color: var(--status-neutral, #d1d5db);
	}

	.updating-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 0;
		font-size: calc(12 * 1em / 14);
		color: var(--theme-text-secondary, var(--text-secondary, #9ca3af));
	}

	.spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
