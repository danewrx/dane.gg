<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const navigation = [
		{ name: 'Home', path: '/' },
		{ name: 'About', path: '/about' },
		{ name: 'Projects', path: '/projects' },
		{ name: 'Blog', path: '/blog' },
		{ name: 'Contact', path: '/contact' }
	];

	// Check if a link is active
	function isActive(path: string): boolean {
		if (path === '/') {
			return $page.url.pathname === '/';
		}
		return $page.url.pathname.startsWith(path);
	}

	// Handle navigation
	function handleNavigation(path: string) {
		goto(path);
	}
</script>

<header class="header">
	<div class="ascii-container">
		<button 
			class="ascii-link" 
			onclick={() => handleNavigation('/')}
			aria-label="Go to homepage"
		>
			<div class="ascii-box">
				<pre>
　　　　 ／＞　 フ 
　　　　| 　_　 _|
 　　　／`ミ _x 彡
　 　 /　　　 　 |
　　 /　 ヽ　　 ﾉ
／￣|　　 |　|　|
|| (￣ヽ＿_ヽ_)_)
＼二つ 
				</pre>
				<pre>
     _                  
    | |                 
  __| | __ _ _ __   ___ 
 / _` |/ _` | '_ \ / _ \
| (_| | (_| | | | |  __/
 \__,_|\__,_|_| |_|\___|
				</pre>
			</div>
		</button>
	</div>
	
	<nav class="nav">
		<div class="nav-container">
			<ul class="nav-list">
				{#each navigation as item}
					<li class="nav-item">
						<button 
							class="nav-link" 
							class:active={isActive(item.path)}
							onclick={() => handleNavigation(item.path)}
						>
							{item.name}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</nav>
</header>

<style>
	.header {
		text-align: left;
		margin-bottom: 16px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--text-primary);
	}

	.ascii-container {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		flex-wrap: nowrap;
		margin-bottom: -20px;
		padding: 0;
	}

	.ascii-link {
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: none;
		padding: 0;
		outline: none;
		box-shadow: none;
	}

	.ascii-link:hover,
	.ascii-link:focus,
	.ascii-link:active {
		outline: none;
		box-shadow: none;
	}

	.ascii-link:hover .ascii-box pre {
		color: var(--accent-color) !important;
		animation: none !important;
		transition: color 0.3s ease;
	}

	.ascii-box {
		display: grid;
		grid-template-columns: 45% 55%;
		justify-content: center;
		align-items: center;
		white-space: pre;
		gap: 0;
		font-size: 0;
		width: fit-content;
		margin: 0 auto;
	}

	.ascii-box pre:first-child {
		margin: 0;
		padding: 0 15px 0 0;
		font-size: clamp(8px, 1vw, 16px);
		line-height: 1;
		animation: softColorCycle 10s ease-in-out infinite;
		display: inline-block;
		vertical-align: top;
		text-align: right;
		transition: color 0.3s ease;
		font-family: var(--ascii-font-family);
	}

	.ascii-box pre:last-child {
		margin: 0;
		padding: 0;
		font-size: clamp(8px, 1vw, 16px);
		line-height: 1;
		animation: softColorCycle 10s ease-in-out infinite;
		display: inline-block;
		vertical-align: top;
		text-align: left;
		transition: color 0.3s ease;
		font-family: var(--ascii-font-family);
	}

	@keyframes softColorCycle {
		0% { color: #ffd5d5; }
		20% { color: #c9ffd7; }
		40% { color: #c6e4ff; }
		60% { color: #d7c8ff; }
		80% { color: #ffcbcb; }
		100% { color: #ffd5d5; }
	}

	.nav {
		margin-top: 20px;
	}

	.nav-container {
		width: 100%;
	}

	.nav-list {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: 20px;
		flex-wrap: wrap;
		justify-content: flex-start;
	}

	.nav-item {
		margin: 0;
	}

	.nav-link {
		background: none;
		border: none;
		color: var(--text-primary);
		font-size: 14px;
		cursor: pointer;
		padding: 5px 0;
		text-decoration: none;
		transition: all 0.2s ease;
		position: relative;
	}

	.nav-link:hover {
		color: var(--accent-color);
		transform: translateY(-1px);
	}

	.nav-link.active {
		color: var(--accent-color);
		font-weight: 600;
	}

	.nav-link.active::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--accent-color);
		animation: slideIn 0.3s ease;
	}

	@keyframes slideIn {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.ascii-box {
			flex-direction: column;
			gap: 5px;
		}

		.ascii-cat,
		.ascii-text {
			font-size: clamp(6px, 2vw, 12px);
		}

		.nav-list {
			justify-content: flex-start;
			gap: 15px;
		}

		.nav-link {
			font-size: 12px;
		}
	}

	@media (max-width: 480px) {
		.nav-list {
			flex-direction: column;
			align-items: flex-start;
			gap: 10px;
		}
	}
</style>
