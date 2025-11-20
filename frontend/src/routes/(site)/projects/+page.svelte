<script lang="ts">
	import { onMount } from 'svelte';
	import { ExternalLink, Github } from 'lucide-svelte';

	interface ProjectTag {
		id: string;
		title: string;
		color: string;
		categoryId: string | null;
		category: {
			id: string;
			name: string;
			createdAt: string;
		} | null;
	}

	interface Project {
		id: string;
		title: string;
		description: string;
		featured: boolean;
		imageUrl: string | null;
		active: string;
		projectUrl: string | null;
		projectText: string;
		repoUrl: string | null;
		repoText: string;
		displayOrder: number;
		createdAt: string;
		updatedAt: string;
		tags: ProjectTag[];
	}

	interface CategoryGroup {
		category: {
			id: string;
			name: string;
			createdAt: string;
		};
		projects: Project[];
	}

	let categories = $state<CategoryGroup[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		await loadProjects();
	});

	async function loadProjects() {
		try {
			loading = true;
			error = '';
			const response = await fetch('/api/projects');
			
			if (!response.ok) {
				throw new Error('Failed to load projects');
			}

			const result = await response.json();
			const allCategories: CategoryGroup[] = result.data || [];

			// Filter projects based on business logic
			const filteredCategories = allCategories
				.map(categoryGroup => {
					// Count total projects in category
					const totalProjects = categoryGroup.projects.length;

					// Filter projects: show if featured OR if only one project in category
					const visibleProjects = categoryGroup.projects.filter(project => {
						if (totalProjects === 1) {
							// Show the only project regardless of featured flag
							return true;
						}
						// Show only featured projects
						return project.featured === true;
					});

					return {
						...categoryGroup,
						projects: visibleProjects
					};
				})
				// Remove categories with no visible projects
				.filter(categoryGroup => categoryGroup.projects.length > 0);

			categories = filteredCategories;
		} catch (err) {
			console.error('Error loading projects:', err);
			error = 'Failed to load projects';
		} finally {
			loading = false;
		}
	}

	function getImageUrl(imageUrl: string | null): string {
		if (!imageUrl) return '';
		
		// If it's an external URL, return as-is
		if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
			return imageUrl;
		}
		
		// If it's a local upload, serve through API
		if (imageUrl.startsWith('/uploads/')) {
			const filename = imageUrl.replace('/uploads/', '');
			return `/api/upload/file/${filename}`;
		}
		
		return imageUrl;
	}
</script>

<svelte:head>
	<title>Projects - dane.gg</title>
	<meta name="description" content="Explore Dane's portfolio of software projects and designs." />
</svelte:head>

<div class="page-content">
	{#if loading}
		<div class="loading">
			<p>Loading projects...</p>
		</div>
	{:else if error}
		<div class="error">
			<p>{error}</p>
		</div>
	{:else if categories.length === 0}
		<div class="empty">
			<p>No projects available at the moment.</p>
		</div>
	{:else}
		{#each categories as categoryGroup (categoryGroup.category.id)}
			<section class="category-section">
				<div class="category-header">
					<h2 class="category-title">{categoryGroup.category.name}</h2>
				</div>
				
				<div class="projects-grid">
					{#each categoryGroup.projects as project (project.id)}
						<article class="project-card">
							{#if project.imageUrl}
								<div class="project-image">
									<img 
										src={getImageUrl(project.imageUrl)} 
										alt={project.title}
										loading="lazy"
									/>
								</div>
							{/if}
							
							<div class="project-content">
								<h3 class="project-title">{project.title}</h3>
								
								{#if project.tags && project.tags.length > 0}
									<div class="project-tags">
										{#each project.tags as tag (tag.id)}
											<span 
												class="tag" 
												style="background-color: {tag.color}20; color: {tag.color}; border-color: {tag.color}40;"
											>
												{tag.title}
											</span>
										{/each}
									</div>
								{/if}
								
								<p class="project-description">{project.description}</p>
								
								<div class="project-actions">
									{#if project.projectUrl}
										<a 
											href={project.projectUrl} 
											target="_blank" 
											rel="noopener noreferrer"
											class="action-button"
										>
											<ExternalLink size={16} />
											{project.projectText || 'Visit Website'}
										</a>
									{/if}
									
									{#if project.repoUrl}
										<a 
											href={project.repoUrl} 
											target="_blank" 
											rel="noopener noreferrer"
											class="action-button"
										>
											<Github size={16} />
											{project.repoText || 'View on GitHub'}
										</a>
									{/if}
								</div>
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/each}
	{/if}
</div>

<style>
	.page-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.loading,
	.error,
	.empty {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--text-secondary);
	}

	.category-section {
		margin-bottom: 4rem;
	}

	.category-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--border-color);
	}

	.category-title {
		font-size: 2rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 2rem;
	}

	.project-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		overflow: hidden;
		transition: all 0.3s ease;
		display: flex;
		flex-direction: column;
	}

	.project-card:hover {
		border-color: var(--accent-color);
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
	}

	.project-image {
		width: 100%;
		height: 200px;
		overflow: hidden;
		background: var(--bg-tertiary);
		position: relative;
	}

	.project-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.project-content {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 1rem;
	}

	.project-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		line-height: 1.2;
	}

	.project-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tag {
		padding: 0.375rem 0.75rem;
		border-radius: 16px;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid;
		display: inline-block;
	}

	.project-description {
		color: var(--text-secondary);
		line-height: 1.6;
		margin: 0;
		flex: 1;
		white-space: pre-line;
	}

	.project-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: auto;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.action-button:hover {
		background: var(--accent-color);
		color: var(--accent-color-contrast, #ffffff);
		border-color: var(--accent-color);
	}

	.action-button svg {
		flex-shrink: 0;
	}

	@media (max-width: 768px) {
		.projects-grid {
			grid-template-columns: 1fr;
		}

		.category-title {
			font-size: 1.75rem;
		}

		.project-content {
			padding: 1.25rem;
		}
	}
</style>
