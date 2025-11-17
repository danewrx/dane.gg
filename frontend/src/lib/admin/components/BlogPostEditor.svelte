<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Save, Upload, X, Settings, ChevronDown } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import MarkdownEditor from './MarkdownEditor.svelte';
	import Toggle from './ui/Toggle.svelte';
	import TagManager from './TagManager.svelte';
	import FileUpload, { type UploadedFile } from './ui/FileUpload.svelte';
	import {
		getBlogPost,
		createBlogPost,
		updateBlogPost,
		generateSlug,
		getAllBlogTags,
		type BlogPost,
		type BlogTag
	} from '$lib/admin/services/blogService';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		save: void;
		close: void;
	}>();

	interface Props {
		postId?: string | null;
	}

	let { postId = null }: Props = $props();

	let isNewPost = $derived(!postId || postId === 'new');

	let title = $state('');
	let slug = $state('');
	let content = $state('');
	let thumbnail = $state('');
	let thumbnailIsExternal = $state(false);
	let thumbnailFilename = $state<string | null>(null);
	let published = $state(false);
	let tags = $state<string[]>([]);
	let availableTags = $state<BlogTag[]>([]);
	let showTagDropdown = $state(false);
	let showTagManager = $state(false);
	let createdAt = $state<string>('');
	let overwriteCreatedDate = $state(false);
	let newCreatedDate = $state('');
	let newCreatedTime = $state('');

	let loading = $state(false);
	let saving = $state(false);
	let autoSlug = $state(true);

	// Autosave state
	let autosaveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let lastSavedAt = $state<Date | null>(null); // Last remote save
	let lastLocalSaveAt = $state<Date | null>(null); // Last local autosave
	let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
	let countdownTimer: ReturnType<typeof setInterval> | null = null;
	let countdownSeconds = $state<number | null>(null);
	let draftPostId = $state<string | null>(null);
	let hasUnsavedChanges = $state(false);
	let isInitialLoad = $state(true);
	let isLoadingFromDatabase = $state(false);
	let loadedBaseline = $state<{ title: string; slug: string; content: string; thumbnail: string; published: boolean; tags: string[] } | null>(null);
	
	// Track restore prompt state
	let showRestorePrompt = $state(false);
	let databasePostData = $state<BlogPost | null>(null);

	onMount(async () => {
		await loadAvailableTags();
	});

	$effect(() => {
		if (postId && postId !== 'new') {
			isInitialLoad = true;
			isLoadingFromDatabase = true;
			
			// Clear any existing autosave timers
			if (autosaveTimer) {
				clearTimeout(autosaveTimer);
				autosaveTimer = null;
			}
			if (countdownTimer) {
				clearInterval(countdownTimer);
				countdownTimer = null;
			}
			countdownSeconds = null;
			
			loadPost();
			draftPostId = postId;
			showRestorePrompt = false;
			databasePostData = null;
		} else {
			isInitialLoad = true;
			title = '';
			slug = '';
			content = '';
			thumbnail = '';
			thumbnailIsExternal = false;
			thumbnailFilename = null;
			published = false;
			tags = [];
			autoSlug = true;
			createdAt = '';
			overwriteCreatedDate = false;
			newCreatedDate = '';
			newCreatedTime = '';
			draftPostId = null;
			autosaveStatus = 'idle';
			lastSavedAt = null;
			lastLocalSaveAt = null;
			hasUnsavedChanges = false;
			showRestorePrompt = false;
			databasePostData = null;
			loadedBaseline = null;
			countdownSeconds = null;
			if (countdownTimer) {
				clearInterval(countdownTimer);
				countdownTimer = null;
			}
			
			setTimeout(() => {
				isInitialLoad = false;
			}, 100);
		}
	});

	// Autosave effect - watches for changes to form fields
                       
	$effect(() => {
		// Skip autosave if loading, saving manually, during initial load, loading from database
		if (loading || saving || isInitialLoad || isLoadingFromDatabase) return;

		// Reference all form fields to ensure tracked
		const _ = title + slug + content + thumbnail + published + tags.join(',');

		if (!title.trim() && !content.trim()) return;

		if (loadedBaseline) {
			const tagsChanged = JSON.stringify([...tags].sort()) !== JSON.stringify([...loadedBaseline.tags].sort());
			const valuesChanged = 
				title !== loadedBaseline.title ||
				slug !== loadedBaseline.slug ||
				content !== loadedBaseline.content ||
				(thumbnail || '') !== loadedBaseline.thumbnail ||
				published !== loadedBaseline.published ||
				tagsChanged;
			
			if (!valuesChanged) return;
		}

		// For new posts, use a temporary key. For existing posts, use the post ID
		const saveId = draftPostId || postId || 'new';

		hasUnsavedChanges = true;

		// Clear existing timers
		if (autosaveTimer) {
			clearTimeout(autosaveTimer);
		}
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}

		// Start countdown from 3 seconds
		countdownSeconds = 3;
		
		// Update countdown every second
		countdownTimer = setInterval(() => {
			if (countdownSeconds !== null && countdownSeconds > 0) {
				countdownSeconds--;
			} else {
				// Countdown finished, clear it
				if (countdownTimer) {
					clearInterval(countdownTimer);
					countdownTimer = null;
				}
				countdownSeconds = null;
			}
		}, 1000);

		// Set new timer for autosave (3 second debounce to match countdown)
		autosaveTimer = setTimeout(() => {
			if (countdownTimer) {
				clearInterval(countdownTimer);
				countdownTimer = null;
			}
			countdownSeconds = null;
			performAutosave();
		}, 3000);

		return () => {
			if (autosaveTimer) {
				clearTimeout(autosaveTimer);
			}
			if (countdownTimer) {
				clearInterval(countdownTimer);
			}
		};
	});

	async function loadAvailableTags() {
		try {
			availableTags = await getAllBlogTags();
		} catch (err) {
			console.error('Error loading tags:', err);
		}
	}

	async function loadPost() {
		try {
			loading = true;
			if (!postId) return;
			const post = await getBlogPost(postId);
			
			// Check localStorage for autosaved version
			const autosaveKey = `blog_autosave_${post.id}`;
			let autosaveData: any = null;
			try {
				const autosaveStr = localStorage.getItem(autosaveKey);
				if (autosaveStr) {
					autosaveData = JSON.parse(autosaveStr);
					
					const dbTags = [...post.tags.map(t => t.name)].sort().join(',');
					const autosaveTags = [...(autosaveData.tags || [])].sort().join(',');
					
					const contentMatches = 
						autosaveData.title === post.title &&
						autosaveData.slug === post.slug &&
						autosaveData.content === post.content &&
						(autosaveData.thumbnail || '') === (post.thumbnail || '') &&
						autosaveData.published === post.published &&
						dbTags === autosaveTags;
					
					if (contentMatches) {
						localStorage.removeItem(autosaveKey);
						lastLocalSaveAt = null;
					} else {
						lastLocalSaveAt = new Date(autosaveData.timestamp);
						const autosaveTime = new Date(autosaveData.timestamp).getTime();
						const dbUpdateTime = new Date(post.updatedAt).getTime();
						
						// If localStorage has a newer autosave than the database, prompt to restore
						if (autosaveTime > dbUpdateTime) {
							databasePostData = {
								...post,
								title: autosaveData.title,
								slug: autosaveData.slug,
								content: autosaveData.content,
								thumbnail: autosaveData.thumbnail,
								published: autosaveData.published,
								tags: autosaveData.tags.map((name: string) => ({ id: '', name })),
								updatedAt: autosaveData.timestamp
							};
							showRestorePrompt = true;
						} else {
							localStorage.removeItem(autosaveKey);
							lastLocalSaveAt = null;
						}
					}
				} else {
					lastLocalSaveAt = null;
				}
			} catch (e) {
				// Ignore localStorage errors
				console.warn('Could not check localStorage for autosave:', e);
				lastLocalSaveAt = null;
			}
			
			// Always load the post data from database (not from autosave)
			// User will see the prompt if there's a newer autosave
			untrack(() => {
				title = post.title;
				slug = post.slug;
				content = post.content;
				thumbnail = post.thumbnail || '';
				// Determine if thumbnail is external or upload
				if (thumbnail) {
					thumbnailIsExternal = thumbnail.startsWith('http://') || thumbnail.startsWith('https://');
					if (!thumbnailIsExternal && thumbnail.startsWith('/uploads/')) {
						thumbnailFilename = thumbnail.replace('/uploads/', '');
					} else {
						thumbnailFilename = null;
					}
				} else {
					thumbnailIsExternal = false;
					thumbnailFilename = null;
				}
				published = post.published;
				tags = post.tags.map(t => t.name);
				createdAt = post.createdAt;
				const { date, time } = splitDateTime(post.createdAt);
				newCreatedDate = date;
				newCreatedTime = time;
				autoSlug = false;
				draftPostId = post.id;
				hasUnsavedChanges = false;
				autosaveStatus = 'idle';
				lastSavedAt = new Date(post.updatedAt);
				
				// Store baseline values to compare against for autosave
				loadedBaseline = {
					title: post.title,
					slug: post.slug,
					content: post.content,
					thumbnail: post.thumbnail || '',
					published: post.published,
					tags: post.tags.map(t => t.name)
				};
			});
			
			setTimeout(() => {
				isInitialLoad = false;
				setTimeout(() => {
					isLoadingFromDatabase = false;
				}, 100);
			}, 300);
		} catch (err) {
			console.error('Error loading post:', err);
			toast.error('Failed to load post', {
				description: 'Please try again'
			});
			isInitialLoad = false;
			isLoadingFromDatabase = false;
		} finally {
			loading = false;
		}
	}
	
	async function handleRestoreAutosave() {
		if (!databasePostData || !postId) return;
		
		try {
			saving = true;
			
			await updateBlogPost(postId, {
				title: databasePostData.title,
				slug: databasePostData.slug,
				content: databasePostData.content,
				thumbnail: databasePostData.thumbnail || undefined,
				published: databasePostData.published,
				tags: databasePostData.tags.map(t => t.name)
			});
			
			title = databasePostData.title;
			slug = databasePostData.slug;
			content = databasePostData.content;
			thumbnail = databasePostData.thumbnail || '';
			if (thumbnail) {
				thumbnailIsExternal = thumbnail.startsWith('http://') || thumbnail.startsWith('https://');
				if (!thumbnailIsExternal && thumbnail.startsWith('/uploads/')) {
					thumbnailFilename = thumbnail.replace('/uploads/', '');
				} else {
					thumbnailFilename = null;
				}
			} else {
				thumbnailIsExternal = false;
				thumbnailFilename = null;
			}
			published = databasePostData.published;
			tags = databasePostData.tags.map(t => t.name);
			
			try {
				localStorage.removeItem(`blog_autosave_${postId}`);
			} catch (e) {
				// Ignore localStorage errors
			}
			
			lastSavedAt = new Date();
			lastLocalSaveAt = null;
			hasUnsavedChanges = false;
			showRestorePrompt = false;
			databasePostData = null;
			
			toast.success('Autosave restored and saved', {
				description: 'Your last autosave has been restored and saved to the database'
			});
		} catch (err: any) {
			console.error('Error restoring autosave:', err);
			toast.error('Failed to restore autosave', {
				description: err.message || 'Please try again'
			});
		} finally {
			saving = false;
		}
	}
	
	function handleDismissRestore() {
		const saveId = postId || draftPostId;
		if (saveId) {
			try {
				localStorage.removeItem(`blog_autosave_${saveId}`);
				lastLocalSaveAt = null;
			} catch (e) {
				// Ignore localStorage errors
				console.warn('Could not clear localStorage autosave:', e);
			}
		}
		showRestorePrompt = false;
		databasePostData = null;
	}

	function performAutosave() {
		if (!hasUnsavedChanges) return;

		if (saving) return;

		// For new posts, use a temporary key. For existing posts, use the post ID
		const saveId = draftPostId || postId || 'new';

		// Clear countdown
		if (countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
		}
		countdownSeconds = null;

		try {
			autosaveStatus = 'saving';

			// Generate slug for new posts if autoSlug is enabled and slug is empty
			let finalSlug = slug.trim();
			if (isNewPost && autoSlug && !finalSlug && title.trim()) {
				finalSlug = generateSlug(title);
			}

			// Save to localStorage only
			const autosaveData = {
				title: title.trim(),
				slug: finalSlug,
				content: content.trim(),
				thumbnail: thumbnail.trim() || '',
				published: published,
				tags: tags,
				timestamp: new Date().toISOString()
			};
			
			try {
				localStorage.setItem(`blog_autosave_${saveId}`, JSON.stringify(autosaveData));
				autosaveStatus = 'saved';
				lastLocalSaveAt = new Date(); // Update local save time
				hasUnsavedChanges = false;

				// Reset status to idle after 3 seconds
				setTimeout(() => {
					if (autosaveStatus === 'saved') {
						autosaveStatus = 'idle';
					}
				}, 3000);
			} catch (e) {
				console.warn('Could not save to localStorage:', e);
				autosaveStatus = 'error';
				// Reset error status after 5 seconds
				setTimeout(() => {
					if (autosaveStatus === 'error') {
						autosaveStatus = 'idle';
					}
				}, 5000);
			}
		} catch (err: any) {
			console.error('Error autosaving:', err);
			autosaveStatus = 'error';
			// Reset error status after 5 seconds
			setTimeout(() => {
				if (autosaveStatus === 'error') {
					autosaveStatus = 'idle';
				}
			}, 5000);
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
		let value = target.value;
		
		// Replace spaces with hyphens
		value = value.replace(/\s+/g, '-');
		
		// Only allow alphanumeric characters and hyphens
		// Remove any invalid characters
		value = value.replace(/[^a-zA-Z0-9-]/g, '');
		
		// Remove consecutive hyphens
		value = value.replace(/-+/g, '-');
		
		// Remove leading and trailing hyphens
		value = value.replace(/^-+|-+$/g, '');
		
		slug = value;
		autoSlug = false;
	}

	function toggleTag(tagName: string) {
		if (tags.includes(tagName)) {
			tags = tags.filter(t => t !== tagName);
		} else {
			tags = [...tags, tagName];
		}
	}

	function removeTag(tagToRemove: string) {
		tags = tags.filter(t => t !== tagToRemove);
	}

	function toggleDropdown() {
		showTagDropdown = !showTagDropdown;
	}

	function openTagManager() {
		showTagManager = true;
		showTagDropdown = false;
	}

	function closeTagManager() {
		showTagManager = false;
	}

	async function handleTagsUpdated() {
		await loadAvailableTags();
	}

	function splitDateTime(dateString: string): { date: string; time: string } {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		
		return {
			date: `${year}-${month}-${day}`,
			time: `${hours}:${minutes}`
		};
	}

	function formatDateTimeDisplay(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function combineDateTime(date: string, time: string): string {
		return `${date}T${time}:00.000Z`;
	}

	async function handleSave() {
		// Clear autosave timer
		if (autosaveTimer) {
			clearTimeout(autosaveTimer);
			autosaveTimer = null;
		}

		try {
			saving = true;
			autosaveStatus = 'saving';

			// Validation
			if (!title.trim()) {
				toast.error('Title is required', {
					description: 'Please enter a title for your post'
				});
				autosaveStatus = 'idle';
				return;
			}
			if (!slug.trim()) {
				toast.error('Slug is required', {
					description: 'Please enter a URL slug for your post'
				});
				autosaveStatus = 'idle';
				return;
			}
			if (!content.trim()) {
				toast.error('Content is required', {
					description: 'Please add some content to your post'
				});
				autosaveStatus = 'idle';
				return;
			}

			const postData: any = {
				title: title.trim(),
				slug: slug.trim(),
				content: content.trim(),
				thumbnail: thumbnail.trim() || undefined,
				published,
				tags
			};

			if (!isNewPost && overwriteCreatedDate && newCreatedDate && newCreatedTime) {
				postData.createdAt = combineDateTime(newCreatedDate, newCreatedTime);
			}

			const saveId = draftPostId || postId;

			if (isNewPost && !draftPostId) {
				const savedPost = await createBlogPost(postData);
				draftPostId = savedPost.id;
				
				try {
					const newAutosave = localStorage.getItem('blog_autosave_new');
					if (newAutosave) {
						localStorage.setItem(`blog_autosave_${savedPost.id}`, newAutosave);
						localStorage.removeItem('blog_autosave_new');
					}
				} catch (e) {
					// Ignore localStorage errors
				}
				
				toast.success('Post created!', {
					description: `"${title}" has been created successfully`
				});
			} else {
				if (!saveId) return;
				await updateBlogPost(saveId, postData);
				toast.success('Post updated!', {
					description: `"${title}" has been updated successfully`
				});
			}

			autosaveStatus = 'saved';
			lastSavedAt = new Date();
			hasUnsavedChanges = false;

			// Update baseline to current values after manual save
			loadedBaseline = {
				title: title.trim(),
				slug: slug.trim(),
				content: content.trim(),
				thumbnail: thumbnail.trim() || '',
				published: published,
				tags: [...tags]
			};

			// Clear localStorage autosave
			const autosaveKey = draftPostId || postId || 'new';
			try {
				localStorage.removeItem(`blog_autosave_${autosaveKey}`);
				lastLocalSaveAt = null;
			} catch (e) {
				// Ignore localStorage errors
			}

			dispatch('save');
			dispatch('close');
		} catch (err: any) {
			console.error('Error saving post:', err);
			toast.error('Failed to save post', {
				description: err.message || 'Please try again'
			});
			autosaveStatus = 'error';
		} finally {
			saving = false;
		}
	}

	function handleClose() {
		dispatch('close');
	}

	function handleThumbnailUpload(file: UploadedFile | UploadedFile[]) {
		// Set thumbnail to the file path
		const uploadedFile = Array.isArray(file) ? file[0] : file;
		if (uploadedFile) {
			thumbnail = uploadedFile.path;
			thumbnailIsExternal = uploadedFile.isExternal || false;
			if (!thumbnailIsExternal && uploadedFile.path.startsWith('/uploads/')) {
				thumbnailFilename = uploadedFile.path.replace('/uploads/', '');
			} else {
				thumbnailFilename = null;
			}
		}
	}

	async function handleRemoveThumbnail() {
		if (!thumbnailIsExternal && thumbnailFilename) {
			try {
				const response = await fetch(`/api/upload/${thumbnailFilename}`, {
					method: 'DELETE',
					credentials: 'include'
				});

				if (!response.ok) {
					console.error('Failed to delete uploaded file');
				}
			} catch (error) {
				console.error('Error deleting uploaded file:', error);
			}
		}

		thumbnail = '';
		thumbnailIsExternal = false;
		thumbnailFilename = null;
	}

	function getThumbnailUrl(path: string): string {
		// If it's an external URL, just return it
		if (path.startsWith('http://') || path.startsWith('https://')) {
			return path;
		}
		// If it starts with /uploads/, serve through the API
		if (path.startsWith('/uploads/')) {
			const filename = path.replace('/uploads/', '');
			return `/api/upload/file/${filename}`;
		}
		return path;
	}
</script>

<div class="editor-container">
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading post...</p>
		</div>
	{:else}
		<div class="editor-form">
			<!-- Autosave Status -->
			<div class="autosave-status">
				{#if autosaveStatus === 'saving'}
					<span class="status-indicator saving">
						<div class="status-spinner"></div>
						<span>Saving...</span>
					</span>
				{:else if autosaveStatus === 'error'}
					<span class="status-indicator error">
						<span>Save failed</span>
						<div class="status-times">
							{#if lastSavedAt}
								<span class="status-time">
									Remote: {new Date(lastSavedAt).toLocaleString()}
								</span>
							{/if}
							{#if lastLocalSaveAt}
								<span class="status-time">
									Local: {new Date(lastLocalSaveAt).toLocaleString()}
								</span>
							{/if}
						</div>
					</span>
				{:else if countdownSeconds !== null && countdownSeconds > 0}
					<span class="status-indicator countdown">
						<span>Saving in {countdownSeconds}...</span>
						<div class="status-times">
							{#if lastSavedAt}
								<span class="status-time">
									Remote: {new Date(lastSavedAt).toLocaleString()}
								</span>
							{/if}
							{#if lastLocalSaveAt}
								<span class="status-time">
									Local: {new Date(lastLocalSaveAt).toLocaleString()}
								</span>
							{/if}
						</div>
					</span>
				{:else if hasUnsavedChanges}
					<span class="status-indicator idle">
						<span>Unsaved changes</span>
						<div class="status-times">
							{#if lastSavedAt}
								<span class="status-time">
									Remote: {new Date(lastSavedAt).toLocaleString()}
								</span>
							{/if}
							{#if lastLocalSaveAt}
								<span class="status-time">
									Local: {new Date(lastLocalSaveAt).toLocaleString()}
								</span>
							{/if}
						</div>
					</span>
				{:else if lastSavedAt || lastLocalSaveAt}
					<span class="status-indicator saved">
						<div class="status-times">
							{#if lastSavedAt}
								<span class="status-time">
									Remote: {new Date(lastSavedAt).toLocaleString()}
								</span>
							{/if}
							{#if lastLocalSaveAt}
								<span class="status-time">
									Local: {new Date(lastLocalSaveAt).toLocaleString()}
								</span>
							{/if}
						</div>
					</span>
				{:else}
					<span class="status-indicator idle">
						<span>Not saved yet</span>
					</span>
				{/if}
			</div>

			<!-- Title -->
			<div class="form-group">
				<label for="title">Title</label>
				<input
					type="text"
					id="title"
					value={title}
					oninput={handleTitleChange}
					placeholder="Enter post title"
					class="form-input"
				/>
			</div>

			<!-- Slug -->
			<div class="form-group">
				<label for="slug">Slug (URL)</label>
				<input
					type="text"
					id="slug"
					value={slug}
					oninput={handleSlugChange}
					placeholder="post-url-slug"
					class="form-input slug-input"
				/>
				<p class="help-text">URL: /blog/{slug || 'post-url-slug'}</p>
			</div>

			<!-- Created Date (existing posts) -->
			{#if !isNewPost && createdAt}
				<div class="form-group">
					<label for="created-date">Created Date</label>
					<div class="created-date-display">
						<div class="date-info">
							<span class="date-value">{formatDateTimeDisplay(createdAt)}</span>
						</div>
						<label class="overwrite-checkbox">
							<input
								type="checkbox"
								bind:checked={overwriteCreatedDate}
							/>
							<span>Overwrite creation date</span>
						</label>
					</div>
					{#if overwriteCreatedDate}
						<div class="datetime-inputs">
							<div class="input-group">
								<label for="created-date-input">Date</label>
								<input
									type="date"
									id="created-date-input"
									bind:value={newCreatedDate}
									class="form-input date-input"
								/>
							</div>
							<div class="input-group">
								<label for="created-time-input">Time</label>
								<input
									type="time"
									id="created-time-input"
									bind:value={newCreatedTime}
									class="form-input time-input"
								/>
							</div>
						</div>
						<p class="help-text warning">⚠️ Changing the creation date will affect post sorting and timestamps</p>
					{/if}
				</div>
			{/if}

			<!-- Thumbnail -->
			<div class="form-group">
				<label for="thumbnail">Cover Image</label>
				<div class="thumbnail-input-group">
					{#if thumbnail}
						<div class="thumbnail-preview-container">
							<div class="thumbnail-preview">
								<img src={getThumbnailUrl(thumbnail)} alt="Thumbnail preview" onerror={(e) => {
									console.error('Failed to load thumbnail:', thumbnail);
									(e.target as HTMLImageElement).style.display = 'none';
								}} />
								<button
									type="button"
									class="remove-thumbnail"
									onclick={handleRemoveThumbnail}
									aria-label="Remove thumbnail"
								>
									<X size={16} />
								</button>
							</div>
						</div>
					{:else}
						<FileUpload
							acceptedTypes={['image']}
							maxSize={10 * 1024 * 1024}
							multiple={false}
							label="Upload Cover Image"
							showPreview={false}
							onUpload={handleThumbnailUpload}
						/>
					{/if}
				</div>
			</div>

			<!-- Content -->
			<div class="form-group">
				<label for="content">Content (Markdown)</label>
				<MarkdownEditor bind:value={content} minHeight="500px" placeholder="Write your post content in Markdown..." />
			</div>

			<!-- Tags -->
			<div class="form-group">
				<div class="tags-header">
					<label for="tags">Tags</label>
					<button type="button" onclick={openTagManager} class="manage-tags-button">
						<Settings size={16} />
						Manage Tags
					</button>
				</div>
				
				<div class="tags-dropdown-container">
					<button type="button" onclick={toggleDropdown} class="tags-dropdown-button">
						<span>{tags.length > 0 ? `${tags.length} tag${tags.length > 1 ? 's' : ''} selected` : 'Select tags'}</span>
						<ChevronDown size={18} class={showTagDropdown ? 'rotate' : ''} />
					</button>

					{#if showTagDropdown}
						<div class="tags-dropdown">
							{#if availableTags.length === 0}
								<div class="dropdown-empty">
									<p>No tags available</p>
									<button type="button" onclick={openTagManager} class="create-tag-button">
										Create Tag
									</button>
								</div>
							{:else}
								{#each availableTags as tag}
									<label class="tag-option">
										<input
											type="checkbox"
											checked={tags.includes(tag.name)}
											onchange={() => toggleTag(tag.name)}
										/>
										<span>{tag.name}</span>
									</label>
								{/each}
							{/if}
						</div>
					{/if}
				</div>

				{#if tags.length > 0}
					<div class="selected-tags">
						{#each tags as tag}
							<span class="tag">
								{tag}
								<button type="button" onclick={() => removeTag(tag)} class="remove-tag" aria-label="Remove tag">
									<X size={14} />
								</button>
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Published Toggle -->
			<div class="form-group">
				<Toggle bind:checked={published} label="Published" />
				<p class="help-text">
					{published ? 'This post is visible to the public' : 'This post is a draft and not visible to the public'}
				</p>
			</div>

			<!-- Actions -->
			<div class="form-actions">
				<button type="button" onclick={handleClose} class="button button-secondary" disabled={saving}>
					Cancel
				</button>
				<button type="button" onclick={handleSave} class="button button-primary" disabled={saving}>
					{#if saving}
						<div class="button-spinner"></div>
						Saving...
					{:else}
						<Save size={18} />
						{isNewPost ? 'Create Post' : 'Update Post'}
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>

<!-- Tag Manager Dialog -->
{#if showTagManager}
	<TagManager on:close={closeTagManager} on:tagsUpdated={handleTagsUpdated} />
{/if}

<!-- Restore Autosave Prompt -->
{#if showRestorePrompt && databasePostData}
	<div 
		class="restore-prompt-overlay" 
		onclick={handleDismissRestore}
		onkeydown={(e) => e.key === 'Enter' && handleDismissRestore()}
		role="button"
		tabindex="0"
		aria-label="Close restore prompt"
	>
		<div 
			class="restore-prompt" 
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="restore-prompt-title"
			tabindex="0"
		>
			<div class="prompt-header">
				<h3 id="restore-prompt-title">Unsaved Changes Detected</h3>
			</div>
			<div class="prompt-content">
				<p>This post was autosaved locally on <strong>{new Date(databasePostData.updatedAt).toLocaleString()}</strong>.</p>
				<p>Would you like to restore and save the autosaved version to the database?</p>
			</div>
			<div class="prompt-actions">
				<button type="button" class="button button-secondary" onclick={handleDismissRestore}>
					Continue with current version
				</button>
				<button type="button" class="button button-primary" onclick={handleRestoreAutosave}>
					Restore autosave
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.editor-container {
		width: 100%;
		max-width: 100%;
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
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
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

	.form-group label {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 500;
	}

	.form-input {
		padding: 10px 14px;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
		background: var(--bg-secondary, #2d2d2d);
	}

	.slug-input {
		font-family: 'Courier New', monospace;
	}

	.help-text {
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
		margin: 0;
	}

	.help-text.warning {
		color: #f59e0b;
		font-weight: 500;
	}

	.created-date-display {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 14px;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
	}

	.date-info {
		flex: 1;
	}

	.date-value {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 500;
	}

	.overwrite-checkbox {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		user-select: none;
	}

	.overwrite-checkbox input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
		accent-color: var(--accent-color, #6366f1);
	}

	.overwrite-checkbox span {
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
		white-space: nowrap;
	}

	.datetime-inputs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 12px;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.input-group label {
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
		font-weight: 500;
	}

	.date-input,
	.time-input {
		font-family: 'Courier New', monospace;
		font-size: 14px;
	}

	@media (max-width: 480px) {
		.datetime-inputs {
			grid-template-columns: 1fr;
		}
	}

	.thumbnail-input-group {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.thumbnail-preview-container {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.thumbnail-preview {
		position: relative;
		width: 100%;
		max-width: 400px;
		height: 250px;
		border-radius: 6px;
		overflow: hidden;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.thumbnail-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.remove-thumbnail {
		position: absolute;
		top: 8px;
		right: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: rgba(0, 0, 0, 0.7);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.remove-thumbnail:hover {
		background: rgba(239, 68, 68, 0.9);
		border-color: #ef4444;
	}


	.tags-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}

	.manage-tags-button {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: transparent;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.manage-tags-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
		border-color: var(--accent-color, #6366f1);
	}

	.tags-dropdown-container {
		position: relative;
	}

	.tags-dropdown-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.tags-dropdown-button:hover {
		border-color: var(--accent-color, #6366f1);
	}

	.tags-dropdown-button :global(.rotate) {
		transform: rotate(180deg);
		transition: transform 0.2s ease;
	}

	.tags-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		max-height: 300px;
		overflow-y: auto;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		z-index: 100;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.dropdown-empty {
		padding: 24px;
		text-align: center;
	}

	.dropdown-empty p {
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		margin: 0 0 12px 0;
	}

	.create-tag-button {
		padding: 8px 16px;
		background: var(--accent-color, #6366f1);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.create-tag-button:hover {
		background: var(--accent-hover, #5558e3);
	}

	.tag-option {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.tag-option:hover {
		background: var(--bg-secondary, #2d2d2d);
	}

	.tag-option input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
		accent-color: var(--accent-color, #6366f1);
	}

	.tag-option span {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.selected-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 12px;
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
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2px;
		background: none;
		border: none;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		border-radius: 3px;
		transition: all 0.2s ease;
	}

	.remove-tag:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.form-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		padding-top: 24px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 20px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
	}

	.button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.button-secondary {
		background: transparent;
		color: var(--text-primary, #ffffff);
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.button-secondary:hover:not(:disabled) {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.button-primary {
		background: var(--accent-color, #6366f1);
		color: white;
	}

	.button-primary:hover:not(:disabled) {
		background: var(--accent-hover, #5558e3);
	}

	.button-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.autosave-status {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: 8px 0;
		min-height: 32px;
	}

	.status-indicator {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
	}

	.status-indicator.saving {
		flex-direction: row;
		color: var(--accent-color, #6366f1);
	}

	.status-times {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		margin-top: 2px;
	}

	.status-indicator.saved {
		color: #10b981;
	}

	.status-indicator.error {
		color: #ef4444;
	}

	.status-indicator.idle {
		color: var(--text-secondary, #a1a1aa);
	}

	.status-indicator.countdown {
		color: var(--accent-color, #6366f1);
		font-weight: 500;
	}

	.status-spinner {
		width: 12px;
		height: 12px;
		border: 2px solid var(--accent-color, #6366f1);
		border-top: 2px solid transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.status-time {
		font-size: 11px;
		opacity: 0.7;
	}

	.restore-prompt-overlay {
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
		backdrop-filter: blur(4px);
	}

	.restore-prompt {
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 12px;
		padding: 24px;
		max-width: 500px;
		width: 90%;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.prompt-header {
		margin-bottom: 16px;
	}

	.prompt-header h3 {
		color: var(--text-primary, #ffffff);
		font-size: 20px;
		font-weight: 600;
		margin: 0;
	}

	.prompt-content {
		margin-bottom: 24px;
	}

	.prompt-content p {
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		line-height: 1.6;
		margin: 0 0 12px 0;
	}

	.prompt-content p:last-child {
		margin-bottom: 0;
	}

	.prompt-content strong {
		color: var(--text-primary, #ffffff);
		font-weight: 600;
	}

	.prompt-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}
</style>

