<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Edit, Trash2, Eye, EyeOff, FileText, Calendar, Clock } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { getAllBlogPosts, deleteBlogPost, type BlogPost } from '$lib/admin/services/blogService';
	import SlideInPanel from '$lib/admin/components/ui/SlideInPanel.svelte';
	import BlogPostEditor from '$lib/admin/components/BlogPostEditor.svelte';

	let posts = $state<BlogPost[]>([]);
	let loading = $state(true);
	let deleteConfirmId = $state<string | null>(null);
	let isPanelOpen = $state(false);
	let editingPostId = $state<string | null>(null);
	let sortBy = $state<'created' | 'updated'>('updated');

	let sortedPosts = $derived.by(() => {
		const postsCopy = [...posts];
		return postsCopy.sort((a, b) => {
			const dateA = sortBy === 'created' ? new Date(a.createdAt) : new Date(a.updatedAt);
			const dateB = sortBy === 'created' ? new Date(b.createdAt) : new Date(b.updatedAt);
			return dateB.getTime() - dateA.getTime();
		});
	});

	onMount(async () => {
		await loadPosts();
	});

	async function loadPosts() {
		try {
			loading = true;
			posts = await getAllBlogPosts();
		} catch (err) {
			console.error('Error loading blog posts:', err);
			toast.error('Failed to load blog posts', {
				description: 'Please try refreshing the page'
			});
		} finally {
			loading = false;
		}
	}

	function createPost() {
		editingPostId = 'new';
		isPanelOpen = true;
	}

	function editPost(id: string) {
		editingPostId = id;
		isPanelOpen = true;
	}

	function closePanel() {
		isPanelOpen = false;
		editingPostId = null;
	}

	async function handlePostSave() {
		await loadPosts();
	}

	function confirmDelete(id: string) {
		deleteConfirmId = id;
	}

	function cancelDelete() {
		deleteConfirmId = null;
	}

	async function handleDelete(id: string) {
		try {
			const postToDelete = posts.find(p => p.id === id);
			await deleteBlogPost(id);
			deleteConfirmId = null;
			await loadPosts();
			toast.success('Post deleted', {
				description: postToDelete ? `"${postToDelete.title}" has been deleted` : 'The blog post has been deleted'
			});
		} catch (err) {
			console.error('Error deleting post:', err);
			toast.error('Failed to delete post', {
				description: 'Please try again'
			});
		}
	}

	function toggleSort() {
		sortBy = sortBy === 'created' ? 'updated' : 'created';
	}

	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Not published';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
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

	function truncateContent(content: string, maxLength: number = 100): string {
		if (content.length <= maxLength) return content;
		return content.substring(0, maxLength) + '...';
	}
</script>

<div class="blog-list">
	<div class="header">
		<div>
			<h1>Blog Posts</h1>
			<p class="subtitle">Manage your blog posts</p>
		</div>
		<div class="header-actions">
			<button class="sort-toggle" onclick={toggleSort} title={sortBy === 'created' ? 'Sorted by creation date' : 'Sorted by last updated'}>
				{#if sortBy === 'created'}
					<Calendar size={18} />
					Created
				{:else}
					<Clock size={18} />
					Updated
				{/if}
			</button>
			<button class="create-button" onclick={createPost}>
				<Plus size={20} />
				New Post
			</button>
		</div>
	</div>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading posts...</p>
		</div>
	{:else if posts.length === 0}
		<div class="empty-state">
			<p>No blog posts yet</p>
			<button onclick={createPost}>Create your first post</button>
		</div>
	{:else}
		<div class="table-container">
			<table class="posts-table">
				<thead>
					<tr>
						<th>Title</th>
						<th>Slug</th>
						<th>{sortBy === 'created' ? 'Created' : 'Updated'}</th>
						<th>Published</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each sortedPosts as post (post.id)}
						<tr class="post-row">
							<td class="title-cell">{post.title}</td>
							<td class="slug-cell">{post.slug}</td>
							<td class="timestamp-cell">
								{formatDateTime(sortBy === 'created' ? post.createdAt : post.updatedAt)}
							</td>
							<td class="status-cell">
								{#if post.published}
									<span class="status-badge published">
										<Eye size={14} />
									</span>
								{:else}
									<span class="status-badge draft">
										<EyeOff size={14} />
									</span>
								{/if}
							</td>
							<td class="actions-cell">
								<button class="action-icon edit" onclick={() => editPost(post.id)} title="Edit post">
									<Edit size={18} />
								</button>
								<button class="action-icon delete" onclick={() => confirmDelete(post.id)} title="Delete post">
									<Trash2 size={18} />
								</button>
							</td>
						</tr>

						{#if deleteConfirmId === post.id}
							<tr class="delete-confirm-row">
								<td colspan="5">
									<div class="delete-confirm">
										<p>Delete this post?</p>
										<div class="confirm-actions">
											<button class="confirm-button" onclick={() => handleDelete(post.id)}>Delete</button>
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
	{/if}
</div>

<!-- Blog Post Editor Panel -->
<SlideInPanel 
	isOpen={isPanelOpen} 
	title={editingPostId === 'new' ? 'Create New Post' : 'Edit Post'}
	icon={FileText}
	on:close={closePanel}
>
	<BlogPostEditor postId={editingPostId} on:save={handlePostSave} on:close={closePanel} />
</SlideInPanel>

<style>
	.blog-list {
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

	.table-container {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		overflow: hidden;
	}

	.posts-table {
		width: 100%;
		border-collapse: collapse;
	}

	.posts-table thead {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.posts-table th {
		padding: 16px 20px;
		text-align: left;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary, #a1a1aa);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.posts-table tbody tr.post-row {
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		transition: background 0.2s ease;
	}

	.posts-table tbody tr.post-row:hover {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.posts-table tbody tr.post-row:last-child {
		border-bottom: none;
	}

	.posts-table td {
		padding: 16px 20px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.title-cell {
		font-weight: 500;
		max-width: 400px;
	}

	.slug-cell {
		color: var(--text-secondary, #a1a1aa);
		font-family: 'Courier New', monospace;
		font-size: 13px;
	}

	.timestamp-cell {
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
		white-space: nowrap;
		min-width: 180px;
	}

	.status-cell {
		width: 100px;
		text-align: center;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
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
		.blog-list {
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

		.posts-table th,
		.posts-table td {
			padding: 12px 16px;
		}

		.title-cell {
			max-width: 200px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.slug-cell {
			font-size: 12px;
		}

		.timestamp-cell {
			font-size: 12px;
			min-width: 150px;
		}
	}
</style>

