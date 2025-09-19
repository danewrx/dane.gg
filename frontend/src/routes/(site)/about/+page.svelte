<script lang="ts">
	import { theme } from '$lib/stores/theme';
</script>

<svelte:head>
	<title>About - dane.gg</title>
	<meta name="description" content="Learn more about Dane, a software engineer & designer from Manchester, UK." />
</svelte:head>

<div class="page-content">
	<h1>About Me</h1>
	<p class="subtitle">Software Engineer & Designer</p>
	
	<div class="content-section">
		<h2>Who I Am</h2>
		<p>Hi, I'm Dane! I'm a passionate software engineer and designer based in Manchester, UK.</p>
		
		<h2>What I Do</h2>
		<p>I specialize in creating beautiful, functional web applications and user experiences.</p>
		
		<h2>Skills</h2>
		<ul>
			<li>Frontend Development (React, Svelte, Vue.js)</li>
			<li>Backend Development (Node.js, Python, Go)</li>
			<li>Database Design (PostgreSQL, MongoDB)</li>
			<li>UI/UX Design</li>
			<li>DevOps & Cloud Infrastructure</li>
		</ul>
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

	.content-section {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 2rem;
		margin-bottom: 1rem;
	}

	.content-section h2 {
		color: var(--accent-color);
		margin-bottom: 1rem;
		font-size: 1.5rem;
	}

	.content-section p {
		color: var(--text-secondary);
		line-height: 1.6;
		margin-bottom: 1rem;
	}

	.content-section ul {
		color: var(--text-secondary);
		padding-left: 1.5rem;
	}

	.content-section li {
		margin-bottom: 0.5rem;
	}
</style>
