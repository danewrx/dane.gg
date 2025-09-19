<script lang="ts">
	import { theme } from '$lib/stores/theme';
</script>

<svelte:head>
	<title>Projects - dane.gg</title>
	<meta name="description" content="Explore Dane's portfolio of software projects and designs." />
</svelte:head>

<div class="page-content">
	<h1>My Projects</h1>
	<p class="subtitle">A showcase of my work</p>
	
	<div class="projects-grid">
		<div class="project-card">
			<h3>Portfolio Website</h3>
			<p>This very website! Built with SvelteKit and TypeScript.</p>
			<div class="project-tech">
				<span class="tech-tag">SvelteKit</span>
				<span class="tech-tag">TypeScript</span>
				<span class="tech-tag">CSS</span>
			</div>
		</div>
		
		<div class="project-card">
			<h3>Task Management App</h3>
			<p>A full-stack application for managing tasks and projects.</p>
			<div class="project-tech">
				<span class="tech-tag">React</span>
				<span class="tech-tag">Node.js</span>
				<span class="tech-tag">PostgreSQL</span>
			</div>
		</div>
		
		<div class="project-card">
			<h3>Weather Dashboard</h3>
			<p>Beautiful weather dashboard with interactive charts.</p>
			<div class="project-tech">
				<span class="tech-tag">Vue.js</span>
				<span class="tech-tag">Chart.js</span>
				<span class="tech-tag">API</span>
			</div>
		</div>
	</div>
</div>

<style>
	.page-content {
		max-width: 800px;
		margin: 0 auto;
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1rem;
		text-align: center;
	}

	.subtitle {
		font-size: 1.2rem;
		color: var(--text-secondary);
		margin-bottom: 2rem;
		text-align: center;
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.project-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1.5rem;
		transition: all 0.3s ease;
	}

	.project-card:hover {
		background: var(--bg-hover);
		border-color: var(--accent-color);
		transform: translateY(-2px);
	}

	.project-card h3 {
		color: var(--accent-color);
		margin-bottom: 1rem;
		font-size: 1.3rem;
	}

	.project-card p {
		color: var(--text-secondary);
		line-height: 1.6;
		margin-bottom: 1rem;
	}

	.project-tech {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tech-tag {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 500;
	}
</style>
