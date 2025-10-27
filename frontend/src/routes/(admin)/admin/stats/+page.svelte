<script lang="ts">
	import { onMount } from 'svelte';
	import { Eye, Users, FileText, Calendar } from 'lucide-svelte';
	import CountryPieChart from '$lib/admin/components/CountryPieChart.svelte';
	import BrowserList from '$lib/admin/components/BrowserList.svelte';
	import OperatingSystemList from '$lib/admin/components/OperatingSystemList.svelte';

	// Time range
	const timeRanges = [
		{ value: '12h', label: '12 Hours' },
		{ value: '24h', label: '24 Hours' },
		{ value: '7d', label: '7 Days' },
		{ value: '30d', label: '30 Days' },
		{ value: '6m', label: '6 Months' },
		{ value: '1y', label: '1 Year' },
		{ value: 'all', label: 'All Time' }
	];

	let selectedTimeRange = $state('24h');
	let stats = $state({
		totalViews: 0,
		uniqueVisitors: 0,
		totalPagesIndexed: 0,
		totalDaysSinceTracking: 0
	});
	let countries = $state([]);
	let browsers = $state([]);
	let operatingSystems = $state([]);
	let loading = $state(true);
	let error = $state('');

	const statCards = $derived([
		{
			title: 'Total Visits',
			value: stats.totalViews,
			icon: Eye
		},
		{
			title: 'Unique Visitors',
			value: stats.uniqueVisitors,
			icon: Users
		},
		{
			title: 'Pages Indexed',
			value: stats.totalPagesIndexed,
			icon: FileText
		},
		{
			title: 'Active Days',
			value: stats.totalDaysSinceTracking,
			icon: Calendar
		}
	]);

	// Load data
	async function loadStats() {
		try {
			loading = true;
			error = '';
			
			const response = await fetch(`/api/stats/dashboard?timeRange=${selectedTimeRange}`, {
				credentials: 'include'
			});
			
			if (!response.ok) {
				if (response.status === 401) {
					// Don't redirect - server auth will handle it
					error = 'Authentication required';
					return;
				}
				throw new Error(`HTTP ${response.status}`);
			}
			
			const data = await response.json();
			console.log('API Response:', data);
			
			if (data.success) {
                stats = {
					totalViews: data.data.overview.totalViews,
					uniqueVisitors: data.data.overview.uniqueVisitors,
					totalPagesIndexed: data.data.overview.totalPagesIndexed,
					totalDaysSinceTracking: data.data.overview.totalDaysSinceTracking
				};
				countries = data.data.countries || [];
				browsers = data.data.browsers || [];
				operatingSystems = data.data.os || [];
			console.log('Stats page - Countries data:', countries);
			} else {
				throw new Error(data.message || 'Failed to load stats');
			}
		} catch (err) {
			console.error('Error loading stats:', err);
			error = err instanceof Error ? err.message : 'Failed to load statistics';
		} finally {
			loading = false;
		}
	}

	function handleTimeRangeChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedTimeRange = target.value;
		loadStats();
	}

	onMount(() => {
		loadStats();
	});
</script>

<svelte:head>
	<title>Statistics - Admin Dashboard - dane.gg</title>
</svelte:head>

<div class="stats-page">
	<section class="header-section">
		<div class="section-header">
			<h1 class="page-title">Website Statistics</h1>
			<select 
				class="time-range-select" 
				bind:value={selectedTimeRange}
				onchange={handleTimeRangeChange}
			>
				{#each timeRanges as range}
					<option value={range.value}>{range.label}</option>
				{/each}
			</select>
		</div>
	</section>

	<section class="stats-section">
		{#if loading}
			<div class="loading-state">
				<div class="loading-spinner"></div>
				<p>Loading statistics...</p>
			</div>
		{:else if error}
			<div class="error-state">
				<p>Error: {error}</p>
				<button class="retry-button" onclick={loadStats}>Retry</button>
			</div>
		{:else}
			<div class="stats-grid">
				{#each statCards as card (card.title)}
					{@const IconComponent = card.icon}
					<div class="stat-card">
						<div class="stat-content">
							<div class="stat-value">{card.value.toLocaleString()}</div>
							<div class="stat-label">{card.title}</div>
						</div>
						<div class="stat-icon">
							<IconComponent size={24} />
						</div>
					</div>
				{/each}
			</div>

            <div class="dashboard-row">
                <div class="panel-left">
                    {#if countries.length > 0}
                        <CountryPieChart data={countries} title="Visitor Countries" />
                    {/if}
                </div>
                <aside class="panel-right">
                    <div class="browser-section">
                        <BrowserList data={browsers} title="Top Browsers" />
                    </div>
                    <div class="os-section">
                        <OperatingSystemList data={operatingSystems} title="Top Operating Systems" />
                    </div>
                </aside>
            </div>
		{/if}
	</section>
</div>

<style>
	.stats-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	.header-section {
		margin-bottom: 32px;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.page-title {
		color: var(--text-primary, #ffffff);
		font-size: 28px;
		font-weight: 700;
		margin: 0;
	}

	.time-range-select {
		background: var(--bg-secondary, #282828);
		border: 1px solid var(--border-color, #3a3a3a);
		color: var(--text-primary, #ffffff);
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 14px;
		cursor: pointer;
		min-width: 150px;
		transition: background 0.2s ease, border-color 0.2s ease;
	}

	.time-range-select:focus {
		outline: 2px solid var(--accent-color, #6366f1);
		outline-offset: 2px;
		border-color: var(--accent-color, #6366f1);
	}

	.time-range-select:hover {
		border-color: var(--accent-color, #4a4a4a);
		background: var(--bg-tertiary, #2d2d2d);
	}

	.stats-section {
		margin-bottom: 32px;
	}

	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 60px 20px;
		text-align: center;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--border-color, #3a3a3a);
		border-top: 3px solid var(--accent-color, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.loading-state p,
	.error-state p {
		color: var(--text-secondary, #a1a1aa);
		font-size: 16px;
		margin: 0;
	}

	.retry-button {
		background: var(--accent-color, #6366f1);
		color: var(--accent-color-contrast, #ffffff);
		border: none;
		padding: 10px 20px;
		border-radius: 6px;
		font-size: 14px;
		cursor: pointer;
		margin-top: 16px;
		transition: background 0.2s ease;
	}

	.retry-button:hover {
		background: var(--accent-color-dark, #5b5bf6);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 20px;
	}

.dashboard-row {
    margin-top: 32px;
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-auto-rows: 1fr;
    gap: 0;
    align-items: start;
    width: 100%;
    box-sizing: border-box;
}

.panel-left { 
    grid-column: 1 / 9; 
    min-width: 0; 
    padding-right: 10px;
}

.panel-right { 
    grid-column: 9 / 13; 
    grid-row: 1;
    min-width: 0; 
    height: 100%;
    padding-left: 10px;
    display: grid;
    grid-template-rows: 1fr 1fr;
    gap: 20px;
    overflow: hidden;
}

.browser-section {
    grid-row: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.os-section {
    grid-row: 2;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

@media (max-width: 1024px) {
    .dashboard-row { grid-template-columns: repeat(12, minmax(0, 1fr)); }
    .panel-left, .panel-right { grid-column: span 12; }
    
    .panel-right {
        grid-template-rows: auto auto;
    }
    
    .browser-section,
    .os-section {
        grid-row: auto;
    }
}

	.stat-card {
		background: var(--bg-secondary, #282828);
		border-radius: 12px;
		padding: 24px;
		border: 1px solid var(--border-color, #3a3a3a);
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: all 0.2s ease;
	}

	.stat-card:hover {
		border-color: var(--accent-color, #4a4a4a);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px var(--accent-color-light, rgba(99, 102, 241, 0.2));
	}

	.stat-content {
		flex: 1;
	}

	.stat-value {
		color: var(--text-primary, #ffffff);
		font-size: 32px;
		font-weight: 700;
		line-height: 1;
		margin-bottom: 8px;
	}

	.stat-label {
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-icon {
		color: var(--accent-color, #6366f1);
		opacity: 0.8;
	}

	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.section-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 16px;
		}

		.page-title {
			font-size: 24px;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.stat-card {
			padding: 20px;
		}

		.stat-value {
			font-size: 28px;
		}
	}

	@media (max-width: 480px) {
		.stats-page {
			padding: 16px;
		}

		.stat-card {
			padding: 16px;
		}

		.stat-value {
			font-size: 24px;
		}
	}
</style>
