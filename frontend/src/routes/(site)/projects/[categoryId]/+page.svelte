<script lang="ts">
	import OpenGraphTags from '$lib/site/components/seo/OpenGraphTags.svelte';
	import { publicPageTitle } from '$lib/site/pageTitle';

	import { navigating } from '$app/stores';
	import Icon from '@iconify/svelte';
	import { getIconRenderInfo } from '$lib/site/utils/iconHelper';
	import { getProjectStatusColor } from '$lib/shared/constants/projectConstants';
	import TypingHeader from '$lib/shared/components/TypingHeader.svelte';
	import RainbowText from '$lib/site/components/RainbowText.svelte';
	import SiteBackNav from '$lib/site/components/layout/SiteBackNav.svelte';
	import type { PageData } from './$types';

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
		descriptionHtml?: string;
		featured: boolean;
		imageUrl: string | null;
		active: string;
		projectUrl: string | null;
		projectText: string;
		projectIcon: string | null;
		repoUrl: string | null;
		repoText: string;
		repoIcon: string | null;
		logoUrl: string | null;
		logoBgColor: string | null;
		logoBorder: boolean;
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

	let { data }: { data: PageData } = $props();

	let categoryData = $derived(data.categoryData as CategoryData | null);

	const errorMessage = $derived(
		data.loadError === 'not_found'
			? 'Category not found'
			: data.loadError === 'server'
				? 'Failed to load projects'
				: ''
	);

	const showNavigating = $derived(
		Boolean($navigating?.to?.url?.pathname?.startsWith('/projects/'))
	);

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
	<title>{publicPageTitle(categoryData?.category.name || 'Projects')}</title>
</svelte:head>
{#if categoryData?.category}
	<OpenGraphTags
		title={publicPageTitle(categoryData.category.name)}
		description={`Explore ${categoryData.category.name} projects from my portfolio.`}
	/>
{/if}

<div class="category-hero">
	<div class="category-hero__toolbar">
		<SiteBackNav embedded href="/projects" label="Back to Projects" />
	</div>
	<TypingHeader text={categoryData?.category.name || 'Projects'} />
</div>

<div class="page-content">
	{#if showNavigating}
		<div class="loading">
			<p>Loading projects...</p>
		</div>
	{:else if data.loadError}
		<div class="error">
			<p>{errorMessage}</p>
			<SiteBackNav href="/projects" label="Back to Projects" />
		</div>
	{:else if !categoryData || categoryData.projects.length === 0}
		<div class="empty">
			<p>No projects available in this category.</p>
			<SiteBackNav href="/projects" label="Back to Projects" />
		</div>
	{:else}
		<div class="projects-grid">
			{#each categoryData.projects as project (project.id)}
				<article class="project-card">
					{#if project.imageUrl}
						<div class="project-image">
							<img src={getImageUrl(project.imageUrl)} alt={project.title} loading="lazy" />
						</div>
					{/if}

					<div class="project-content">
						<div class="project-header">
							{#if project.logoUrl}
								<div
									class="project-logo"
									class:project-logo--border={project.logoBorder}
									style={project.logoBgColor
										? `background-color: ${project.logoBgColor};`
										: ''}
								>
									<img
										src={getImageUrl(project.logoUrl)}
										alt="{project.title} logo"
										loading="lazy"
									/>
								</div>
							{/if}
							<h3 class="project-title">
								<RainbowText text={project.title} />
							</h3>
							<div class="project-status">
								<span
									class="status-indicator"
									style="background-color: {getProjectStatusColor(project.active)};"
								></span>
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

						<div class="project-description">
							{@html project.descriptionHtml ?? ''}
						</div>

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
									{:else if projectIconInfo.component}
										{@const DefaultIcon = projectIconInfo.component}
										<DefaultIcon size={16} />
									{:else}
										<Icon icon="lucide:external-link" width="16" height="16" />
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
									{:else if repoIconInfo.component}
										{@const DefaultIcon = repoIconInfo.component}
										<DefaultIcon size={16} />
									{:else}
										<Icon icon="lucide:external-link" width="16" height="16" />
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
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		text-align: center;
		padding: 3rem 1rem;
		color: var(--theme-text-secondary, #a1a1aa);
	}

	.category-hero {
		border: 1px solid var(--border-color, #4a4a4a);
		border-radius: 4px;
		background: var(--bg-secondary, #1a1a1a);
		margin-bottom: 24px;
		overflow: hidden;
	}

	.category-hero__toolbar {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		border-bottom: 1px solid var(--border-color, #4a4a4a);
		background: color-mix(in srgb, var(--theme-background, #0a0a0a) 55%, transparent);
	}

	.category-hero :global(.typing-header) {
		border: none;
		border-radius: 0;
		margin-bottom: 0;
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
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		width: 100%;
		min-width: 0;
	}

	.project-logo {
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		overflow: hidden;
	}

	.project-logo--border {
		border: 1px solid var(--theme-border, #ffffff);
	}

	.project-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}

	.project-title {
		font-size: calc(1.5 * 16 * 1em / 14);
		font-weight: 700;
		color: var(--theme-text-primary, #ffffff);
		margin: 0;
		line-height: 1.2;
		flex: 1;
		min-width: 0;
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
		margin-left: auto;
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
		font-size: calc(14 * 1em / 14);
	}

	.project-description :global(p) {
		margin: 0 0 0.5rem 0;
	}

	.project-description :global(p:last-child) {
		margin-bottom: 0;
	}

	.project-description :global(strong),
	.project-description :global(b) {
		font-weight: 700;
		color: var(--theme-text-primary, #ffffff);
	}

	.project-description :global(em),
	.project-description :global(i) {
		font-style: italic;
	}

	.project-description :global(a) {
		color: var(--theme-accent, #6366f1);
		text-decoration: underline;
	}

	.project-description :global(ul),
	.project-description :global(ol) {
		margin: 0 0 0.5rem 0;
		padding-left: 1.25rem;
	}

	.project-description :global(li) {
		margin-bottom: 0.25rem;
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

	.action-button :global(svg),
	.action-button :global(img) {
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
