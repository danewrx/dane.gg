<script lang="ts">
	import { page } from '$app/stores';
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

	interface CategoryData {
		category: {
			id: string;
			name: string;
			displayOrder: number;
			createdAt: string;
		};
		projects: Project[];
	}

	let categoryData = $state<CategoryData | null>(null);
	let loading = $state(true);
	let error = $state('');

	$effect(() => {
		const categoryId = $page.params.categoryId;
		if (categoryId) {
			loadCategoryProjects(categoryId);
		}
	});

	async function loadCategoryProjects(categoryId: string) {
		try {
			loading = true;
			error = '';
			const response = await fetch(`/api/projects/category/${categoryId}`);
			
			if (!response.ok) {
				if (response.status === 404) {
					throw new Error('Category not found');
				}
				throw new Error('Failed to load projects');
			}

			const result = await response.json();
			categoryData = result.data || null;
		} catch (err) {
			console.error('Error loading category projects:', err);
			error = err instanceof Error ? err.message : 'Failed to load projects';
		} finally {
			loading = false;
		}
	}

	function getImageUrl(imageUrl: string | null): string {
		if (!imageUrl) return '';
		
		// If it's an external URL, return
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
	<title>{categoryData?.category.name || 'Projects'} - dane.gg</title>
	<meta name="description" content="Explore {categoryData?.category.name || 'projects'} from Dane's portfolio." />
</svelte:head>

<div class="header-wrapper">
	<TypingHeader text={categoryData?.category.name || 'Projects'} />
	<a href="/projects" class="back-link">
		<span class="back-arrow">←</span>
		<span class="back-text">Back to Projects</span>
	</a>
</div>

<div class="page-content">

	{#if loading}
		<div class="loading">
			<p>Loading projects...</p>
		</div>
	{:else if error}
		<div class="error">
			<p>{error}</p>
			<a href="/projects" class="back-link">← Back to Projects</a>
		</div>
	{:else if !categoryData || categoryData.projects.length === 0}
		<div class="empty">
			<p>No projects available in this category.</p>
			<a href="/projects" class="back-link">← Back to Projects</a>
		</div>
	{:else}
		
		<div class="projects-grid">
			{#each categoryData.projects as project (project.id)}
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
		color: var(--theme-text-secondary, #a1a1aa);
	}

	.header-wrapper {
		position: relative;
		margin-bottom: 24px;
	}

	.back-link {
		position: absolute;
		top: 0;
		left: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--theme-text-secondary, #a1a1aa);
		text-decoration: none;
		font-size: calc(0.75 * 16 * 1em / 14);
		font-weight: 500;
		transition: all 0.2s ease;
		z-index: 1;
		padding: 0.5rem 0.75rem;
		border-radius: 4px 0 0 0;
		background: var(--theme-background, rgba(0, 0, 0, 0.3));
		border-right: 1px solid var(--theme-border, #ffffff);
		border-bottom: 1px solid var(--theme-border, #ffffff);
	}

	.back-link:hover {
		color: var(--theme-accent, #6366f1);
		background: color-mix(in srgb, var(--theme-accent, #6366f1) 10%, transparent);
	}

	.back-link:hover .back-arrow {
		transform: translateX(-2px);
	}

	.back-arrow {
		font-size: calc(0.875 * 16 * 1em / 14);
		transition: transform 0.2s ease;
	}

	.back-text {
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-size: calc(0.7 * 16 * 1em / 14);
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 2rem;
		align-items: start;
	}

	.project-card {
		background: var(--theme-surface, #1a1a1a);
		border: 1px solid var(--theme-border, #ffffff);
		border-radius: 0;
		overflow: hidden;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
	}

	.project-card:hover {
		border-color: var(--theme-accent, #6366f1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.project-image {
		width: 100%;
		overflow: hidden;
		background: var(--theme-background, #0a0a0a);
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
		font-size: calc(1.5 * 16 * 1em / 14);
		font-weight: 700;
		color: var(--theme-text-primary, #ffffff);
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
		background: var(--theme-background, #0a0a0a);
		border: 1px solid var(--theme-border, #ffffff);
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
		font-size: calc(0.75 * 16 * 1em / 14);
		font-weight: 500;
		color: var(--theme-text-secondary, #a1a1aa);
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
		font-size: calc(0.7 * 16 * 1em / 14);
		font-weight: 500;
		border: 1px solid;
		display: inline-block;
		line-height: 1.2;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.project-description {
		color: var(--theme-text-secondary, #a1a1aa);
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
		border-top: 1px solid var(--theme-border, #ffffff);
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: var(--theme-background, #0a0a0a);
		color: var(--theme-text-primary, #ffffff);
		border: 1px solid var(--theme-border, #ffffff);
		border-radius: 0;
		text-decoration: none;
		font-size: calc(0.875 * 16 * 1em / 14);
		font-weight: 500;
		transition: all 0.2s ease;
		flex: 1;
		min-width: 0;
	}

	.action-button:hover {
		background: var(--theme-surface, #1a1a1a);
		border-color: var(--theme-accent, #6366f1);
		color: var(--theme-accent, #6366f1);
	}

	.action-button svg,
	.action-button img {
		flex-shrink: 0;
	}

	.action-button .text-icon {
		font-size: calc(12 * 1em / 14);
		font-weight: 600;
		line-height: 1;
	}

	@media (max-width: 768px) {
		.projects-grid {
			grid-template-columns: 1fr;
		}

		.project-content {
			padding: 1.25rem;
		}

		.project-title {
			font-size: calc(1.25 * 16 * 1em / 14);
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
			font-size: calc(1.125 * 16 * 1em / 14);
		}

		.project-header {
			gap: 0.75rem;
		}

		.project-content {
			padding: 1rem;
		}
	}

</style>

