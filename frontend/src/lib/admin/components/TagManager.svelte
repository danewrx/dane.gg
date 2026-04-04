<script lang="ts">
	import { onMount } from 'svelte';
	import { X, Plus, Edit2, Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { getAllBlogTags, getPostsUsingBlogTag, type BlogTag } from '$lib/admin/services/blogService';
	import { createEventDispatcher } from 'svelte';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';

	const dispatch = createEventDispatcher<{
		close: void;
		tagsUpdated: void;
	}>();

	let tags = $state<BlogTag[]>([]);
	let loading = $state(true);
	let newTagName = $state('');
	let editingTag = $state<BlogTag | null>(null);
	let editingTagName = $state('');
	let showDeleteConfirm = $state(false);
	let tagToDelete = $state<BlogTag | null>(null);
	let postsUsingTag = $state<{ id: string; title: string }[]>([]);
	let loadingPosts = $state(false);

	onMount(async () => {
		await loadTags();
	});

	async function loadTags() {
		try {
			loading = true;
			tags = await getAllBlogTags();
		} catch (err) {
			console.error('Error loading tags:', err);
			toast.error('Failed to load tags', {
				description: 'Please try again'
			});
		} finally {
			loading = false;
		}
	}

	async function handleAddTag() {
		const trimmed = newTagName.trim();
		if (!trimmed) return;

		try {
			// Create tag
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

			newTagName = '';
			await loadTags();
			dispatch('tagsUpdated');
			toast.success('Tag created', {
				description: `"${trimmed}" has been added`
			});
		} catch (err: any) {
			console.error('Error creating tag:', err);
			toast.error('Failed to create tag', {
				description: err.message || 'Please try again'
			});
		}
	}

	function startEdit(tag: BlogTag) {
		editingTag = tag;
		editingTagName = tag.name;
	}

	function cancelEdit() {
		editingTag = null;
		editingTagName = '';
	}

	async function handleUpdateTag() {
		if (!editingTag) return;
		const trimmed = editingTagName.trim();
		if (!trimmed) return;

		try {
			const response = await fetch(`/api/blog/admin/tags/${editingTag.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ name: trimmed })
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to update tag');
			}

			editingTag = null;
			editingTagName = '';
			await loadTags();
			dispatch('tagsUpdated');
			toast.success('Tag updated', {
				description: `Tag has been renamed to "${trimmed}"`
			});
		} catch (err: any) {
			console.error('Error updating tag:', err);
			toast.error('Failed to update tag', {
				description: err.message || 'Please try again'
			});
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
			console.error('Error checking posts using tag:', err);
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
			console.error('Error deleting tag:', err);
			toast.error('Failed to delete tag', {
				description: err.message || 'Please try again'
			});
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleAddTag();
		}
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleUpdateTag();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	}

	function close() {
		dispatch('close');
	}
</script>

<div class="dialog-overlay" onclick={close} onkeydown={(e) => e.key === 'Enter' && close()} role="button" tabindex="0" aria-label="Close dialog">
	<div
		class="dialog"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		tabindex="0"
	>
		<div class="dialog-header">
			<h2>Manage Tags</h2>
			<button class="close-button" onclick={close} aria-label="Close dialog">
				<X size={20} />
			</button>
		</div>

		<div class="dialog-content">
			<!-- Add New Tag -->
			<div class="add-tag-section">
				<input
					type="text"
					bind:value={newTagName}
					onkeydown={handleKeydown}
					placeholder="Enter new tag name"
					class="tag-input"
				/>
				<button onclick={handleAddTag} class="add-button" disabled={!newTagName.trim()}>
					<Plus size={18} />
					Add Tag
				</button>
			</div>

			<!-- Tags List -->
			{#if loading}
				<div class="loading">
					<div class="spinner"></div>
					<p>Loading tags...</p>
				</div>
			{:else if tags.length === 0}
				<div class="empty-state">
					<p>No tags yet. Create your first tag above.</p>
				</div>
			{:else}
				<div class="tags-list">
					{#each tags as tag (tag.id)}
						<div class="tag-item">
							{#if editingTag?.id === tag.id}
								<input
									type="text"
									bind:value={editingTagName}
									onkeydown={handleEditKeydown}
									class="tag-edit-input"
								/>
								<div class="tag-actions">
									<button onclick={handleUpdateTag} class="action-button save" title="Save">
										Save
									</button>
									<button onclick={cancelEdit} class="action-button cancel" title="Cancel">
										Cancel
									</button>
								</div>
							{:else}
								<span class="tag-name">{tag.name}</span>
								<div class="tag-actions">
									<button onclick={() => startEdit(tag)} class="action-button edit" title="Edit tag">
										<Edit2 size={16} />
									</button>
									<button
										onclick={() => handleDeleteClick(tag.id)}
										class="action-button delete"
										title="Delete tag"
										disabled={loadingPosts}
									>
										<Trash2 size={16} />
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

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
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.7);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(4px);
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.dialog {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 12px;
		width: 90%;
		max-width: 600px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s ease-out;
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

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.dialog-header h2 {
		color: var(--text-primary, #ffffff);
		font-size: 20px;
		font-weight: 600;
		margin: 0;
	}

	.close-button {
		background: none;
		border: none;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		padding: 8px;
		border-radius: 4px;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.dialog-content {
		padding: 24px;
		overflow-y: auto;
		flex: 1;
	}

	.add-tag-section {
		display: flex;
		gap: 12px;
		margin-bottom: 24px;
	}

	.tag-input {
		flex: 1;
		padding: 10px 14px;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.tag-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.add-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		background: var(--accent-color, #6366f1);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.add-button:hover:not(:disabled) {
		background: var(--accent-hover, #5558e3);
	}

	.add-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		text-align: center;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border-color, #3a3a3a);
		border-top: 3px solid var(--accent-color, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 12px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.empty-state p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0;
	}

	.tags-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.tag-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.tag-item:hover {
		border-color: var(--accent-color, #6366f1);
	}

	.tag-name {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		flex: 1;
	}

	.tag-edit-input {
		flex: 1;
		padding: 6px 10px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--accent-color, #6366f1);
		border-radius: 4px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.tag-edit-input:focus {
		outline: none;
	}

	.tag-actions {
		display: flex;
		align-items: center;
		gap: 8px;
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

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px 12px;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 4px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-button:hover {
		background: var(--bg-secondary, #2d2d2d);
	}

	.action-button.edit:hover {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
	}

	.action-button.delete:hover:not(:disabled) {
		border-color: #ef4444;
		color: #ef4444;
	}

	.action-button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.action-button.save {
		background: var(--accent-color, #6366f1);
		color: white;
		border-color: var(--accent-color, #6366f1);
	}

	.action-button.save:hover {
		background: var(--accent-hover, #5558e3);
	}

	.action-button.cancel {
		background: transparent;
		border-color: var(--border-color, #3a3a3a);
	}

	.action-button.cancel:hover {
		background: var(--bg-tertiary, #3a3a3a);
	}
</style>

