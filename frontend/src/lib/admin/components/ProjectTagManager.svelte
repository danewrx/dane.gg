<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Plus, Edit, Trash2, X } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import {
		createProjectTag,
		updateProjectTag,
		deleteProjectTag,
		getAllProjectCategories,
		getProjectsUsingTag,
		type ProjectTag,
		type ProjectCategory
	} from '$lib/admin/services/projectsService';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';

	const dispatch = createEventDispatcher<{
		close: void;
		tagsUpdated: void;
	}>();

	let tags = $state<ProjectTag[]>([]);
	let categories = $state<ProjectCategory[]>([]);
	let loading = $state(true);

	// Create a map of category IDs to their displayOrder for quick lookup
	let categoryOrderMap = $derived.by(() => {
		const map = new Map<string, number>();
		categories.forEach((cat) => {
			map.set(cat.id, cat.displayOrder);
		});
		return map;
	});
	let isSaving = $state(false);
	let showAddForm = $state(false);
	let editingTag: ProjectTag | null = $state(null);
	let showDeleteConfirm = $state(false);
	let tagToDelete: ProjectTag | null = $state(null);
	let projectsUsingTag = $state<{ id: string; title: string }[]>([]);
	let loadingProjects = $state(false);

	let formData = $state({
		title: '',
		color: '#6366f1',
		categoryId: ''
	});

	onMount(async () => {
		// Load categories first, then tags, so categoryOrderMap is populated
		await loadCategories();
		await loadTags();
	});

	async function loadTags() {
		try {
			loading = true;
			const response = await fetch('/api/projects/admin/tags/all?grouped=true', {
				credentials: 'include'
			});
			if (response.ok) {
				const result = await response.json();
				const allTags: ProjectTag[] = [];
				if (result.data && Array.isArray(result.data)) {
					result.data.forEach((group: { category: any; tags: ProjectTag[] }) => {
						// Ensure each tag has the category info with displayOrder from the group
						group.tags.forEach((tag) => {
							allTags.push({
								...tag,
								// Use group.category if tag.category doesn't have displayOrder, or merge them
								category: tag.category
									? {
											...tag.category,
											displayOrder:
												(tag.category as any).displayOrder ?? group.category?.displayOrder
										}
									: group.category
										? {
												...group.category,
												displayOrder: group.category.displayOrder
											}
										: null
							});
						});
					});
				}
				tags = allTags;
			}
		} catch (err) {
			console.error('Error loading tags:', err);
			toast.error('Failed to load tags', {
				description: 'Please try refreshing the page'
			});
		} finally {
			loading = false;
		}
	}

	// Group tags by category for display, sorted by category displayOrder
	let groupedTags = $derived.by(() => {
		if (categories.length === 0) {
			return [];
		}

		const groups: Record<
			string,
			{ category: { name: string; id: string; displayOrder: number } | null; tags: ProjectTag[] }
		> = {};
		tags.forEach((tag) => {
			const categoryId = tag.category?.id || 'uncategorized';

			if (!groups[categoryId]) {
				// Always use categoryOrderMap as the authoritative source
				let categoryDisplayOrder: number = 999; // Default for uncategorized

				if (categoryId !== 'uncategorized') {
					if (categoryOrderMap.has(categoryId)) {
						// Use the displayOrder from the categories list (authoritative)
						categoryDisplayOrder = categoryOrderMap.get(categoryId)!;
					} else {
						// Category ID not found in map - try to find it in categories list
						const foundCategory = categories.find((c) => c.id === categoryId);
						if (foundCategory) {
							categoryDisplayOrder = foundCategory.displayOrder;
						} else {
							// Category not found at all - use fallback from tag or default
							categoryDisplayOrder =
								(tag.category as any)?.displayOrder ?? tag.category?.displayOrder ?? 999;
							console.warn(
								`Category ID ${categoryId} (${tag.category?.name}) not found in categoryOrderMap or categories list`
							);
						}
					}
				}

				groups[categoryId] = {
					category: tag.category
						? {
								name: tag.category.name,
								id: tag.category.id,
								displayOrder: categoryDisplayOrder
							}
						: null,
					tags: []
				};
			}
			groups[categoryId].tags.push(tag);
		});

		const groupsArray = Object.values(groups);

		// Sort by category displayOrder, with uncategorized last
		groupsArray.sort((a, b) => {
			if (a.category && b.category) {
				// Both have categories - sort by displayOrder
				const aOrder = a.category.displayOrder;
				const bOrder = b.category.displayOrder;

				// Debug log for troubleshooting
				if (aOrder === undefined || bOrder === undefined || aOrder === 999 || bOrder === 999) {
					console.warn('Potential sorting issue:', {
						a: { name: a.category.name, id: a.category.id, displayOrder: aOrder },
						b: { name: b.category.name, id: b.category.id, displayOrder: bOrder },
						categoryOrderMap: Array.from(categoryOrderMap.entries()),
						categories: categories.map((c) => ({
							name: c.name,
							id: c.id,
							displayOrder: c.displayOrder
						}))
					});
				}

				if (aOrder !== bOrder) {
					return aOrder - bOrder;
				}
				// If displayOrder is the same, sort by name (shouldn't happen if displayOrder is set correctly)
				return (a.category.name || '').localeCompare(b.category.name || '');
			}
			// Uncategorized goes last
			if (!a.category && b.category) return 1;
			if (a.category && !b.category) return -1;
			return 0;
		});

		return groupsArray;
	});

	async function loadCategories() {
		try {
			const loadedCategories = await getAllProjectCategories();
			// Sort categories by displayOrder to ensure consistent ordering
			categories = loadedCategories.sort((a, b) => a.displayOrder - b.displayOrder);
		} catch (err) {
			console.error('Error loading categories:', err);
		}
	}

	function startAdd() {
		editingTag = null;
		formData.title = '';
		formData.color = '#6366f1';
		formData.categoryId = '';
		showAddForm = true;
	}

	function startEdit(tag: ProjectTag) {
		editingTag = tag;
		formData.title = tag.title;
		formData.color = tag.color;
		formData.categoryId = tag.categoryId ? String(tag.categoryId) : '';
		showAddForm = true;
	}

	function cancelEdit() {
		showAddForm = false;
		editingTag = null;
		formData.title = '';
		formData.color = '#6366f1';
		formData.categoryId = '';
	}

	async function saveTag() {
		if (!formData.title.trim()) {
			toast.error('Tag name is required');
			return;
		}

		// Validate color format
		const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
		if (!hexColorRegex.test(formData.color.trim())) {
			toast.error('Invalid color format', {
				description: 'Color must be a valid hex code (e.g., #FF5733)'
			});
			return;
		}

		try {
			isSaving = true;
			const categoryId =
				formData.categoryId && formData.categoryId.trim() ? formData.categoryId.trim() : null;
			if (editingTag) {
				await updateProjectTag(
					editingTag.id,
					formData.title.trim(),
					formData.color.trim(),
					categoryId
				);
				toast.success('Tag updated', {
					description: `"${formData.title.trim()}" has been updated`
				});
			} else {
				await createProjectTag(formData.title.trim(), formData.color.trim(), categoryId);
				toast.success('Tag created', {
					description: `"${formData.title.trim()}" has been created`
				});
			}
			await loadTags();
			dispatch('tagsUpdated');
			cancelEdit();
		} catch (err: any) {
			console.error('Error saving tag:', err);
			toast.error('Failed to save tag', {
				description: err.message || 'Please try again'
			});
		} finally {
			isSaving = false;
		}
	}

	async function handleDeleteClick(id: string) {
		const tag = tags.find((t) => t.id === id);
		if (!tag) return;

		// Check if tag is used by projects
		try {
			loadingProjects = true;
			const projects = await getProjectsUsingTag(id);

			if (projects.length > 0) {
				// Show confirmation dialog with affected projects
				tagToDelete = tag;
				projectsUsingTag = projects;
				showDeleteConfirm = true;
			} else {
				// No projects using this tag, delete directly
				await confirmDelete(id);
			}
		} catch (err: any) {
			console.error('Error checking projects using tag:', err);
			toast.error('Failed to check tag usage', {
				description: err.message || 'Please try again'
			});
		} finally {
			loadingProjects = false;
		}
	}

	async function confirmDelete(id: string) {
		const tag = tags.find((t) => t.id === id);
		if (!tag) return;

		try {
			await deleteProjectTag(id);
			toast.success('Tag deleted', {
				description: `"${tag.title}" has been deleted${projectsUsingTag.length > 0 ? ` and removed from ${projectsUsingTag.length} project${projectsUsingTag.length > 1 ? 's' : ''}` : ''}`
			});
			await loadTags();
			dispatch('tagsUpdated');
			closeDeleteConfirm();
		} catch (err: any) {
			console.error('Error deleting tag:', err);
			toast.error('Failed to delete tag', {
				description: err.message || 'Please try again'
			});
		}
	}

	function closeDeleteConfirm() {
		showDeleteConfirm = false;
		tagToDelete = null;
		projectsUsingTag = [];
	}
</script>

<div class="tag-manager">
	<div class="header">
		<h2>Manage Tags</h2>
		<div class="header-actions">
			<button class="add-button" onclick={startAdd} type="button">
				<Plus size={18} />
				Add Tag
			</button>
			<button class="close-button" onclick={() => dispatch('close')} type="button" title="Close">
				<X size={20} />
			</button>
		</div>
	</div>

	{#if loading}
		<div class="loading">
			<p>Loading tags...</p>
		</div>
	{:else if tags.length === 0}
		<div class="empty-state">
			<p>No tags yet</p>
			<button onclick={startAdd} type="button">Create your first tag</button>
		</div>
	{:else}
		<div class="tags-list">
			{#each groupedTags as group}
				<div class="tag-category-section">
					<div class="tag-category-header">
						{#if group.category}
							{group.category.name}
						{:else}
							Uncategorized
						{/if}
					</div>
					{#each group.tags as tag (tag.id)}
						<div class="tag-item">
							<div class="tag-info">
								<span class="tag-color-preview" style="background-color: {tag.color};"></span>
								<div class="tag-details">
									<span class="tag-title">{tag.title}</span>
								</div>
							</div>
							<div class="tag-actions">
								<button
									type="button"
									class="edit-button"
									onclick={() => startEdit(tag)}
									title="Edit tag"
								>
									<Edit size={16} />
								</button>
								<button
									type="button"
									class="delete-button"
									onclick={() => handleDeleteClick(tag.id)}
									title="Delete tag"
									disabled={loadingProjects}
								>
									<Trash2 size={16} />
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{/if}

	{#if showAddForm}
		<div
			class="modal-overlay"
			onclick={cancelEdit}
			role="button"
			tabindex="0"
			onkeydown={(e) => {
				if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					cancelEdit();
				}
			}}
		>
			<div
				class="modal"
				role="dialog"
				aria-modal="true"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				<div class="modal-header">
					<h3>{editingTag ? 'Edit Tag' : 'Add Tag'}</h3>
					<button class="close-button" onclick={cancelEdit} type="button">
						<X size={20} />
					</button>
				</div>
				<div class="modal-content">
					<div class="form-group">
						<label for="tag-title">Tag Name *</label>
						<input
							type="text"
							id="tag-title"
							bind:value={formData.title}
							placeholder="e.g., React, Design, Video"
							required
							class="form-input"
							onkeydown={(e) => {
								if (e.key === 'Enter' && !isSaving) {
									e.preventDefault();
									saveTag();
								}
							}}
						/>
					</div>
					<div class="form-group">
						<label for="tag-color">Color *</label>
						<div class="color-input-group">
							<input type="color" id="tag-color" bind:value={formData.color} class="color-picker" />
							<input
								type="text"
								bind:value={formData.color}
								placeholder="#6366f1"
								class="form-input color-text-input"
								pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
							/>
						</div>
					</div>
					<div class="form-group">
						<label for="tag-category">Category (Optional)</label>
						<select id="tag-category" bind:value={formData.categoryId} class="form-input">
							<option value="">No Category</option>
							{#each categories as category}
								<option value={String(category.id)}>{category.name}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="modal-actions">
					<button class="cancel-button" onclick={cancelEdit} type="button" disabled={isSaving}>
						Cancel
					</button>
					<button
						class="save-button"
						onclick={saveTag}
						type="button"
						disabled={isSaving || !formData.title.trim()}
					>
						{isSaving ? 'Saving...' : editingTag ? 'Update' : 'Create'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<ConfirmDialog
		bind:open={showDeleteConfirm}
		title="Delete tag"
		variant="danger"
		confirmLabel="Delete tag"
		cancelLabel="Cancel"
		body={tagDeleteBody}
		onConfirm={async () => {
			if (tagToDelete) await confirmDelete(tagToDelete.id);
		}}
		onCancel={closeDeleteConfirm}
	/>
</div>

{#snippet tagDeleteBody()}
	{#if tagToDelete}
		<p class="delete-warning">
			Deleting this tag will remove it from the following project{projectsUsingTag.length > 1
				? 's'
				: ''}:
		</p>
		<ul class="affected-projects-list">
			{#each projectsUsingTag as project}
				<li>{project.title}</li>
			{/each}
		</ul>
		<p class="delete-confirm-text">
			Are you sure you want to delete <strong>"{tagToDelete.title}"</strong>?
		</p>
	{/if}
{/snippet}

<style>
	.tag-manager {
		background: var(--bg-primary, #1a1a1a);
		border-radius: 8px;
		padding: 24px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}

	.header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.add-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		background: var(--accent-color, #6366f1);
		color: #ffffff;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-button:hover {
		background: var(--accent-color-hover, #4f46e5);
		transform: translateY(-1px);
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.close-button:hover {
		background: var(--bg-secondary, #2d2d2d);
		border-color: var(--text-primary, #ffffff);
		color: var(--text-primary, #ffffff);
	}

	.loading,
	.empty-state {
		text-align: center;
		padding: 48px 24px;
		color: var(--text-secondary, #a1a1aa);
	}

	.empty-state button {
		margin-top: 16px;
		padding: 10px 20px;
		background: var(--accent-color, #6366f1);
		color: #ffffff;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
	}

	.tags-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.tag-category-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.tag-category-header {
		padding: 8px 12px;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-radius: 4px;
	}

	.tag-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 16px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.tag-item:hover {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: var(--accent-color, #6366f1);
	}

	.tag-info {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.tag-color-preview {
		width: 24px;
		height: 24px;
		border-radius: 4px;
		flex-shrink: 0;
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.tag-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.tag-title {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.tag-actions {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.edit-button,
	.delete-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 4px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.edit-button:hover {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.1);
	}

	.delete-button:hover {
		border-color: #ef4444;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.modal-overlay {
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

	.modal {
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.modal-content {
		padding: 24px;
		flex: 1;
		overflow-y: auto;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.form-group label {
		display: block;
		margin-bottom: 8px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.form-input {
		width: 100%;
		padding: 12px 16px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		box-sizing: border-box;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.color-input-group {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.color-picker {
		width: 60px;
		height: 40px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		cursor: pointer;
		background: none;
		padding: 0;
	}

	.color-text-input {
		flex: 1;
		font-family: monospace;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 20px 24px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.cancel-button,
	.save-button {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-button {
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #ffffff);
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.cancel-button:hover:not(:disabled) {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.save-button {
		background: var(--accent-color, #6366f1);
		color: #ffffff;
	}

	.save-button:hover:not(:disabled) {
		background: var(--accent-color-hover, #4f46e5);
		transform: translateY(-1px);
	}

	.cancel-button:disabled,
	.save-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.delete-warning {
		margin: 0 0 16px 0;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.affected-projects-list {
		margin: 0 0 20px 0;
		padding-left: 24px;
		color: var(--text-primary, #ffffff);
		max-height: 200px;
		overflow-y: auto;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		padding: 12px 16px 12px 32px;
	}

	.affected-projects-list li {
		margin-bottom: 8px;
		font-size: 14px;
	}

	.affected-projects-list li:last-child {
		margin-bottom: 0;
	}

	.delete-confirm-text {
		margin: 0;
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
	}

	.delete-confirm-text strong {
		color: var(--text-primary, #ffffff);
		font-weight: 600;
	}

	.delete-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
