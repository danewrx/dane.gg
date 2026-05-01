<script lang="ts">
	import { page } from '$app/stores';

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
</script>

<header class="header">
	<div class="ascii-container">
		<a
			href="/"
			class="ascii-link"
			aria-label="Go to homepage"
			data-sveltekit-preload-data="hover"
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
		</a>
	</div>

	<nav class="nav">
		<div class="nav-container">
			<ul id="dane-neko-nav-home" class="nav-list">
				{#each navigation as item}
					<li class="nav-item">
						<a
							href={item.path}
							class="nav-link"
							class:active={isActive(item.path)}
							data-sveltekit-preload-data="hover"
						>
							{item.name}
						</a>
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
		border-bottom: 2px solid var(--theme-border, var(--text-primary));
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
		color: inherit;
		cursor: pointer;
		text-decoration: none;
		padding: 0;
		outline: none;
		box-shadow: none;
		display: inline-block;
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
		font-size: clamp(
			calc(8px * var(--theme-font-scale, 1)),
			1vw,
			calc(16px * var(--theme-font-scale, 1))
		);
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
		font-size: clamp(
			calc(8px * var(--theme-font-scale, 1)),
			1vw,
			calc(16px * var(--theme-font-scale, 1))
		);
		line-height: 1;
		animation: softColorCycle 10s ease-in-out infinite;
		display: inline-block;
		vertical-align: top;
		text-align: left;
		transition: color 0.3s ease;
		font-family: var(--ascii-font-family);
	}

	@keyframes softColorCycle {
		0% {
			color: var(--theme-text-primary, #ffd5d5);
		}
		25% {
			color: var(--theme-accent, #c6e4ff);
		}
		50% {
			color: var(--theme-secondary, #d7c8ff);
		}
		75% {
			color: var(--theme-accent, #c6e4ff);
		}
		100% {
			color: var(--theme-text-primary, #ffd5d5);
		}
	}

	.nav {
		margin-top: 20px;
	}

	.nav-container {
		width: 100%;
		max-width: 100%;
		min-width: 0;
	}

	.nav-list {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
		padding-left: 6px;
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
		font-size: calc(14 * 1em / 14);
		cursor: pointer;
		padding: 5px 0;
		text-decoration: none;
		transition: all 0.2s ease;
		position: relative;
		display: inline-block;
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

		.ascii-box pre:first-child,
		.ascii-box pre:last-child {
			font-size: clamp(
				calc(6px * var(--theme-font-scale, 1)),
				2vw,
				calc(12px * var(--theme-font-scale, 1))
			);
		}

		.nav-container {
			overflow-x: auto;
			overflow-y: hidden;
			-webkit-overflow-scrolling: touch;
			overscroll-behavior-x: contain;
			scrollbar-width: thin;
		}

		.nav-container::-webkit-scrollbar {
			height: 4px;
		}

		.nav-container::-webkit-scrollbar-thumb {
			background: color-mix(in srgb, var(--theme-border, #fff) 35%, transparent);
			border-radius: 4px;
		}

		.nav-list {
			justify-content: flex-start;
			flex-wrap: nowrap;
			gap: clamp(8px, 2.5vw, 14px);
			padding-bottom: 4px;
			width: max-content;
			min-width: 100%;
		}

		.nav-link {
			font-size: calc(12 * 1em / 14);
			white-space: nowrap;
			flex-shrink: 0;
		}
	}

	@media (max-width: 380px) {
		.nav-list {
			gap: 6px;
		}

		.nav-link {
			font-size: calc(11 * 1em / 14);
		}
	}
</style>
