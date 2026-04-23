<script lang="ts">
	import { logger } from '$lib/logger';

	import { onMount } from 'svelte';
	import { X, Plus, Edit, Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import {
		getAllBlogTags,
		getPostsUsingBlogTag,
		type BlogTag
	} from '$lib/admin/services/blogService';
	import { createEventDispatcher } from 'svelte';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';

	const dispatch = createEventDispatcher<{
		close: void;
		tagsUpdated: void;
	}>();

	let tags = $state<BlogTag[]>([]);
	let loading = $state(true);
	let showAddForm = $state(false);
	let editingTagForModal = $state<BlogTag | null>(null);
	let formTagName = $state('');
	let isSaving = $state(false);
	let showDeleteConfirm = $state(false);
	let tagToDelete = $state<BlogTag | null>(null);
	let postsUsingTag = $state<{ id: string; title: string }[]>([]);
	let loadingPosts = $state(false);

	let sortedTags = $derived([...tags].sort((a, b) => a.name.localeCompare(b.name)));

	onMount(async () => {
		await loadTags();
	});

	async function loadTags() {
		try {
			loading = true;
			tags = await getAllBlogTags();
		} catch (err) {
			logger.error('Error loading tags:', err);
			toast.error('Failed to load tags', {
				description: 'Please try again'
			});
		} finally {
			loading = false;
		}
	}

	function startAdd() {
		editingTagForModal = null;
		formTagName = '';
		showAddForm = true;
	}

	function startEdit(tag: BlogTag) {
		editingTagForModal = tag;
		formTagName = tag.name;
		showAddForm = true;
	}

	function cancelForm() {
		showAddForm = false;
		editingTagForModal = null;
		formTagName = '';
	}

	async function submitTagForm() {
		const trimmed = formTagName.trim();
		if (!trimmed) {
			toast.error('Tag name is required');
			return;
		}

		try {
			isSaving = true;
			if (editingTagForModal) {
				const response = await fetch(`/api/blog/admin/tags/${editingTagForModal.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ name: trimmed })
				});

				if (!response.ok) {
					const result = await response.json();
					throw new Error(result.error || 'Failed to update tag');
				}

				toast.success('Tag updated', {
					description: `Renamed to "${trimmed}"`
				});
			} else {
				const response = await fetch('/api/blog/admin/tags', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ name: trimmed })
				});

				if (!response.ok) {
					const result = await response.json();
					throw new Error(result.error || 'Failed to create tag');
				}

				toast.success('Tag created', {
					description: `"${trimmed}" has been added`
				});
			}

			await loadTags();
			dispatch('tagsUpdated');
			cancelForm();
		} catch (err: any) {
			logger.error('Error saving tag:', err);
			toast.error(editingTagForModal ? 'Failed to update tag' : 'Failed to create tag', {
				description: err.message || 'Please try again'
			});
		} finally {
			isSaving = false;
		}
	}

	function handleFormKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !isSaving) {
			e.preventDefault();
			submitTagForm();
		} else if (e.key === 'Escape') {
			cancelForm();
		}
	}

	async function handleDeleteClick(id: string) {
		const tag = tags.find((t) => t.id === id);
		if (!tag) return;

		try {
			loadingPosts = true;
			const posts = await getPostsUsingBlogTag(id);

			if (posts.length > 0) {
				tagToDelete = tag;
				postsUsingTag = posts;
				showDeleteConfirm = true;
			} else {
				await executeDeleteTag(id);
			}
		} catch (err: any) {
			logger.error('Error checking posts using tag:', err);
			toast.error('Failed to check tag usage', {
				description: err.message || 'Please try again'
			});
		} finally {
			loadingPosts = false;
		}
	}

	function closeDeleteConfirm() {
		showDeleteConfirm = false;
		tagToDelete = null;
		postsUsingTag = [];
	}

	async function executeDeleteTag(id: string) {
		const tag = tags.find((t) => t.id === id);
		if (!tag) return;

		try {
			const response = await fetch(`/api/blog/admin/tags/${id}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to delete tag');
			}

			await loadTags();
			dispatch('tagsUpdated');
			const n = postsUsingTag.length;
			toast.success('Tag deleted', {
				description:
					n > 0
						? `"${tag.name}" has been removed from ${n} post${n > 1 ? 's' : ''}`
						: `"${tag.name}" has been deleted`
			});
			closeDeleteConfirm();
		} catch (err: any) {
			logger.error('Error deleting tag:', err);
			toast.error('Failed to delete tag', {
				description: err.message || 'Please try again'
			});
		}
	}

	function close() {
		dispatch('close');
	}
</script>

<div
	class="dialog-overlay"
	onclick={close}
	onkeydown={(e) => e.key === 'Enter' && close()}
	role="button"
	tabindex="0"
	aria-label="Close dialog"
>
	<div
		class="dialog"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		tabindex="0"
	>
		<div class="tag-manager">
			<div class="header">
				<h2>Manage Tags</h2>
				<div class="header-actions">
					<button class="add-button" onclick={startAdd} type="button">
						<Plus size={18} />
						Add Tag
					</button>
					<button class="close-button" onclick={close} type="button" title="Close">
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
					<div class="tag-category-section">
						<div class="tag-category-header">Blog tags</div>
						{#each sortedTags as tag (tag.id)}
							<div class="tag-item">
								<div class="tag-info">
									<div class="tag-details">
										<span class="tag-title">{tag.name}</span>
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
										disabled={loadingPosts}
									>
										<Trash2 size={16} />
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		{#if showAddForm}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="modal-overlay" onclick={cancelForm} role="presentation">
				<div
					class="modal"
					role="dialog"
					aria-modal="true"
					aria-labelledby="blog-tag-modal-title"
					tabindex="-1"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
				>
					<div class="modal-header">
						<h3 id="blog-tag-modal-title">{editingTagForModal ? 'Edit Tag' : 'Add Tag'}</h3>
						<button type="button" class="modal-close" onclick={cancelForm} aria-label="Close">
							<X size={20} />
						</button>
					</div>
					<div class="modal-content">
						<div class="form-group">
							<label for="blog-tag-name">Tag name</label>
							<input
								id="blog-tag-name"
								type="text"
								class="form-input"
								bind:value={formTagName}
								placeholder="e.g. Tutorial, Web Development"
								onkeydown={handleFormKeydown}
							/>
						</div>
					</div>
					<div class="modal-actions">
						<button type="button" class="cancel-button" onclick={cancelForm} disabled={isSaving}>
							Cancel
						</button>
						<button
							type="button"
							class="save-button"
							onclick={submitTagForm}
							disabled={isSaving || !formTagName.trim()}
						>
							{isSaving ? 'Saving...' : editingTagForModal ? 'Update' : 'Create'}
						</button>
					</div>
				</div>
			</div>
		{/if}

		<ConfirmDialog
			bind:open={showDeleteConfirm}
			title="Delete tag"
			overlayZIndex={2100}
			variant="danger"
			confirmLabel="Delete tag"
			cancelLabel="Cancel"
			body={blogTagDeleteBody}
			onConfirm={async () => {
				if (tagToDelete) await executeDeleteTag(tagToDelete.id);
			}}
			onCancel={closeDeleteConfirm}
		/>
	</div>
</div>

{#snippet blogTagDeleteBody()}
	{#if tagToDelete}
		<p class="delete-warning">
			Deleting this tag will remove it from the following post{postsUsingTag.length > 1 ? 's' : ''}:
		</p>
		<ul class="affected-posts-list">
			{#each postsUsingTag as post}
				<li>{post.title}</li>
			{/each}
		</ul>
		<p class="delete-confirm-text">
			Are you sure you want to delete <strong>"{tagToDelete.name}"</strong>?
		</p>
	{/if}
{/snippet}

<style>
	.dialog-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(4px);
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.dialog {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 12px;
		width: 90%;
		max-width: 560px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s ease-out;
		overflow: hidden;
	}

	@keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.tag-manager {
		display: flex;
		flex-direction: column;
		min-height: 0;
		flex: 1;
		overflow: hidden;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		flex-shrink: 0;
	}

	.header h2 {
		margin: 0;
		font-size: 1.25rem;
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
		background: var(--bg-tertiary, #3a3a3a);
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
		padding: 20px 24px 24px;
		overflow-y: auto;
		flex: 1;
		min-height: 0;
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
		min-width: 0;
	}

	.tag-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.tag-title {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

	.delete-button:hover:not(:disabled) {
		border-color: #ef4444;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.delete-button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2050;
		padding: 16px;
	}

	.modal {
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		width: 100%;
		max-width: 440px;
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

	.modal-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.modal-close:hover {
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #ffffff);
	}

	.modal-content {
		padding: 24px;
		flex: 1;
		overflow-y: auto;
	}

	.form-group {
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
	}

	.cancel-button:disabled,
	.save-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.delete-warning {
		margin: 0 0 16px 0;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.affected-posts-list {
		margin: 0 0 20px 0;
		padding: 12px 16px 12px 32px;
		max-height: 200px;
		overflow-y: auto;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
	}

	.affected-posts-list li {
		margin-bottom: 8px;
		font-size: 14px;
	}

	.affected-posts-list li:last-child {
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
</style>
