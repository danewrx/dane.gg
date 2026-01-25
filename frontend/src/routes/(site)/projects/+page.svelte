<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { getIconRenderInfo } from '$lib/site/utils/iconHelper';
	import { getProjectStatusColor } from '$lib/shared/constants/projectConstants';
	import TypingHeader from '$lib/shared/components/TypingHeader.svelte';
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
		projectIcon: string | null;
		repoUrl: string | null;
		repoText: string;
		repoIcon: string | null;
		displayOrder: number;
		createdAt: string;
		updatedAt: string;
		tags: ProjectTag[];
	}

	interface CategoryGroup {
		category: {
			id: string;
			name: string;
			displayOrder: number;
			createdAt: string;
		};
		projects: Project[];
		allFeatured?: boolean;
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

			// Filter projects: only show featured projects
			const filteredCategories = allCategories
				.map(categoryGroup => {
					const visibleProjects = categoryGroup.projects.filter(project => {
						return project.featured === true;
					});

					const allFeatured = categoryGroup.projects.length > 0 && 
						categoryGroup.projects.every(project => project.featured === true);

					return {
						...categoryGroup,
						projects: visibleProjects,
						allFeatured: allFeatured
					};
				})
				.filter(categoryGroup => categoryGroup.projects.length > 0)
				// Sort by category displayOrder
				.sort((a, b) => {
					const orderDiff = (a.category.displayOrder || 0) - (b.category.displayOrder || 0);
					if (orderDiff !== 0) return orderDiff;
					return b.projects.length - a.projects.length;
				});

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

<TypingHeader text="Projects" />

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
					{#if !categoryGroup.allFeatured}
						<a href="/projects/{categoryGroup.category.id}" class="view-all-link">View all →</a>
					{/if}
				</div>
				
				<div class="projects-grid-container">
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
								<div class="project-header">
									<h3 class="project-title">{project.title}</h3>
									<div class="project-status">
										<span class="status-indicator" style="background-color: {getProjectStatusColor(project.active)};"></span>
										<span class="status-text">{project.active}</span>
									</div>
								</div>
								
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
										{@const projectIconInfo = getIconRenderInfo(project.projectIcon)}
										<a 
											href={project.projectUrl} 
											target="_blank" 
											rel="noopener noreferrer"
											class="action-button"
										>
											{#if projectIconInfo.type === 'component' && projectIconInfo.component}
												{@const IconComponent = projectIconInfo.component}
												<IconComponent size={16} />
											{:else if projectIconInfo.type === 'iconify' && projectIconInfo.icon}
												<Icon icon={projectIconInfo.icon} width="16" height="16" />
											{:else if projectIconInfo.type === 'svg' && projectIconInfo.url}
												<img src={projectIconInfo.url} alt="Icon" width="16" height="16" />
											{:else if projectIconInfo.type === 'text' && projectIconInfo.text}
												<span class="text-icon">{projectIconInfo.text}</span>
											{:else}
												{#if projectIconInfo.component}
													{@const DefaultIcon = projectIconInfo.component}
													<DefaultIcon size={16} />
												{:else}
													<Icon icon="lucide:external-link" width="16" height="16" />
												{/if}
											{/if}
											{project.projectText || 'Visit Website'}
										</a>
									{/if}
									
									{#if project.repoUrl}
										{@const repoIconInfo = getIconRenderInfo(project.repoIcon)}
										<a 
											href={project.repoUrl} 
											target="_blank" 
											rel="noopener noreferrer"
											class="action-button"
										>
											{#if repoIconInfo.type === 'component' && repoIconInfo.component}
												{@const IconComponent = repoIconInfo.component}
												<IconComponent size={16} />
											{:else if repoIconInfo.type === 'iconify' && repoIconInfo.icon}
												<Icon icon={repoIconInfo.icon} width="16" height="16" />
											{:else if repoIconInfo.type === 'svg' && repoIconInfo.url}
												<img src={repoIconInfo.url} alt="Icon" width="16" height="16" />
											{:else if repoIconInfo.type === 'text' && repoIconInfo.text}
												<span class="text-icon">{repoIconInfo.text}</span>
											{:else}
												{#if repoIconInfo.component}
													{@const DefaultIcon = repoIconInfo.component}
													<DefaultIcon size={16} />
												{:else}
													<Icon icon="lucide:external-link" width="16" height="16" />
												{/if}
											{/if}
											{project.repoText || 'View on GitHub'}
										</a>
									{/if}
								</div>
							</div>
						</article>
					{/each}
					</div>
				</div>
			</section>
		{/each}
	{/if}
</div>

<style>
	.page-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 0.5rem 2rem 0.5rem;
	}

	.loading,
	.error,
	.empty {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--text-secondary);
	}

	.category-section {
		margin-bottom: 3rem;
	}

	.category-section:first-child {
		margin-top: 0;
	}

	.projects-grid-container {
		padding-bottom: 2rem;
	}

	.category-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
	}

	.category-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.view-all-link {
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.875rem;
		transition: color 0.2s ease;
		white-space: nowrap;
	}

	.view-all-link:hover {
		color: var(--accent-color);
	}

	.projects-grid {
		columns: 2;
		column-gap: 2rem;
		column-fill: balance;
	}

	.project-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 0;
		overflow: hidden;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		margin-bottom: 2rem;
		break-inside: avoid;
		page-break-inside: avoid;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
	}

	.project-card:hover {
		border-color: var(--accent-color);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.project-image {
		width: 100%;
		overflow: hidden;
		background: var(--bg-tertiary);
		position: relative;
		max-height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.project-image img {
		width: 100%;
		height: auto;
		max-height: 400px;
		display: block;
		object-fit: cover;
	}

	.project-content {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 1rem;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		overflow: hidden;
	}

	.project-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
		width: 100%;
		min-width: 0;
	}

	.project-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		line-height: 1.2;
		flex: 1;
		min-width: 0;
		max-width: 100%;
		width: 100%;
		word-wrap: break-word;
		overflow-wrap: break-word;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
		box-sizing: border-box;
	}

	.project-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
		padding: 0.25rem 0.75rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: 0;
		white-space: nowrap;
	}

	.status-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.status-text {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.project-tags {
		display: flex;
		flex-wrap: nowrap;
		gap: 0.375rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.project-tags::-webkit-scrollbar {
		display: none;
	}

	.tag {
		padding: 0.2rem 0.45rem;
		border-radius: 0;
		font-size: 0.7rem;
		font-weight: 500;
		border: 1px solid;
		display: inline-block;
		line-height: 1.2;
		white-space: nowrap;
		flex-shrink: 0;
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
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
		border-radius: 0;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		flex: 1;
		min-width: 0;
	}

	.action-button:hover {
		background: var(--bg-hover);
		border-color: var(--accent-color);
		color: var(--accent-color);
	}

	.action-button svg,
	.action-button img {
		flex-shrink: 0;
	}

	.action-button .text-icon {
		font-size: 12px;
		font-weight: 600;
		line-height: 1;
	}

	@media (max-width: 768px) {
		.projects-grid {
			columns: 1;
		}

		.category-title {
			font-size: 1.375rem;
		}

		.project-content {
			padding: 1.25rem;
		}

		.project-title {
			font-size: 1.25rem;
		}

		.project-header {
			flex-direction: column;
			align-items: flex-start;
			width: 100%;
		}

		.project-status {
			align-self: flex-start;
		}
	}

	@media (max-width: 480px) {
		.project-title {
			font-size: 1.125rem;
		}

		.project-header {
			gap: 0.75rem;
		}

		.project-content {
			padding: 1rem;
		}
	}


	@media (min-width: 769px) and (max-width: 1024px) {
		.projects-grid {
			columns: 2;
		}
	}

	@media (min-width: 1025px) {
		.projects-grid {
			columns: 2;
		}
	}
</style>
