<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { LogOut, Menu } from 'lucide-svelte';

	const dispatch = createEventDispatcher<{
		logout: void;
		toggleSidebar: void;
	}>();

	function handleLogout() {
		dispatch('logout');
	}

	function handleToggleSidebar() {
		dispatch('toggleSidebar');
	}
</script>

<header class="admin-header">
	<div class="header-content">
		<!-- Left side - Menu toggle and site title -->
		<div class="header-left">
			<button 
				class="menu-toggle"
				onclick={handleToggleSidebar}
				aria-label="Toggle sidebar"
			>
				<Menu size={20} />
			</button>
			<h1 class="site-title">DANEGG</h1>
		</div>
		
		<!-- Right side - Logout button -->
		<div class="header-right">
			<button 
				class="logout-button"
				onclick={handleLogout}
				aria-label="Logout"
			>
				<LogOut size={18} />
			</button>
		</div>
	</div>
</header>

<style>
	.admin-header {
		background: #1a1a1a;
		color: #ffffff;
		z-index: 1000;
		position: sticky;
		top: 0;
		border-bottom: 1px solid #2a2a2a;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 24px;
		max-width: 100%;
		height: 40px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.menu-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		color: #ffffff;
		border: none;
		padding: 8px;
		cursor: pointer;
		transition: background-color 0.2s ease;
		border-radius: 4px;
	}

	.menu-toggle:hover {
		background: #2a2a2a;
	}

	.menu-toggle:focus {
		outline: 2px solid #6366f1;
		outline-offset: 2px;
	}

	.site-title {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: #ffffff;
		letter-spacing: 0.5px;
		text-transform: uppercase;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.logout-button {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		color: #ffffff;
		border: none;
		padding: 8px;
		cursor: pointer;
		transition: background-color 0.2s ease;
		border-radius: 4px;
	}

	.logout-button:hover {
		background: #2a2a2a;
	}

	.logout-button:focus {
		outline: 2px solid #6366f1;
		outline-offset: 2px;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.header-content {
			padding: 12px 16px;
		}

		.site-title {
			font-size: 16px;
		}
	}
</style>