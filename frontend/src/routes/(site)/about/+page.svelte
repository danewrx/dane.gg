<script lang="ts">
	import { onMount } from 'svelte';
	import TypingHeader from '$lib/shared/components/TypingHeader.svelte';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import { marked } from 'marked';

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

	interface Certification {
		id: string;
		title: string;
		earned: string | null;
		endDate: string | null;
		isPresent: boolean;
		status: string;
		imageUrl: string | null;
		isExternal: boolean;
		displayOrder: number;
	}

	let skillCategories = $state<SkillCategory[]>([]);
	let isLoadingSkills = $state(true);
	let certifications = $state<Certification[]>([]);
	let isLoadingCerts = $state(true);
	let biographyContent = $state('');
	let isLoadingBiography = $state(true);

	onMount(async () => {
		updateCertsPerPage();
		
		if (typeof window !== 'undefined') {
			window.addEventListener('resize', updateCertsPerPage);
		}
		
		await Promise.all([loadSkills(), loadCertifications(), loadBiography()]);
		
		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('resize', updateCertsPerPage);
			}
		};
	});

	// Listen to select events when API is available
	$effect(() => {
		if (emblaApi) {
			emblaApi.on('select', onSelect);
			onSelect(); // Initial state
			
			return () => {
				if (emblaApi) {
					emblaApi.off('select', onSelect);
				}
			};
		}
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

	async function loadCertifications() {
		try {
			const response = await fetch('/api/certifications');
			if (response.ok) {
				const result = await response.json();
				certifications = result.data || [];
			}
		} catch (error) {
			console.error('Error loading certifications:', error);
		} finally {
			isLoadingCerts = false;
		}
	}

	async function loadBiography() {
		try {
			isLoadingBiography = true;
			const response = await fetch('/api/config/about_biography');
			
			if (response.ok) {
				const result = await response.json();
				if (result.data?.value) {
					biographyContent = await marked.parse(result.data.value);
				} else {
					biographyContent = '';
				}
			}
		} catch (error) {
			console.error('Error loading biography:', error);
			biographyContent = '';
		} finally {
			isLoadingBiography = false;
		}
	}

	function getImageUrl(path: string | null, isExternal: boolean): string {
		if (!path) return '';
		// If it's an external URL, just return it
		if (isExternal || path.startsWith('http://') || path.startsWith('https://')) {
			return path;
		}
		// If starts with /uploads/, serve through the API
		if (path.startsWith('/uploads/')) {
			const filename = path.replace('/uploads/', '');
			return `/api/upload/file/${filename}`;
		}
		return path;
	}

	// Embla Carousel setup
	let emblaApi: any;
	let canScrollPrev = $state(false);
	let canScrollNext = $state(false);

	// Update certsPerPage based on screen size
	let certsPerPage = $state(2);
	
	function updateCertsPerPage() {
		if (typeof window !== 'undefined') {
			certsPerPage = window.innerWidth <= 768 ? 1 : 2;
		}
	}

	// Embla options - loop requires enough slides to work properly
	let options = $derived({
		loop: certifications.length > certsPerPage,
		slidesToScroll: 1,
		align: 'start',
		dragFree: false,
		containScroll: certifications.length > certsPerPage ? false : 'trimSnaps'
	});

	function onInit(event: CustomEvent) {
		emblaApi = event.detail;
		if (emblaApi) {
			emblaApi.on('select', onSelect);
			emblaApi.on('reInit', onSelect);
			onSelect();
		}
	}

	function onSelect() {
		if (!emblaApi) {
			canScrollPrev = false;
			canScrollNext = false;
			return;
		}
		// When loop is enabled, buttons should always be enabled
		const isLooping = certifications.length > certsPerPage;
		if (isLooping) {
			canScrollPrev = true;
			canScrollNext = true;
		} else {
			canScrollPrev = emblaApi.canScrollPrev();
			canScrollNext = emblaApi.canScrollNext();
		}
	}

	function scrollPrev() {
		emblaApi?.scrollPrev();
	}

	function scrollNext() {
		emblaApi?.scrollNext();
	}
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
			{#if isLoadingBiography}
				<p>Loading...</p>
			{:else if biographyContent}
				{@html biographyContent}
			{:else}
				<p class="bio-empty">No data is available.</p>
			{/if}
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
		
		{#if isLoadingCerts}
			<div class="certifications-loading">
				<p>Loading certifications...</p>
			</div>
		{:else if certifications.length > 0}
			<div class="certifications-carousel">
				<button 
					class="carousel-nav prev" 
					onclick={scrollPrev}
					disabled={!canScrollPrev}
				>
					<ChevronLeft size={24} />
				</button>
				
				<div 
					class="embla" 
					use:emblaCarouselSvelte={{ options }}
					onemblaInit={onInit}
				>
					<div class="embla__container">
						{#each certifications as cert}
							<div class="embla__slide">
								<div class="certification-card">
									{#if cert.imageUrl}
										<div class="cert-badge">
											<img 
												src={getImageUrl(cert.imageUrl, cert.isExternal)} 
												alt={cert.title} 
												onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'} 
											/>
										</div>
									{/if}
									<h4 class="cert-name">{cert.title}</h4>
									<p class="cert-meta">
										{#if cert.earned}
											{#if cert.isPresent}
												{cert.earned} - Present
											{:else if cert.endDate}
												{cert.earned} - {cert.endDate}
											{:else}
												Earned {cert.earned}
											{/if}
											{#if cert.status && cert.status !== 'Active'}
												· {cert.status}
											{/if}
										{:else if cert.status}
											{cert.status}
										{/if}
									</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
				
				<button 
					class="carousel-nav next" 
					onclick={scrollNext}
					disabled={!canScrollNext}
				>
					<ChevronRight size={24} />
				</button>
			</div>
		{:else}
			<p class="no-certifications">No certifications to display.</p>
		{/if}
	</section>
</div>

<style>
	.page-content {
		width: 100%;
		padding: 0 0.5rem 2rem 0.5rem;
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

	.bio-content :global(p) {
		margin-bottom: 1rem;
	}

	.bio-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.bio-empty {
		color: var(--text-secondary, #a1a1aa);
		text-align: center;
		padding: 2rem 0;
		margin: 0;
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
		border: 1px solid var(--border-color, #ffffff);
		border-radius: 0;
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

	.certifications-loading,
	.no-certifications {
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
		gap: 1.5rem;
		background: transparent;
		border: 1px solid var(--border-color, #ffffff);
		padding: 2rem 1.5rem;
	}

	.carousel-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: var(--bg-primary, #141414);
		border: 1px solid var(--border-color, #ffffff);
		border-radius: 0;
		color: var(--text-primary, #ffffff);
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.carousel-nav:hover:not(:disabled) {
		background: var(--text-primary, #ffffff);
		color: var(--bg-primary, #141414);
		transform: scale(1.05);
	}

	.carousel-nav:active:not(:disabled) {
		transform: scale(0.95);
	}

	.carousel-nav:disabled {
		opacity: 0.3;
		cursor: not-allowed;
		border-color: var(--text-muted, #666);
	}

	.embla {
		flex: 1;
		overflow: hidden;
		position: relative;
	}

	.embla__container {
		display: flex;
	}

	.embla__slide {
		flex: 0 0 50%;
		min-width: 0;
		box-sizing: border-box;
		position: relative;
		padding: 0 1rem;
	}

	.certification-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.75rem;
		max-width: 250px;
		margin: 0 auto;
		width: 100%;
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

		.embla__slide {
			flex: 0 0 100%;
			padding: 0;
		}

		.certifications-carousel {
			flex-direction: row;
			gap: 1rem;
			padding: 1rem 0;
		}

		.carousel-nav {
			width: 40px;
			height: 40px;
		}

		.certification-card {
			max-width: 100%;
		}
	}
</style>
