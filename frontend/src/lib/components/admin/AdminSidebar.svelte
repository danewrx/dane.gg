<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { LayoutDashboard, FileText, FolderOpen, Users, User } from 'lucide-svelte';

	let { isCollapsed = false } = $props();

	// Navigation items matching the image exactly
	const navItems = [
		{
			id: 'dashboard',
			label: 'Dashboard',
			icon: LayoutDashboard,
			path: '/admin'
		},
		{
			id: 'blog-posts',
			label: 'Blog Posts',
			icon: FileText,
			path: '/admin/blog'
		},
		{
			id: 'projects',
			label: 'Projects',
			icon: FolderOpen,
			path: '/admin/projects'
		},
		{
			id: 'users',
			label: 'Users',
			icon: Users,
			path: '/admin/users'
		}
	];

	// Account item (separate from main nav)
	const accountItem = {
		id: 'account',
		label: 'Account',
		icon: User,
		path: '/admin/account'
	};

	// Check if a nav item is active
	function isActive(path: string): boolean {
		return $page.url.pathname === path;
	}

	// Handle navigation
	function handleNavigation(path: string) {
		goto(path);
	}
</script>

<aside class="sidebar" class:collapsed={isCollapsed}>
	<nav class="sidebar-nav">
		<ul class="nav-list">
			{#each navItems as item (item.id)}
				<li class="nav-item">
					<button
						class="nav-link"
						class:active={isActive(item.path)}
						onclick={() => handleNavigation(item.path)}
						aria-current={isActive(item.path) ? 'page' : undefined}
						title={isCollapsed ? item.label : undefined}
					>
						{#if item.icon === LayoutDashboard}
							<LayoutDashboard size={20} />
						{:else if item.icon === FileText}
							<FileText size={20} />
						{:else if item.icon === FolderOpen}
							<FolderOpen size={20} />
						{:else if item.icon === Users}
							<Users size={20} />
						{/if}
						{#if !isCollapsed}
							<span class="nav-label">{item.label}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
		
		<!-- Account section at bottom -->
		<div class="account-section">
			<button
				class="nav-link account-link"
				class:active={isActive(accountItem.path)}
				onclick={() => handleNavigation(accountItem.path)}
				aria-current={isActive(accountItem.path) ? 'page' : undefined}
				title={isCollapsed ? accountItem.label : undefined}
			>
				<User size={20} />
				{#if !isCollapsed}
					<span class="nav-label">{accountItem.label}</span>
				{/if}
			</button>
		</div>
	</nav>
</aside>

<style>
	.sidebar {
		width: 240px;
		background: #1a1a1a;
		color: #ffffff;
		overflow-y: auto;
		z-index: 999;
		transition: width 0.3s ease;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		min-height: 100%;
		border-right: 1px solid #2a2a2a;
	}

	.sidebar.collapsed {
		width: 60px;
	}

	.sidebar-nav {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 0;
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
		flex: 1;
	}

	.nav-item {
		margin: 0;
		padding: 0;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 20px;
		background: none;
		border: none;
		color: #ffffff;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.2s ease;
		font-size: 14px;
		font-weight: 400;
		white-space: nowrap;
		position: relative;
	}

	.nav-link:hover {
		background: #2a2a2a;
	}

	.nav-link.active {
		background: #3a3a3a;
		color: #ffffff;
	}

	.nav-link:focus {
		outline: 2px solid #6366f1;
		outline-offset: -2px;
	}

	.nav-label {
		font-size: 14px;
		font-weight: 400;
		opacity: 1;
		transition: opacity 0.3s ease;
	}

	.sidebar.collapsed .nav-label {
		opacity: 0;
		width: 0;
		overflow: hidden;
	}

	.sidebar.collapsed .nav-link {
		justify-content: center;
		padding: 12px;
	}

	.account-section {
		margin-top: auto;
		padding: 20px 0;
		border-top: 1px solid #2a2a2a;
	}

	.account-link {
		margin: 0 20px;
		padding: 12px;
		border-radius: 0;
	}

	.sidebar.collapsed .account-link {
		margin: 0;
		padding: 12px;
		justify-content: center;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.sidebar {
			width: 100%;
			height: auto;
		}

		.sidebar.collapsed {
			width: 100%;
		}

		.nav-list {
			display: flex;
			overflow-x: auto;
		}

		.nav-item {
			flex-shrink: 0;
		}

		.nav-link {
			padding: 12px 16px;
			min-width: 120px;
			justify-content: center;
		}

		.account-section {
			display: none;
		}
	}
</style>
