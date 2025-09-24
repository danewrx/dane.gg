<script lang="ts">
	import DiscordStatus from '$lib/site/components/widgets/DiscordStatus.svelte';
	import BorderedBox from '$lib/site/components/ui/BorderedBox.svelte';
	
	// Public site homepage
</script>

<svelte:head>
	<title>dane.gg - Software Engineer & Designer</title>
</svelte:head>

<div class="home-content">
	<!-- Two Column Layout -->
	<div class="two-column-layout">
		<!-- Left Column (30%) -->
		<div class="left-column">
			<div class="widgets-section">
				<BorderedBox padding="12px 16px" className="discord-widget">
					<DiscordStatus />
				</BorderedBox>
			</div>
		</div>
		
		<!-- Right Column (70%) -->
		<div class="right-column">
			<BorderedBox padding="24px" className="intro-section">
				<h2>Welcome to my digital space</h2>
				<p>I'm a software engineer and designer passionate about creating beautiful, functional web applications and user experiences.</p>
				
				<div class="feature-cards">
					<BorderedBox padding="16px" className="feature-card">
						<h3>Development</h3>
						<p>Full-stack web development with modern technologies and best practices.</p>
					</BorderedBox>
					
					<BorderedBox padding="16px" className="feature-card">
						<h3>Design</h3>
						<p>User-centered design focusing on usability and aesthetic excellence.</p>
					</BorderedBox>
					
					<BorderedBox padding="16px" className="feature-card">
						<h3>Innovation</h3>
						<p>Always exploring new technologies and creative solutions to complex problems.</p>
					</BorderedBox>
				</div>
			</BorderedBox>
		</div>
	</div>
</div>

<style>
	.home-content {
		max-width: 1200px;
		margin: 0 auto;
	}

	h1 {
		font-size: 3rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1rem;
		transition: color 0.3s ease;
		text-align: center;
	}

	.subtitle {
		font-size: 1.5rem;
		color: var(--text-secondary);
		margin-bottom: 2rem;
		transition: color 0.3s ease;
		text-align: center;
	}

	.two-column-layout {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
	}

	.left-column {
		flex: 0 0 30%;
		min-width: 0;
	}

	.right-column {
		flex: 1;
		min-width: 0;
	}

	.widgets-section {
		margin-bottom: 0;
	}

	:global(.discord-widget) {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		min-height: 60px;
	}

	:global(.intro-section) {
		text-align: left;
	}

	:global(.intro-section h2) {
		color: var(--text-primary);
		margin-bottom: 1rem;
		font-size: 1.8rem;
	}

	:global(.intro-section p) {
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

	:global(.feature-card) {
		transition: all 0.3s ease;
	}

	:global(.feature-card:hover) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px var(--shadow);
	}

	:global(.feature-card h3) {
		color: var(--accent-color);
		margin-bottom: 0.5rem;
		font-size: 1.2rem;
	}

	:global(.feature-card p) {
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
		
		.two-column-layout {
			flex-direction: column;
			gap: 1.5rem;
		}
		
		.left-column {
			flex: none;
			width: 100%;
		}
		
		.right-column {
			flex: none;
			width: 100%;
		}
		
		:global(.discord-widget) {
			justify-content: center;
		}
		
		.feature-cards {
			grid-template-columns: 1fr;
		}
	}
</style>
