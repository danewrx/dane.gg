<script lang="ts">
	import { theme } from '$lib/stores/theme';
</script>

<svelte:head>
	<title>dane.gg - Software Engineer & Designer</title>
</svelte:head>

<div class="home-content">
	<h1>Welcome to dane.gg</h1>
	<p class="subtitle">Software Engineer & Designer</p>
	
	<div class="theme-demo">
		<h2>Theme Demo</h2>
		<p>Current theme: <strong>{$theme}</strong></p>
		<p>Click the theme toggle button in the top-right corner to switch between light and dark modes!</p>
		
		<div class="demo-cards">
			<div class="demo-card">
				<h3>Card 1</h3>
				<p>This card demonstrates the theme colors and styling.</p>
			</div>
			<div class="demo-card">
				<h3>Card 2</h3>
				<p>All colors automatically adapt to the selected theme.</p>
			</div>
			<div class="demo-card">
				<h3>Card 3</h3>
				<p>The theme preference is saved in localStorage.</p>
			</div>
		</div>
	</div>
</div>

<style>
	.home-content {
		text-align: center;
		max-width: 800px;
		margin: 0 auto;
	}

	h1 {
		font-size: 3rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1rem;
		transition: color 0.3s ease;
	}

	.subtitle {
		font-size: 1.5rem;
		color: var(--text-secondary);
		margin-bottom: 3rem;
		transition: color 0.3s ease;
	}

	.theme-demo {
		text-align: left;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 2rem;
		margin-top: 2rem;
		transition: all 0.3s ease;
	}

	.theme-demo h2 {
		color: var(--text-primary);
		margin-bottom: 1rem;
		transition: color 0.3s ease;
	}

	.theme-demo p {
		color: var(--text-secondary);
		margin-bottom: 1rem;
		transition: color 0.3s ease;
	}

	.demo-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-top: 2rem;
	}

	.demo-card {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1.5rem;
		transition: all 0.3s ease;
	}

	.demo-card:hover {
		background: var(--bg-hover);
		border-color: var(--accent-color);
		transform: translateY(-2px);
	}

	.demo-card h3 {
		color: var(--accent-color);
		margin-bottom: 0.5rem;
		transition: color 0.3s ease;
	}

	.demo-card p {
		color: var(--text-secondary);
		font-size: 0.9rem;
		transition: color 0.3s ease;
	}

	@media (max-width: 768px) {
		h1 {
			font-size: 2rem;
		}
		
		.subtitle {
			font-size: 1.2rem;
		}
		
		.theme-demo {
			padding: 1.5rem;
		}
		
		.demo-cards {
			grid-template-columns: 1fr;
		}
	}
</style>
