<script lang="ts">
	import { Eye, Users, FileText, BarChart3 } from 'lucide-svelte';

	// Dashboard stats matching the image exactly
	let stats = $state({
		totalVisits: 31,
		uniqueVisitors: 20,
		pagesViewed: 5,
		activeDays: 8
	});

	// Stat cards matching the image
	const statCards = [
		{
			title: 'Total Visits',
			value: stats.totalVisits,
			icon: Eye
		},
		{
			title: 'Unique Visitors',
			value: stats.uniqueVisitors,
			icon: Users
		},
		{
			title: 'Pages Viewed',
			value: stats.pagesViewed,
			icon: FileText
		},
		{
			title: 'Active Days',
			value: stats.activeDays,
			icon: BarChart3
		}
	];
</script>

<svelte:head>
	<title>Admin Dashboard - dane.gg</title>
</svelte:head>

<div class="admin-dashboard">
	<!-- Site Statistics Section -->
	<section class="stats-section">
		<div class="section-header">
			<h2 class="section-title">Site Statistics</h2>
			<select class="period-select">
				<option value="7">Last 7 Days</option>
				<option value="30">Last 30 Days</option>
				<option value="90">Last 90 Days</option>
			</select>
		</div>
		
		<div class="stats-grid">
			{#each statCards as card (card.title)}
				<div class="stat-card">
					<div class="stat-content">
						<div class="stat-value">{card.value}</div>
						<div class="stat-label">{card.title}</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Additional sections placeholder -->
	<section class="content-grid">
		<div class="content-card">
			<h3 class="card-title">Visitor Trends</h3>
			<div class="chart-placeholder">
				<p>Chart will be implemented here</p>
			</div>
		</div>
		
		<div class="content-card">
			<h3 class="card-title">Page Views</h3>
			<div class="chart-placeholder">
				<p>Chart will be implemented here</p>
			</div>
		</div>
		
		<div class="content-card">
			<h3 class="card-title">Blog Posts</h3>
			<div class="empty-state">
				<p>No blog posts yet</p>
			</div>
		</div>
		
		<div class="content-card">
			<h3 class="card-title">Visitor Countries</h3>
			<div class="chart-placeholder">
				<p>Chart will be implemented here</p>
			</div>
		</div>
		
		<div class="content-card">
			<h3 class="card-title">User Agents</h3>
			<div class="list-placeholder">
				<p>User agent data will be shown here</p>
			</div>
		</div>
	</section>
</div>

<style>
	.admin-dashboard {
		max-width: 1200px;
		margin: 0 auto;
	}

	.stats-section {
		margin-bottom: 32px;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.section-title {
		color: #ffffff;
		font-size: 20px;
		font-weight: 600;
		margin: 0;
	}

	.period-select {
		background: #282828;
		border: 1px solid #3a3a3a;
		color: #ffffff;
		padding: 8px 12px;
		border-radius: 4px;
		font-size: 14px;
		cursor: pointer;
	}

	.period-select:focus {
		outline: 2px solid #6366f1;
		outline-offset: 2px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
	}

	.stat-card {
		background: #282828;
		border-radius: 8px;
		padding: 20px;
		border: 1px solid #3a3a3a;
	}

	.stat-content {
		text-align: left;
	}

	.stat-value {
		color: #ffffff;
		font-size: 28px;
		font-weight: 700;
		line-height: 1;
		margin-bottom: 4px;
	}

	.stat-label {
		color: #a1a1aa;
		font-size: 14px;
		font-weight: 400;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.content-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.content-card {
		background: #282828;
		border-radius: 8px;
		padding: 20px;
		border: 1px solid #3a3a3a;
	}

	.card-title {
		color: #ffffff;
		font-size: 16px;
		font-weight: 600;
		margin: 0 0 16px 0;
	}

	.chart-placeholder,
	.empty-state,
	.list-placeholder {
		color: #a1a1aa;
		font-size: 14px;
		text-align: center;
		padding: 20px 0;
	}

	/* Responsive design */
	@media (max-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.content-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.section-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}
		
		.content-grid {
			grid-template-columns: 1fr;
		}
	}
</style>