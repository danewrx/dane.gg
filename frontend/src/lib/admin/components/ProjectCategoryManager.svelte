<script lang="ts">
	import { logger } from '$lib/logger';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Plus, Edit, Trash2, GripVertical, X } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import {
		getAllProjectCategories,
		createProjectCategory,
		updateProjectCategory,
		deleteProjectCategory,
		updateCategoryOrder,
		type ProjectCategory
	} from '$lib/admin/services/projectsService';

	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	let categories = $state<ProjectCategory[]>([]);
	let loading = $state(true);
	let isSaving = $state(false);
	let showAddForm = $state(false);
	let editingCategory: ProjectCategory | null = $state(null);
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	let formData = $state({
		name: ''
	});

	onMount(async () => {
		await loadCategories();
	});

	async function loadCategories() {
		try {
			loading = true;
			categories = await getAllProjectCategories();

			const allHaveZeroOrder = categories.every((cat) => cat.displayOrder === 0);
			if (allHaveZeroOrder && categories.length > 0) {
				const categoryOrders = categories.map((cat, index) => ({
					id: cat.id,
					displayOrder: index + 1
				}));
				try {
					await updateCategoryOrder(categoryOrders);
					categories = await getAllProjectCategories();
				} catch (err) {
					logger.error('Error initializing category order:', err);
				}
			}

			categories.sort((a, b) => a.displayOrder - b.displayOrder);
		} catch (err) {
			logger.error('Error loading categories:', err);
			toast.error('Failed to load categories', {
				description: 'Please try refreshing the page'
			});
		} finally {
			loading = false;
		}
	}

	function startAdd() {
		editingCategory = null;
		formData = { name: '' };
		showAddForm = true;
	}

	function startEdit(category: ProjectCategory) {
		editingCategory = category;
		formData = { name: category.name };
		showAddForm = true;
	}

	function cancelEdit() {
		showAddForm = false;
		editingCategory = null;
		formData = { name: '' };
	}

	async function saveCategory() {
		if (!formData.name.trim()) {
			toast.error('Category name is required');
			return;
		}

		try {
			isSaving = true;
			if (editingCategory) {
				await updateProjectCategory(editingCategory.id, formData.name.trim());
				toast.success('Category updated', {
					description: `"${formData.name.trim()}" has been updated`
				});
			} else {
				await createProjectCategory(formData.name.trim());
				toast.success('Category created', {
					description: `"${formData.name.trim()}" has been created`
				});
			}
			await loadCategories();
			cancelEdit();
		} catch (err: any) {
			logger.error('Error saving category:', err);
			toast.error('Failed to save category', {
				description: err.message || 'Please try again'
			});
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete(id: string) {
		const category = categories.find((c) => c.id === id);
		if (!category) return;

		try {
			await deleteProjectCategory(id);
			toast.success('Category deleted', {
				description: `"${category.name}" has been deleted`
			});
			await loadCategories();
		} catch (err: any) {
			logger.error('Error deleting category:', err);
			toast.error('Failed to delete category', {
				description: err.message || 'Please try again'
			});
		}
	}

	// Drag and drop handlers
	function handleDragStart(event: DragEvent, index: number) {
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/html', '');
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		if (draggedIndex !== null && draggedIndex !== index) {
			dragOverIndex = index;
		}
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	async function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();
		dragOverIndex = null;

		if (draggedIndex === null || draggedIndex === dropIndex) {
			draggedIndex = null;
			return;
		}

		// Reorder categories array
		const newCategories = [...categories];
		const [draggedItem] = newCategories.splice(draggedIndex, 1);
		newCategories.splice(dropIndex, 0, draggedItem);

		// Update displayOrder for all affected categories
		const categoryOrders = newCategories.map((cat, index) => ({
			id: cat.id,
			displayOrder: index + 1
		}));

		try {
			await updateCategoryOrder(categoryOrders);
			await loadCategories();
			toast.success('Category order updated');
		} catch (err: any) {
			logger.error('Error updating category order:', err);
			toast.error('Failed to update category order', {
				description: err.message || 'Please try again'
			});
			// Reload
			await loadCategories();
		} finally {
			draggedIndex = null;
		}
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}
</script>

<div class="category-manager">
	<div class="header">
		<h2>Manage Categories</h2>
		<div class="header-actions">
			<button class="add-button" onclick={startAdd} type="button">
				<Plus size={18} />
				Add Category
			</button>
			<button class="close-button" onclick={() => dispatch('close')} type="button" title="Close">
				<X size={20} />
			</button>
		</div>
	</div>

	{#if loading}
		<div class="loading">
			<p>Loading categories...</p>
		</div>
	{:else if categories.length === 0}
		<div class="empty-state">
			<p>No categories yet</p>
			<button onclick={startAdd} type="button">Create your first category</button>
		</div>
	{:else}
		<div class="categories-list" role="list">
			{#each categories as category, index (category.id)}
				<div
					class="category-item"
					role="listitem"
					aria-label={`Reorder category: ${category.name}`}
					class:dragging={draggedIndex === index}
					class:drag-over={dragOverIndex === index}
					draggable="true"
					ondragstart={(e) => handleDragStart(e, index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, index)}
					ondragend={handleDragEnd}
				>
					<div class="drag-handle" title="Drag to reorder">
						<GripVertical size={16} />
					</div>
					<div class="category-info">
						<span class="category-name">{category.name}</span>
						<span class="category-order">Order: {category.displayOrder}</span>
					</div>
					<div class="category-actions">
						<button
							type="button"
							class="edit-button"
							onclick={() => startEdit(category)}
							title="Edit category"
						>
							<Edit size={16} />
						</button>
						<button
							type="button"
							class="delete-button"
							onclick={() => handleDelete(category.id)}
							title="Delete category"
						>
							<Trash2 size={16} />
						</button>
					</div>
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
					<h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
					<button class="close-button" onclick={cancelEdit} type="button">
						<X size={20} />
					</button>
				</div>
				<div class="modal-content">
					<div class="form-group">
						<label for="category-name">Category Name *</label>
						<input
							type="text"
							id="category-name"
							bind:value={formData.name}
							placeholder="e.g., Development, Graphics, Videos"
							required
							class="form-input"
							onkeydown={(e) => {
								if (e.key === 'Enter' && !isSaving) {
									e.preventDefault();
									saveCategory();
								}
							}}
						/>
					</div>
				</div>
				<div class="modal-actions">
					<button class="cancel-button" onclick={cancelEdit} type="button" disabled={isSaving}>
						Cancel
					</button>
					<button
						class="save-button"
						onclick={saveCategory}
						type="button"
						disabled={isSaving || !formData.name.trim()}
					>
						{isSaving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.category-manager {
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

	.categories-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.category-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		cursor: move;
		transition: all 0.2s ease;
	}

	.category-item:hover {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: var(--accent-color, #6366f1);
	}

	.category-item.dragging {
		opacity: 0.5;
	}

	.category-item.drag-over {
		border-color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.1);
	}

	.drag-handle {
		display: flex;
		align-items: center;
		color: var(--text-secondary, #a1a1aa);
		cursor: grab;
		flex-shrink: 0;
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.category-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.category-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.category-order {
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
	}

	.category-actions {
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

	.close-button {
		background: transparent;
		border: none;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.close-button:hover {
		background: var(--bg-secondary, #2d2d2d);
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
</style>
