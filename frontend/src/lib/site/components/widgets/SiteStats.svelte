<script lang="ts">
	import { onMount } from 'svelte';

	let totalVisits = $state<number | null>(null);
	let uniqueVisitors = $state<number | null>(null);
	let loading = $state(true);
	let error = $state(false);
	
	let animatedTotalVisits = $state(0);
	let animatedUniqueVisitors = $state(0);
	let animationComplete = $state(false);

	onMount(async () => {
		await loadStats();
	});

	async function loadStats() {
		try {
			loading = true;
			error = false;
			const response = await fetch('/api/stats/public');
			
			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					totalVisits = result.data.totalVisits || 0;
					uniqueVisitors = result.data.uniqueVisitors || 0;
					animateValues();
				} else {
					error = true;
				}
			} else {
				error = true;
			}
		} catch (err) {
			console.error('Error loading site stats:', err);
			error = true;
		} finally {
			loading = false;
		}
	}

	function animateValues() {
		if (totalVisits === null || uniqueVisitors === null) return;
		
		animationComplete = false;
		const duration = 2000;
		const startTime = Date.now();
		
		const animate = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);
			
			const easeOutQuart = 1 - Math.pow(1 - progress, 4);
			
			animatedTotalVisits = Math.floor(totalVisits! * easeOutQuart);
			animatedUniqueVisitors = Math.floor(uniqueVisitors! * easeOutQuart);
			
			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				animatedTotalVisits = totalVisits!;
				animatedUniqueVisitors = uniqueVisitors!;
				animationComplete = true;
			}
		};
		
		requestAnimationFrame(animate);
	}

	function formatNumber(num: number | null): string {
		if (num === null) return '0';
		return num.toLocaleString();
	}
</script>

<div class="site-stats">
	{#if loading}
		<div class="stat-line">
			<span class="stat-label">Loading...</span>
		</div>
	{:else if error}
		<div class="stat-line">
			<span class="stat-label">Error loading stats</span>
		</div>
	{:else}
		<div class="stat-line">
			<span class="stat-label">Total views:</span>
			<span class="stat-value">{formatNumber(animatedTotalVisits)}</span>
		</div>
		<div class="stat-line">
			<span class="stat-label">Unique visitors:</span>
			<span class="stat-value">{formatNumber(animatedUniqueVisitors)}</span>
		</div>
	{/if}
</div>

<style>
	.site-stats {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 0 12px 0;
	}

	.stat-line {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		background: color-mix(in srgb, var(--theme-accent, #90ee90) 3%, transparent);
		padding: 4px 8px;
		border-radius: 2px;
	}

	.stat-label {
		color: var(--theme-text-secondary, var(--text-secondary, #a1a1aa));
		font-family: var(--global-font-family, 'W95FA', 'JetBrains Mono', 'Courier New', monospace);
		font-size: calc(16 * 1em / 14);
		font-weight: normal;
	}

	.stat-value {
		color: var(--theme-accent, #90ee90);
		font-family: var(--global-font-family, 'W95FA', 'JetBrains Mono', 'Courier New', monospace);
		font-size: calc(16 * 1em / 14);
		font-weight: normal;
		text-shadow: 
			0 0 10px var(--theme-accent, #90ee90),
			0 0 20px var(--theme-accent, #90ee90),
			0 0 30px var(--theme-accent, #90ee90);
	}
</style>

