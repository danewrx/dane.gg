<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Edit, Trash2, Eye, EyeOff, FolderKanban, Calendar, Clock, Star, FolderTree, Tag } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { getAllProjects, deleteProject, type Project } from '$lib/admin/services/projectsService';
	import SlideInPanel from '$lib/admin/components/ui/SlideInPanel.svelte';
	import ProjectEditor from '$lib/admin/components/ProjectEditor.svelte';
	import ProjectCategoryManager from '$lib/admin/components/ProjectCategoryManager.svelte';
	import ProjectTagManager from '$lib/admin/components/ProjectTagManager.svelte';

	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let deleteConfirmId = $state<string | null>(null);
	let isPanelOpen = $state(false);
	let editingProjectId = $state<string | null>(null);
	let sortBy = $state<'created' | 'updated'>('updated');
	let showCategoryManager = $state(false);
	let showTagManager = $state(false);

	let sortedProjects = $derived.by(() => {
		const projectsCopy = [...projects];
		return projectsCopy.sort((a, b) => {
			const dateA = sortBy === 'created' ? new Date(a.createdAt) : new Date(a.updatedAt);
			const dateB = sortBy === 'created' ? new Date(b.createdAt) : new Date(b.updatedAt);
			return dateB.getTime() - dateA.getTime();
		});
	});

	// Group projects by category
	let projectsByCategory = $derived.by(() => {
		const grouped: Record<string, { category: { id: string; name: string; displayOrder: number }; projects: typeof sortedProjects }> = {};
		
		sortedProjects.forEach(project => {
			const categoryId = project.category.id;
			if (!grouped[categoryId]) {
				grouped[categoryId] = {
					category: {
						id: project.category.id,
						name: project.category.name,
						displayOrder: project.category.displayOrder
					},
					projects: []
				};
			}
			grouped[categoryId].projects.push(project);
		});
		
		return Object.values(grouped).sort((a, b) => {
			return a.category.displayOrder - b.category.displayOrder;
		});
	});

	onMount(async () => {
		await loadProjects();
	});

	async function loadProjects() {
		try {
			loading = true;
			projects = await getAllProjects();
		} catch (err) {
			console.error('Error loading projects:', err);
			toast.error('Failed to load projects', {
				description: 'Please try refreshing the page'
			});
		} finally {
			loading = false;
		}
	}

	function createProject() {
		editingProjectId = 'new';
		isPanelOpen = true;
	}

	function editProject(id: string) {
		editingProjectId = id;
		isPanelOpen = true;
	}

	function closePanel() {
		isPanelOpen = false;
		editingProjectId = null;
	}

	async function handleProjectSave() {
		await loadProjects();
	}

	async function handleCategoryManagerClose() {
		showCategoryManager = false;
		await loadProjects();
	}

	function confirmDelete(id: string) {
		deleteConfirmId = id;
	}

	function cancelDelete() {
		deleteConfirmId = null;
	}

	async function handleDelete(id: string) {
		try {
			const projectToDelete = projects.find(p => p.id === id);
			await deleteProject(id);
			deleteConfirmId = null;
			await loadProjects();
			toast.success('Project deleted', {
				description: projectToDelete ? `"${projectToDelete.title}" has been deleted` : 'The project has been deleted'
			});
		} catch (err) {
			console.error('Error deleting project:', err);
			toast.error('Failed to delete project', {
				description: 'Please try again'
			});
		}
	}

	function toggleSort() {
		sortBy = sortBy === 'created' ? 'updated' : 'created';
	}

	function formatDateTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function truncateDescription(description: string, maxLength: number = 80): string {
		if (description.length <= maxLength) return description;
		return description.substring(0, maxLength) + '...';
	}
</script>

<div class="projects-list">
	<div class="header">
		<div>
			<h1>Projects</h1>
			<p class="subtitle">Manage your projects</p>
		</div>
		<div class="header-actions">
			<button class="category-button" onclick={() => showCategoryManager = true} title="Manage Categories">
				<FolderTree size={18} />
				Manage Categories
			</button>
			<button class="tag-button" onclick={() => showTagManager = true} title="Manage Tags">
				<Tag size={18} />
				Manage Tags
			</button>
			<div class="divider"></div>
			<button class="sort-toggle" onclick={toggleSort} title={sortBy === 'created' ? 'Sorted by creation date' : 'Sorted by last updated'}>
				{#if sortBy === 'created'}
					<Calendar size={18} />
					Created
				{:else}
					<Clock size={18} />
					Updated
				{/if}
			</button>
			<button class="create-button" onclick={createProject}>
				<Plus size={20} />
				New Project
			</button>
		</div>
	</div>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading projects...</p>
		</div>
	{:else if projects.length === 0}
		<div class="empty-state">
			<p>No projects yet</p>
			<button onclick={createProject}>Create your first project</button>
		</div>
	{:else}
		<div class="categories-container">
			{#each projectsByCategory as categoryGroup (categoryGroup.category.id)}
				<div class="category-section">
					<h2 class="category-header">{categoryGroup.category.name}</h2>
					<div class="table-container">
						<table class="projects-table">
							<thead>
								<tr>
									<th>Title</th>
									<th>{sortBy === 'created' ? 'Created' : 'Updated'}</th>
									<th>Featured</th>
									<th>Status</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each categoryGroup.projects as project (project.id)}
									<tr class="project-row">
										<td class="title-cell">
											<div class="title-content">
												<span class="title-text">{project.title}</span>
												{#if project.featured}
													<Star size={14} class="featured-icon" />
												{/if}
											</div>
										</td>
										<td class="timestamp-cell">
											{formatDateTime(sortBy === 'created' ? project.createdAt : project.updatedAt)}
										</td>
										<td class="featured-cell">
											{#if project.featured}
												<span class="featured-badge" title="Featured on frontpage">
													<Star size={16} />
													Yes
												</span>
											{:else}
												<span class="not-featured" title="Not featured">No</span>
											{/if}
										</td>
										<td class="status-cell">
											<div class="status-badges">
												{#if project.published}
													<span class="status-badge published" title="Published">
														<Eye size={14} />
													</span>
												{:else}
													<span class="status-badge draft" title="Draft">
														<EyeOff size={14} />
													</span>
												{/if}
												<span class="status-badge active" title="Status: {project.active}">
													{project.active}
												</span>
											</div>
										</td>
										<td class="actions-cell">
											<button class="action-icon edit" onclick={() => editProject(project.id)} title="Edit project">
												<Edit size={18} />
											</button>
											<button class="action-icon delete" onclick={() => confirmDelete(project.id)} title="Delete project">
												<Trash2 size={18} />
											</button>
										</td>
									</tr>

									{#if deleteConfirmId === project.id}
										<tr class="delete-confirm-row">
											<td colspan="5">
												<div class="delete-confirm">
													<p>Delete this project?</p>
													<div class="confirm-actions">
														<button class="confirm-button" onclick={() => handleDelete(project.id)}>Delete</button>
														<button class="cancel-button" onclick={cancelDelete}>Cancel</button>
													</div>
												</div>
											</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Project Editor Panel -->
<SlideInPanel 
	isOpen={isPanelOpen} 
	title={editingProjectId === 'new' ? 'Create New Project' : 'Edit Project'}
	icon={FolderKanban}
	on:close={closePanel}
>
	<ProjectEditor projectId={editingProjectId} on:save={handleProjectSave} on:close={closePanel} />
</SlideInPanel>

{#if showCategoryManager}
	<div class="category-manager-overlay" onclick={handleCategoryManagerClose}>
		<div class="category-manager-container" onclick={(e) => e.stopPropagation()}>
			<ProjectCategoryManager on:close={handleCategoryManagerClose} />
		</div>
	</div>
{/if}

{#if showTagManager}
	<div class="category-manager-overlay" onclick={() => showTagManager = false}>
		<div class="category-manager-container" onclick={(e) => e.stopPropagation()}>
			<ProjectTagManager on:close={() => showTagManager = false} />
		</div>
	</div>
{/if}

<style>
	.projects-list {
		padding: 24px;
		max-width: 1400px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 32px;
	}

	h1 {
		color: var(--text-primary, #ffffff);
		font-size: 28px;
		margin: 0 0 8px 0;
	}

	.subtitle {
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		margin: 0;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.divider {
		width: 1px;
		height: 24px;
		background: var(--border-color, #3a3a3a);
		flex-shrink: 0;
	}

	.sort-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #ffffff);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.sort-toggle:hover {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: var(--accent-color, #6366f1);
	}

	.category-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #ffffff);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.category-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: var(--accent-color, #6366f1);
	}

	.tag-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #ffffff);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tag-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: var(--accent-color, #6366f1);
	}

	.create-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 24px;
		background: var(--accent-color, #6366f1);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.create-button:hover {
		background: var(--accent-hover, #5558e3);
		transform: translateY(-1px);
	}

	.loading,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 64px 24px;
		text-align: center;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--border-color, #3a3a3a);
		border-top: 3px solid var(--accent-color, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.categories-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.category-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.category-header {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin: 0;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid var(--border-color, #3a3a3a);
	}

	.table-container {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		overflow: hidden;
	}

	.projects-table {
		width: 100%;
		border-collapse: collapse;
	}

	.projects-table thead {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.projects-table th {
		padding: 16px 20px;
		text-align: left;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary, #a1a1aa);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.projects-table tbody tr.project-row {
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		transition: background 0.2s ease;
	}

	.projects-table tbody tr.project-row:hover {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.projects-table tbody tr.project-row:last-child {
		border-bottom: none;
	}

	.projects-table td {
		padding: 16px 20px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.title-cell {
		font-weight: 500;
		max-width: 400px;
	}

	.title-content {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.title-text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.featured-icon {
		color: var(--accent-color, #6366f1);
		flex-shrink: 0;
	}


	.timestamp-cell {
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
		white-space: nowrap;
		min-width: 180px;
	}

	.featured-cell {
		text-align: center;
	}

	.featured-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--accent-color, #6366f1);
		font-weight: 500;
		font-size: 13px;
	}

	.not-featured {
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
	}

	.status-cell {
		width: 140px;
	}

	.status-badges {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 4px 10px;
		border-radius: 12px;
		font-size: 11px;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.status-badge.published {
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
	}

	.status-badge.draft {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.status-badge.active {
		background: rgba(99, 102, 241, 0.1);
		color: var(--accent-color, #6366f1);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.actions-cell {
		width: 120px;
		text-align: right;
	}

	.action-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
		margin-left: 4px;
	}

	.action-icon:hover {
		background: var(--bg-primary, #1a1a1a);
	}

	.action-icon.edit:hover {
		color: var(--accent-color, #6366f1);
	}

	.action-icon.delete:hover {
		color: #ef4444;
	}

	.delete-confirm-row {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.delete-confirm-row td {
		padding: 0 !important;
	}

	.delete-confirm {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 16px 20px;
		background: rgba(239, 68, 68, 0.1);
		border-left: 3px solid #ef4444;
	}

	.delete-confirm p {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		margin: 0;
		flex: 1;
	}

	.confirm-actions {
		display: flex;
		gap: 12px;
	}

	.confirm-button,
	.cancel-button {
		padding: 8px 20px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.confirm-button {
		background: #ef4444;
		color: white;
		border: none;
	}

	.confirm-button:hover {
		background: #dc2626;
	}

	.cancel-button {
		background: transparent;
		color: var(--text-primary, #ffffff);
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.cancel-button:hover {
		background: var(--bg-secondary, #2d2d2d);
	}

	@media (max-width: 768px) {
		.projects-list {
			padding: 16px;
		}

		.header {
			flex-direction: column;
			align-items: flex-start;
			gap: 16px;
		}

		.header-actions {
			width: 100%;
			justify-content: space-between;
		}

		.sort-toggle {
			padding: 8px 16px;
			font-size: 13px;
		}

		.create-button {
			padding: 10px 20px;
			font-size: 13px;
		}

		.table-container {
			overflow-x: auto;
		}

		.projects-table th,
		.projects-table td {
			padding: 12px 16px;
		}

		.title-cell {
			max-width: 200px;
		}

		.timestamp-cell {
			font-size: 12px;
			min-width: 150px;
		}
	}

	.category-manager-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 16px;
	}

	.category-manager-container {
		width: 100%;
		max-width: 800px;
		max-height: 90vh;
		overflow-y: auto;
		background: var(--bg-primary, #1a1a1a);
		border-radius: 8px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}
</style>

