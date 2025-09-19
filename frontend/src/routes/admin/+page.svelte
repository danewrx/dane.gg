<script lang="ts">
	import { user, isAuthenticated } from '$lib/stores/auth';
	import { authService } from '$lib/services/auth';
	import { onMount } from 'svelte';

	let systemStatus = {
		health: 'Unknown',
		rateLimits: null
	};

	onMount(async () => {
		try {
			// Test API connectivity
			const response = await fetch('/api/status/health');
			if (response.ok) {
				const data = await response.json();
				systemStatus.health = data.status;
			}
		} catch (error) {
			console.error('Failed to fetch system status:', error);
			systemStatus.health = 'Error';
		}
	});
</script>

<svelte:head>
	<title>Admin Dashboard - Dane.gg</title>
</svelte:head>

<div class="container">
	<div class="dashboard-header">
		<h1>🔧 Admin Dashboard</h1>
		<p>Welcome to the admin control panel</p>
	</div>

	{#if $isAuthenticated && $user}
		<div class="user-info-card">
			<h2>User Information</h2>
			<div class="user-details">
				<div class="detail-item">
					<strong>Username:</strong> {$user.username}
				</div>
				<div class="detail-item">
					<strong>User ID:</strong> {$user.id}
				</div>
				<div class="detail-item">
					<strong>Role:</strong> 
					<span class="role-badge" class:admin={$user.isAdmin}>
						{$user.isAdmin ? 'Administrator' : 'User'}
					</span>
				</div>
			</div>
		</div>
	{/if}

	<div class="system-status-card">
		<h2>System Status</h2>
		<div class="status-details">
			<div class="detail-item">
				<strong>API Health:</strong> 
				<span class="status-indicator" class:healthy={systemStatus.health === 'OK'}>
					{systemStatus.health}
				</span>
			</div>
			<div class="detail-item">
				<strong>Authentication:</strong> 
				<span class="status-indicator" class:healthy={$isAuthenticated}>
					{$isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
				</span>
			</div>
		</div>
	</div>

	<div class="quick-actions">
		<h2>Quick Actions</h2>
		<div class="action-buttons">
			<button class="action-btn" on:click={() => authService.logout()}>
				🚪 Logout
			</button>
			<a href="/" class="action-btn public-link">
				🌐 Back to Public Site
			</a>
		</div>
	</div>
</div>

<style>
	.container {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem;
	}

	.dashboard-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.dashboard-header h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		color: #1e293b;
	}

	.dashboard-header p {
		font-size: 1.25rem;
		color: #64748b;
		margin: 0;
	}

	.user-info-card,
	.system-status-card,
	.quick-actions {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
	}

	.user-info-card h2,
	.system-status-card h2,
	.quick-actions h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1e293b;
		margin: 0 0 1rem 0;
	}

	.user-details,
	.status-details {
		display: grid;
		gap: 0.75rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid #e5e7eb;
	}

	.detail-item:last-child {
		border-bottom: none;
	}

	.detail-item strong {
		color: #374151;
		font-weight: 500;
	}

	.role-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		background: #e5e7eb;
		color: #6b7280;
	}

	.role-badge.admin {
		background: #dbeafe;
		color: #1d4ed8;
	}

	.status-indicator {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		background: #fef2f2;
		color: #dc2626;
	}

	.status-indicator.healthy {
		background: #f0fdf4;
		color: #16a34a;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 500;
		text-decoration: none;
		transition: all 0.2s;
		border: none;
		cursor: pointer;
		font-size: 1rem;
	}

	.action-btn.public-link {
		background: #10b981;
		color: white;
	}

	.action-btn.public-link:hover {
		background: #059669;
		transform: translateY(-1px);
	}

	.action-btn:not(.public-link) {
		background: #dc2626;
		color: white;
	}

	.action-btn:not(.public-link):hover {
		background: #b91c1c;
		transform: translateY(-1px);
	}

	@media (max-width: 640px) {
		.container {
			padding: 1rem;
		}

		.dashboard-header h1 {
			font-size: 2rem;
		}

		.action-buttons {
			flex-direction: column;
		}

		.action-btn {
			justify-content: center;
		}
	}
</style>
