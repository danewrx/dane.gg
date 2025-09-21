<script lang="ts">
	// Public site homepage
</script>

<svelte:head>
	<title>dane.gg - Software Engineer & Designer</title>
</svelte:head>

<div class="home-content">
	<h1>Welcome to dane.gg</h1>
	<p class="subtitle">Software Engineer & Designer</p>
	
	<div class="intro-section">
		<h2>Welcome to my digital space</h2>
		<p>I'm a software engineer and designer passionate about creating beautiful, functional web applications and user experiences.</p>
		
		<div class="feature-cards">
			<div class="feature-card">
				<h3>Development</h3>
				<p>Full-stack web development with modern technologies and best practices.</p>
			</div>
			<div class="feature-card">
				<h3>Design</h3>
				<p>User-centered design focusing on usability and aesthetic excellence.</p>
			</div>
			<div class="feature-card">
				<h3>Innovation</h3>
				<p>Always exploring new technologies and creative solutions to complex problems.</p>
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

	.intro-section {
		text-align: left;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 2rem;
		margin-top: 2rem;
	}

	.intro-section h2 {
		color: var(--text-primary);
		margin-bottom: 1rem;
		font-size: 1.8rem;
	}

	.intro-section p {
		color: var(--text-secondary);
		margin-bottom: 1rem;
		line-height: 1.6;
	}

	.feature-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-top: 2rem;
	}

	.feature-card {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1.5rem;
		transition: all 0.3s ease;
	}

	.feature-card:hover {
		background: var(--bg-hover);
		border-color: var(--accent-color);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px var(--shadow);
	}

	.feature-card h3 {
		color: var(--accent-color);
		margin-bottom: 0.5rem;
		font-size: 1.2rem;
	}

	.feature-card p {
		color: var(--text-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	@media (max-width: 768px) {
		h1 {
			font-size: 2rem;
		}
		
		.subtitle {
			font-size: 1.2rem;
		}
		
		.intro-section {
			padding: 1.5rem;
		}
		
		.feature-cards {
			grid-template-columns: 1fr;
		}
	}
</style>
