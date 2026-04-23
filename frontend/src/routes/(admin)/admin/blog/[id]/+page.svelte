<script lang="ts">
	import { logger } from '$lib/logger';

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Save, ArrowLeft } from 'lucide-svelte';
	import MarkdownEditor from '$lib/admin/components/MarkdownEditor.svelte';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import {
		getBlogPost,
		createBlogPost,
		updateBlogPost,
		generateSlug
	} from '$lib/admin/services/blogService';

	let postId = $derived($page.params.id);
	let isNewPost = $derived(postId === 'new');

	let title = $state('');
	let slug = $state('');
	let content = $state('');
	let thumbnail = $state('');
	let published = $state(false);
	let tags = $state<string[]>([]);
	let tagInput = $state('');

	let loading = $state(false);
	let saving = $state(false);
	let error = $state('');
	let success = $state('');
	let autoSlug = $state(true);

	onMount(async () => {
		if (!isNewPost) {
			await loadPost();
		}
	});

	async function loadPost() {
		try {
			loading = true;
			error = '';
			if (!postId) return;
			const post = await getBlogPost(postId);
			title = post.title;
			slug = post.slug;
			content = post.content;
			thumbnail = post.thumbnail || '';
			published = post.published;
			tags = post.tags.map((t) => t.name);
			autoSlug = false;
		} catch (err) {
			logger.error('Error loading post:', err);
			error = 'Failed to load post';
		} finally {
			loading = false;
		}
	}

	function handleTitleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		title = target.value;
		if (autoSlug && isNewPost) {
			slug = generateSlug(title);
		}
	}

	function handleSlugChange(e: Event) {
		const target = e.target as HTMLInputElement;
		slug = target.value;
		autoSlug = false;
	}

	function addTag() {
		const trimmedTag = tagInput.trim();
		if (trimmedTag && !tags.includes(trimmedTag)) {
			tags = [...tags, trimmedTag];
			tagInput = '';
		}
	}

	function removeTag(tagToRemove: string) {
		tags = tags.filter((t) => t !== tagToRemove);
	}

	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag();
		}
	}

	async function handleSave() {
		try {
			saving = true;
			error = '';
			success = '';

			// Validation
			if (!title.trim()) {
				error = 'Title is required';
				return;
			}
			if (!slug.trim()) {
				error = 'Slug is required';
				return;
			}
			if (!content.trim()) {
				error = 'Content is required';
				return;
			}

			if (isNewPost) {
				await createBlogPost({
					title,
					slug,
					content,
					thumbnail: thumbnail || undefined,
					published,
					tags
				});
				success = 'Post created successfully!';
				setTimeout(() => {
					goto('/admin/blog');
				}, 1500);
			} else {
				if (!postId) {
					error = 'Invalid post ID';
					return;
				}
				await updateBlogPost(postId, {
					title,
					slug,
					content,
					thumbnail: thumbnail || undefined,
					published,
					tags
				});
				success = 'Post updated successfully!';
			}
		} catch (err: any) {
			logger.error('Error saving post:', err);
			error = err.message || 'Failed to save post';
		} finally {
			saving = false;
		}
	}

	function handleBack() {
		goto('/admin/blog');
	}
</script>

<div class="blog-editor">
	<div class="editor-header">
		<button class="back-button" onclick={handleBack}>
			<ArrowLeft size={20} />
			Back to Posts
		</button>
		<h1>{isNewPost ? 'New Blog Post' : 'Edit Blog Post'}</h1>
	</div>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading post...</p>
		</div>
	{:else}
		<form
			class="editor-form"
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<!-- Title -->
			<div class="form-group">
				<label for="title">
					Title <span class="required">*</span>
				</label>
				<input
					type="text"
					id="title"
					bind:value={title}
					oninput={handleTitleChange}
					placeholder="Enter post title"
					class="text-input"
					required
				/>
			</div>

			<!-- Slug -->
			<div class="form-group">
				<label for="slug">
					Slug <span class="required">*</span>
					<span class="help-text">URL-friendly version of the title</span>
				</label>
				<div class="slug-input-wrapper">
					<span class="slug-prefix">/blog/</span>
					<input
						type="text"
						id="slug"
						bind:value={slug}
						oninput={handleSlugChange}
						placeholder="post-slug"
						class="text-input slug-input"
						required
					/>
				</div>
			</div>

			<!-- Thumbnail -->
			<div class="form-group">
				<label for="thumbnail">
					Thumbnail Image URL
					<span class="help-text">Optional cover image for the post</span>
				</label>
				<div class="thumbnail-input-wrapper">
					<input
						type="url"
						id="thumbnail"
						bind:value={thumbnail}
						placeholder="https://example.com/image.jpg"
						class="text-input"
					/>
					{#if thumbnail}
						<div class="thumbnail-preview">
							<img src={thumbnail} alt="Thumbnail preview" />
						</div>
					{/if}
				</div>
			</div>

			<!-- Content -->
			<div class="form-group">
				<label for="content">
					Content <span class="required">*</span>
					<span class="help-text">Write your post content in Markdown</span>
				</label>
				<MarkdownEditor bind:value={content} minHeight="500px" />
			</div>

			<!-- Tags -->
			<div class="form-group">
				<label for="tags">
					Tags
					<span class="help-text">Press Enter to add a tag</span>
				</label>
				<div class="tags-input-wrapper">
					<input
						type="text"
						id="tags"
						bind:value={tagInput}
						onkeydown={handleTagKeydown}
						placeholder="Add a tag..."
						class="text-input"
					/>
					<button type="button" class="add-tag-button" onclick={addTag}> Add </button>
				</div>
				{#if tags.length > 0}
					<div class="tags-list">
						{#each tags as tag}
							<span class="tag">
								{tag}
								<button type="button" class="remove-tag" onclick={() => removeTag(tag)}> × </button>
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Published Toggle -->
			<div class="form-group">
				<div class="toggle-wrapper">
					<Toggle bind:checked={published} label="Published" />
					<span class="help-text">Make this post visible to the public</span>
				</div>
			</div>

			<!-- Messages -->
			{#if error}
				<div class="error-message">
					{error}
				</div>
			{/if}

			{#if success}
				<div class="success-message">
					{success}
				</div>
			{/if}

			<!-- Actions -->
			<div class="form-actions">
				<button type="button" class="cancel-button" onclick={handleBack}> Cancel </button>
				<button type="submit" class="save-button" disabled={saving}>
					{#if saving}
						<div class="button-spinner"></div>
						Saving...
					{:else}
						<Save size={18} />
						{isNewPost ? 'Create Post' : 'Update Post'}
					{/if}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.blog-editor {
		padding: 24px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.editor-header {
		margin-bottom: 32px;
	}

	.back-button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-bottom: 16px;
	}

	.back-button:hover {
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #ffffff);
	}

	h1 {
		color: var(--text-primary, #ffffff);
		font-size: 28px;
		margin: 0;
	}

	.loading {
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
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.editor-form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	label {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.required {
		color: #ef4444;
	}

	.help-text {
		color: var(--text-muted, #6b7280);
		font-size: 12px;
		font-weight: 400;
	}

	.text-input {
		padding: 12px 14px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.text-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.text-input::placeholder {
		color: var(--text-muted, #6b7280);
	}

	.slug-input-wrapper {
		display: flex;
		align-items: center;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		overflow: hidden;
		transition: all 0.2s ease;
	}

	.slug-input-wrapper:focus-within {
		border-color: var(--accent-color, #6366f1);
	}

	.slug-prefix {
		padding: 12px 0 12px 14px;
		color: var(--text-muted, #6b7280);
		font-size: 14px;
		font-family: monospace;
	}

	.slug-input {
		border: none;
		border-radius: 0;
		padding-left: 0;
	}

	.slug-input:focus {
		border: none;
	}

	.thumbnail-input-wrapper {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.thumbnail-preview {
		width: 100%;
		max-width: 400px;
		height: 200px;
		border-radius: 8px;
		overflow: hidden;
		background: var(--bg-tertiary, #3a3a3a);
	}

	.thumbnail-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.tags-input-wrapper {
		display: flex;
		gap: 8px;
	}

	.tags-input-wrapper .text-input {
		flex: 1;
	}

	.add-tag-button {
		padding: 12px 24px;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-tag-button:hover {
		background: var(--accent-color, #6366f1);
		border-color: var(--accent-color, #6366f1);
	}

	.tags-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 4px;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 13px;
	}

	.remove-tag {
		background: none;
		border: none;
		color: var(--text-secondary, #a1a1aa);
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: all 0.2s ease;
	}

	.remove-tag:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.toggle-wrapper {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.error-message,
	.success-message {
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 14px;
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.success-message {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}

	.form-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		padding-top: 16px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.cancel-button,
	.save-button {
		padding: 12px 24px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.cancel-button {
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.cancel-button:hover {
		background: var(--bg-secondary, #2d2d2d);
	}

	.save-button {
		background: var(--accent-color, #6366f1);
		border: none;
		color: white;
	}

	.save-button:hover:not(:disabled) {
		background: var(--accent-hover, #5558e3);
	}

	.save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.button-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@media (max-width: 768px) {
		.blog-editor {
			padding: 16px;
		}

		.form-actions {
			flex-direction: column;
		}

		.cancel-button,
		.save-button {
			width: 100%;
			justify-content: center;
		}
	}
</style>
