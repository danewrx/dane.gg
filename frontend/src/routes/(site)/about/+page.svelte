<script lang="ts">
	import { onMount } from 'svelte';
	import TypingHeader from '$lib/shared/components/TypingHeader.svelte';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	interface Skill {
		id: string;
		name: string;
		level: number;
		categoryId: string;
		displayOrder: number;
	}

	interface SkillCategory {
		id: string;
		name: string;
		color: string;
		displayOrder: number;
		skills: Skill[];
	}

	let skillCategories = $state<SkillCategory[]>([]);
	let isLoadingSkills = $state(true);

	onMount(async () => {
		await loadSkills();
	});

	async function loadSkills() {
		try {
			const response = await fetch('/api/skills');
			if (response.ok) {
				const result = await response.json();
				skillCategories = result.data || [];
			}
		} catch (error) {
			console.error('Error loading skills:', error);
		} finally {
			isLoadingSkills = false;
		}
	}

	// Certifications data - placeholder for now
	const certifications = [
		{
			name: 'Microsoft Certified Trainer (MCT)',
			earned: '2021',
			status: 'Active',
			image: '/assets/certs/mct.png'
		},
		{
			name: 'Microsoft 365 Certified: Administrator Expert',
			earned: '2021',
			status: 'Active',
			image: '/assets/certs/ms365-admin.png'
		},
		{
			name: 'Azure Solutions Architect Expert',
			earned: '2022',
			status: 'Active',
			image: '/assets/certs/azure-architect.png'
		}
	];

	let currentCertIndex = $state(0);
	const certsPerPage = 2;

	function nextCerts() {
		if (currentCertIndex + certsPerPage < certifications.length) {
			currentCertIndex += certsPerPage;
		}
	}

	function prevCerts() {
		if (currentCertIndex > 0) {
			currentCertIndex -= certsPerPage;
		}
	}

	let visibleCerts = $derived(
		certifications.slice(currentCertIndex, currentCertIndex + certsPerPage)
	);
</script>

<svelte:head>
	<title>About - dane.gg</title>
	<meta name="description" content="Learn more about Dane, a software engineer & designer from Manchester, UK." />
</svelte:head>

<TypingHeader text="About" />

<div class="page-content">
	<!-- About Me Section -->
	<section class="about-section">
		<h2 class="section-title">About Me</h2>
		<div class="bio-content">
			<p>
				I'm a software engineer based in Manchester, currently working for a UK-based Managed Service Provider (MSP), where I've been involved in delivering complex development and infrastructure solutions for various large organizations. My main focus is backend development, but I'm also skilled in frontend technologies, making me a versatile developer across the stack. While C# is my primary language, I'm also proficient in JavaScript, TypeScript, and Python, which allows me to tackle a wide range of projects.
			</p>
			<p>
				Professionally, I specialize in building scalable, reliable systems. I have strong expertise in DevOps practices and infrastructure tools like Docker, Kubernetes, and Terraform, which I use to create efficient, automated workflows. I also have extensive experience with cloud platforms such as Azure, AWS, and Cloudflare, as well as server management in both Linux and Windows Server environments. From designing deployment pipelines to implementing CI/CD workflows, I'm passionate about driving end-to-end system automation to enhance operational efficiency and consistency.
			</p>
			<p>
				In addition to my development work, I have a solid background in Tier 3 support desk engineering, where I've troubleshooted and resolved complex issues for users and systems. I also have hands-on experience with Microsoft Intune, managing mobile devices and configuring modern workplace solutions. This blend of support and development experience gives me a unique ability to understand both the technical and user-facing aspects of systems, ensuring a well-rounded approach to problem-solving.
			</p>
			<p>
				Beyond the technical side of things, I also enjoy expressing my creativity through graphic design and 3D modeling. I'm an avid fan of anime, gaming, DJing, and VR—activities that help me unwind and stay inspired.
			</p>
			<p>
				This is my personal website where I showcase some of the side projects I'm working on, as well as write about my life, technology, development, and anything else that sparks my interest!
			</p>
		</div>
	</section>

	<!-- Skills Section -->
	<section class="skills-section">
		<h2 class="section-title">Skills</h2>
		{#if isLoadingSkills}
			<div class="skills-loading">
				<p>Loading skills...</p>
			</div>
		{:else if skillCategories.length > 0}
			<div class="skills-grid">
				{#each skillCategories as category (category.id)}
					<div class="skill-card">
						<h3 class="skill-category">{category.name}</h3>
						<div class="skill-list">
							{#each category.skills as skill (skill.id)}
								<div class="skill-item">
									<span class="skill-name">{skill.name}</span>
									<div class="skill-bar">
										<div 
											class="skill-fill" 
											style="width: {skill.level}%; background: {category.color || '#6366f1'}"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="no-skills">No skills to display.</p>
		{/if}
	</section>

	<!-- Certifications Section -->
	<section class="certifications-section">
		<h2 class="section-title">Certifications</h2>
		<p class="section-subtitle">Here are some of the active certifications which I hold across various different technologies:</p>
		
		<div class="certifications-carousel">
			<button 
				class="carousel-nav prev" 
				onclick={prevCerts}
				disabled={currentCertIndex === 0}
			>
				<ChevronLeft size={24} />
			</button>
			
			<div class="certifications-container">
				{#each visibleCerts as cert}
					<div class="certification-card">
						<div class="cert-badge">
							<img src={cert.image} alt={cert.name} onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'} />
						</div>
						<h4 class="cert-name">{cert.name}</h4>
						<p class="cert-meta">Earned {cert.earned} · {cert.status}</p>
					</div>
				{/each}
			</div>
			
			<button 
				class="carousel-nav next" 
				onclick={nextCerts}
				disabled={currentCertIndex + certsPerPage >= certifications.length}
			>
				<ChevronRight size={24} />
			</button>
		</div>
	</section>
</div>

<style>
	.page-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem 2rem 1rem;
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin-bottom: 1rem;
	}

	.section-subtitle {
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		margin-bottom: 1.5rem;
	}

	/* About Me Section */
	.about-section {
		margin-bottom: 3rem;
	}

	.bio-content {
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		line-height: 1.7;
	}

	.bio-content p {
		margin-bottom: 1rem;
	}

	.bio-content p:last-child {
		margin-bottom: 0;
	}

	/* Skills Section */
	.skills-section {
		margin-bottom: 3rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.skills-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
	}

	.skill-card {
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 1.25rem;
	}

	.skill-category {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin-bottom: 1rem;
	}

	.skill-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skill-item {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.skill-name {
		width: 120px;
		flex-shrink: 0;
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
	}

	.skill-bar {
		flex: 1;
		height: 12px;
		background: var(--bg-tertiary, #2a2a2a);
		border-radius: 6px;
		overflow: hidden;
	}

	.skill-fill {
		height: 100%;
		border-radius: 6px;
		transition: width 0.5s ease;
	}

	.skills-loading,
	.no-skills {
		text-align: center;
		color: var(--text-secondary, #a1a1aa);
		padding: 2rem;
	}

	/* Certifications Section */
	.certifications-section {
		padding-top: 2rem;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.certifications-carousel {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: var(--bg-secondary, #1f1f1f);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 2rem 1rem;
	}

	.carousel-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--bg-tertiary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.carousel-nav:hover:not(:disabled) {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.carousel-nav:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.certifications-container {
		flex: 1;
		display: flex;
		justify-content: center;
		gap: 4rem;
	}

	.certification-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.75rem;
	}

	.cert-badge {
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cert-badge img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.cert-name {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		max-width: 200px;
	}

	.cert-meta {
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.skills-grid {
			grid-template-columns: 1fr;
		}

		.skill-name {
			width: 100px;
		}

		.certifications-container {
			flex-direction: column;
			gap: 2rem;
		}

		.certifications-carousel {
			flex-direction: column;
			padding: 1.5rem;
		}

		.carousel-nav {
			display: none;
		}
	}
</style>
