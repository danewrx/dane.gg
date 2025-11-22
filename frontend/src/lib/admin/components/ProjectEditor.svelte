<script lang="ts">
	import { onMount } from 'svelte';
	import { Save, Upload, X, Settings, ChevronDown, Image } from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import type { ComponentType } from 'svelte';
	import UnifiedIconPicker from './ui/UnifiedIconPicker.svelte';
	import { getAllIcons as getAllIconLibraryIcons, type IconOption } from '$lib/admin/services/iconLibraryService';
	import { toast } from 'svelte-sonner';
	import MarkdownEditor from './MarkdownEditor.svelte';
	import Toggle from './ui/Toggle.svelte';
	import FileUpload, { type UploadedFile } from './ui/FileUpload.svelte';
	import ProjectCategoryManager from './ProjectCategoryManager.svelte';
	import {
		getProject,
		createProject,
		updateProject,
		getAllProjectCategories,
		type Project,
		type ProjectCategory,
		type ProjectTag
	} from '$lib/admin/services/projectsService';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		save: void;
		close: void;
	}>();

	interface Props {
		projectId?: string | null;
	}

	let { projectId = null }: Props = $props();

	let isNewProject = $derived(!projectId || projectId === 'new');

	let title = $state('');
	let description = $state('');
	let categoryId = $state('');
	let imageUrl = $state('');
	let imageUrlIsExternal = $state(false);
	let imageUrlFilename = $state<string | null>(null);
	let active = $state('Active');
	let published = $state(false);
	let featured = $state(false);
	let projectUrl = $state('');
	let projectText = $state('View Project');
	let projectTextCustom = $state(false);
	let projectTextDropdown = $state('View Project');
	let projectIcon = $state<string | null>(null);
	let projectIconOption = $state<IconOption | null>(null);
	let projectIconPickerOpen = $state(false);
	let repoUrl = $state('');
	let repoText = $state('View Repository');
	let repoTextCustom = $state(false);
	let repoTextDropdown = $state('View Repository');
	let repoIcon = $state<string | null>(null);
	let repoIconOption = $state<IconOption | null>(null);
	let repoIconPickerOpen = $state(false);
	let tagIds = $state<string[]>([]);

	// Predefined button text options
	const projectButtonOptions = [
		'View Project',
		'View Website',
		'Visit Website',
		'View Demo',
		'View App',
		'View Snippet',
		'Listen Now',
		'Watch Now',
		'Custom...'
	];

	const repoButtonOptions = [
		'View Source',
		'View Code',
		'View Repository',
		'View on GitHub',
		'View on GitLab',
		'View on Bitbucket',
        'View on Codeberg',
        'View on Git Server',
		'Custom...'
	];
	let createdAt = $state<string>('');
	let overwriteCreatedDate = $state(false);
	let newCreatedDate = $state('');
	let newCreatedTime = $state('');

	let categories = $state<ProjectCategory[]>([]);
	let availableTags = $state<ProjectTag[]>([]);
	let showTagDropdown = $state(false);
	let showCategoryManager = $state(false);

	let loading = $state(false);
	let saving = $state(false);

	const activeStates = ['Active', 'Complete', 'Abandoned', 'Archived'];

	// Helper to convert icon name string to IconOption
	async function iconNameToOption(iconName: string | null): Promise<IconOption | null> {
		if (!iconName) return null;
		const allIcons = await getAllIconLibraryIcons();
		const lucideIcon = allIcons.find(icon => icon.type === 'lucide' && icon.iconName === iconName);
		if (lucideIcon) return lucideIcon;
		return allIcons.find(icon => icon.name === iconName) || null;
	}

	function iconOptionToName(icon: IconOption | null): string | null {
		if (!icon) return null;
		if (icon.type === 'lucide' && icon.iconName) {
			return icon.iconName;
		}
		return icon.name;
	}

	function getIconRenderInfo(icon: IconOption | null): { type: 'lucide' | 'iconify' | 'svg' | 'text' | null; component?: ComponentType; icon?: string; url?: string; text?: string } {
		if (!icon) return { type: null };
		
		if (icon.type === 'lucide' && icon.lucideComponent) {
			return { type: 'lucide', component: icon.lucideComponent as ComponentType };
		} else if (icon.type === 'coreui-brand' && icon.iconSet && icon.iconName) {
			return { type: 'iconify', icon: `${icon.iconSet}:${icon.iconName}` };
		} else if (icon.type === 'svg-url' && icon.svgUrl) {
			return { type: 'svg', url: icon.svgUrl };
		} else if (icon.type === 'custom-text' && icon.text) {
			return { type: 'text', text: icon.text };
		}
		
		return { type: null };
	}

	onMount(async () => {
		await Promise.all([
			loadCategories(),
			loadAvailableTags()
		]);
	});

	let lastProjectId = $state<string | null>(null);
	
	$effect(() => {
		if (projectId !== lastProjectId) {
			lastProjectId = projectId;
			
			if (projectId && projectId !== 'new') {
				loadProject();
			} else {
				// Reset form for new project
				title = '';
				description = '';
				categoryId = '';
				imageUrl = '';
				imageUrlIsExternal = false;
				imageUrlFilename = null;
				active = 'Active';
				published = false;
				featured = false;
				projectUrl = '';
				projectText = 'View Project';
				projectTextCustom = false;
				projectTextDropdown = 'View Project';
				projectIcon = null;
				projectIconOption = null;
				repoUrl = '';
				repoText = 'View Repository';
				repoTextCustom = false;
				repoTextDropdown = 'View Repository';
				repoIcon = null;
				repoIconOption = null;
				tagIds = [];
				createdAt = '';
				overwriteCreatedDate = false;
				newCreatedDate = '';
				newCreatedTime = '';
			}
		}
	});

	async function loadCategories() {
		try {
			categories = await getAllProjectCategories();
		} catch (err) {
			console.error('Error loading categories:', err);
			toast.error('Failed to load categories');
		}
	}

	async function handleCategoryManagerClose() {
		showCategoryManager = false;
		await loadCategories();
	}

	async function loadAvailableTags() {
		try {
			const response = await fetch('/api/projects/admin/tags/all?grouped=true', {
				credentials: 'include'
			});
			if (response.ok) {
				const result = await response.json();
				const allTags: ProjectTag[] = [];
				result.data.forEach((group: { tags: ProjectTag[] }) => {
					allTags.push(...group.tags);
				});
				availableTags = allTags;
			}
		} catch (err) {
			console.error('Error loading tags:', err);
		}
	}

	async function loadProject() {
		if (!projectId) return;
		try {
			loading = true;
			const project = await getProject(projectId);
			title = project.title;
			description = project.description;
			categoryId = project.categoryId;
			imageUrl = project.imageUrl || '';
			imageUrlIsExternal = imageUrl ? (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) : false;
			if (!imageUrlIsExternal && imageUrl && imageUrl.startsWith('/uploads/')) {
				imageUrlFilename = imageUrl.replace('/uploads/', '');
			} else {
				imageUrlFilename = null;
			}
			active = project.active;
			published = project.published;
			featured = project.featured;
			projectUrl = project.projectUrl || '';
			const savedProjectText = project.projectText || 'View Project';
			if (projectButtonOptions.slice(0, -1).includes(savedProjectText)) {
				projectText = savedProjectText;
				projectTextDropdown = savedProjectText;
				projectTextCustom = false;
			} else {
				projectText = savedProjectText;
				projectTextDropdown = 'Custom...';
				projectTextCustom = true;
			}
			projectIcon = project.projectIcon || null;
			projectIconOption = await iconNameToOption(project.projectIcon || null);
			repoUrl = project.repoUrl || '';
			const savedRepoText = project.repoText || 'View Repository';
			if (repoButtonOptions.slice(0, -1).includes(savedRepoText)) {
				repoText = savedRepoText;
				repoTextDropdown = savedRepoText;
				repoTextCustom = false;
			} else {
				repoText = savedRepoText;
				repoTextDropdown = 'Custom...';
				repoTextCustom = true;
			}
			repoIcon = project.repoIcon || null;
			repoIconOption = await iconNameToOption(project.repoIcon || null);
			tagIds = project.tags.map(t => t.id);
			createdAt = project.createdAt;
		} catch (err) {
			console.error('Error loading project:', err);
			toast.error('Failed to load project');
		} finally {
			loading = false;
		}
	}

	function toggleTag(tagId: string) {
		if (tagIds.includes(tagId)) {
			tagIds = tagIds.filter(id => id !== tagId);
		} else {
			tagIds = [...tagIds, tagId];
		}
	}

	function handleProjectTextChange(value: string) {
		projectTextDropdown = value;
		if (value === 'Custom...') {
			projectTextCustom = true;
			projectText = '';
		} else {
			projectTextCustom = false;
			projectText = value;
		}
	}

	function handleRepoTextChange(value: string) {
		repoTextDropdown = value;
		if (value === 'Custom...') {
			repoTextCustom = true;
			repoText = '';
		} else {
			repoTextCustom = false;
			repoText = value;
		}
	}

	function switchToProjectDropdown() {
		projectTextCustom = false;
		projectTextDropdown = 'View Project';
		projectText = 'View Project';
	}

	function switchToRepoDropdown() {
		repoTextCustom = false;
		repoTextDropdown = 'View Repository';
		repoText = 'View Repository';
	}

	function removeTag(tagIdToRemove: string) {
		tagIds = tagIds.filter(id => id !== tagIdToRemove);
	}

	function toggleDropdown() {
		showTagDropdown = !showTagDropdown;
	}

	function handleImageUpload(file: UploadedFile | UploadedFile[]) {
		const uploadedFile = Array.isArray(file) ? file[0] : file;
		if (uploadedFile) {
			imageUrl = uploadedFile.path;
			imageUrlIsExternal = uploadedFile.isExternal || false;
			if (!imageUrlIsExternal && uploadedFile.path.startsWith('/uploads/')) {
				imageUrlFilename = uploadedFile.path.replace('/uploads/', '');
			} else {
				imageUrlFilename = null;
			}
		}
	}

	async function handleRemoveImage() {
		if (!imageUrlIsExternal && imageUrlFilename) {
			try {
				const response = await fetch(`/api/upload/${imageUrlFilename}`, {
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
		imageUrl = '';
		imageUrlIsExternal = false;
		imageUrlFilename = null;
	}

	function getImageUrl(path: string): string {
		if (path.startsWith('http://') || path.startsWith('https://')) {
			return path;
		}
		if (path.startsWith('/uploads/')) {
			const filename = path.replace('/uploads/', '');
			return `/api/upload/file/${filename}`;
		}
		return path;
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
		try {
			saving = true;

			// Validation
			if (!title.trim()) {
				toast.error('Title is required', {
					description: 'Please enter a title for your project'
				});
				return;
			}
			if (!description.trim()) {
				toast.error('Description is required', {
					description: 'Please add a description to your project'
				});
				return;
			}
			if (!categoryId) {
				toast.error('Category is required', {
					description: 'Please select a category for your project'
				});
				return;
			}

			const projectData: any = {
				title: title.trim(),
				description: description.trim(),
				categoryId: categoryId,
				imageUrl: imageUrl.trim() || undefined,
				active: active,
				published: published,
				featured: featured,
				projectUrl: projectUrl.trim() || undefined,
				projectText: projectText.trim() || 'View Project',
				projectIcon: iconOptionToName(projectIconOption),
				repoUrl: repoUrl.trim() || undefined,
				repoText: repoText.trim() || 'View Repository',
				repoIcon: iconOptionToName(repoIconOption),
				tagIds: tagIds.length > 0 ? tagIds : undefined
			};

			if (!isNewProject && overwriteCreatedDate && newCreatedDate && newCreatedTime) {
				projectData.createdAt = combineDateTime(newCreatedDate, newCreatedTime);
			}

			if (isNewProject) {
				await createProject(projectData);
				toast.success('Project created', {
					description: `"${title}" has been created successfully`
				});
			} else {
				await updateProject(projectId!, projectData);
				toast.success('Project updated', {
					description: `"${title}" has been updated successfully`
				});
			}

			dispatch('save');
			dispatch('close');
		} catch (err: any) {
			console.error('Error saving project:', err);
			toast.error('Failed to save project', {
				description: err.message || 'Please try again'
			});
		} finally {
			saving = false;
		}
	}

	function handleClose() {
		dispatch('close');
	}

	// Get tags grouped by category for display
	let groupedTags = $derived.by(() => {
		const groups: Record<string, { category: { name: string } | null; tags: ProjectTag[] }> = {};
		availableTags.forEach(tag => {
			const categoryName = tag.category?.name || 'Uncategorized';
			if (!groups[categoryName]) {
				groups[categoryName] = {
					category: tag.category,
					tags: []
				};
			}
			groups[categoryName].tags.push(tag);
		});
		return Object.values(groups);
	});

	// Get selected tags for display
	let selectedTags = $derived.by(() => {
		return availableTags.filter(tag => tagIds.includes(tag.id));
	});
</script>

<div class="editor-container">
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading project...</p>
		</div>
	{:else}
		<div class="editor-form">
			<!-- Title -->
			<div class="form-group">
				<label for="title">Title</label>
				<input
					type="text"
					id="title"
					bind:value={title}
					placeholder="Enter project title"
					class="form-input"
				/>
			</div>

			<!-- Category -->
			<div class="form-group">
				<div class="category-header">
					<label for="category">Category</label>
					<button type="button" onclick={() => showCategoryManager = true} class="manage-categories-button">
						<Settings size={16} />
						Manage Categories
					</button>
				</div>
				<select id="category" bind:value={categoryId} class="form-input">
					<option value="">Select a category</option>
					{#each categories as category}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
			</div>

			<!-- Description -->
			<div class="form-group">
				<label for="description">Description (Markdown)</label>
				<MarkdownEditor bind:value={description} minHeight="400px" placeholder="Write your project description in Markdown..." />
			</div>

			<!-- Project Image -->
			<div class="form-group">
				<label for="image">Project Image</label>
				<div class="image-input-group">
					{#if imageUrl}
						<div class="image-preview-container">
							<div class="image-preview">
								<img src={getImageUrl(imageUrl)} alt="Preview" onerror={(e) => {
									console.error('Failed to load image:', imageUrl);
									(e.target as HTMLImageElement).style.display = 'none';
								}} />
								<button
									type="button"
									class="remove-image"
									onclick={handleRemoveImage}
									aria-label="Remove image"
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
							label="Upload Project Image"
							showPreview={false}
							onUpload={handleImageUpload}
						/>
					{/if}
				</div>
			</div>

			<!-- Active State -->
			<div class="form-group">
				<label for="active">Status</label>
				<select id="active" bind:value={active} class="form-input">
					{#each activeStates as state}
						<option value={state}>{state}</option>
					{/each}
				</select>
			</div>

			<!-- Project URL & Button Text -->
			<div class="form-group inline-fields">
				<div class="inline-field with-icon-button">
					<label for="project-url">Project URL</label>
					<div class="input-with-icon">
						<button
							type="button"
							class="icon-button"
							onclick={() => projectIconPickerOpen = true}
							title="Choose project icon"
						>
							{#if projectIconOption}
								{@const iconInfo = getIconRenderInfo(projectIconOption)}
								{#if iconInfo.type === 'lucide' && iconInfo.component}
									{@const IconComponent = iconInfo.component}
									<IconComponent size={16} />
								{:else if iconInfo.type === 'iconify' && iconInfo.icon}
									<Icon icon={iconInfo.icon} width="16" height="16" />
								{:else if iconInfo.type === 'svg' && iconInfo.url}
									<img src={iconInfo.url} alt="Icon" width="16" height="16" />
								{:else if iconInfo.type === 'text' && iconInfo.text}
									<span class="text-icon-small">{iconInfo.text}</span>
								{:else}
									<Icon icon="lucide:image" width="16" height="16" />
								{/if}
							{:else}
								<Icon icon="lucide:image" width="16" height="16" />
							{/if}
						</button>
						<input
							type="url"
							id="project-url"
							bind:value={projectUrl}
							placeholder="https://example.com"
							class="form-input"
						/>
					</div>
				</div>
				<div class="inline-field">
					<label for="project-text">Project Button Text</label>
					{#if projectTextCustom}
						<div class="custom-input-wrapper">
							<input
								type="text"
								id="project-text"
								bind:value={projectText}
								placeholder="Enter custom text"
								class="form-input custom-input"
							/>
							<button
								type="button"
								onclick={switchToProjectDropdown}
								class="custom-input-close"
								title="Switch back to predefined options"
								aria-label="Switch back to predefined options"
							>
								<X size={16} />
							</button>
						</div>
					{:else}
						<select
							id="project-text"
							value={projectTextDropdown}
							onchange={(e) => handleProjectTextChange((e.target as HTMLSelectElement).value)}
							class="form-input"
						>
							{#each projectButtonOptions as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					{/if}
				</div>
			</div>

			<!-- Repository URL & Button Text -->
			<div class="form-group inline-fields">
				<div class="inline-field with-icon-button">
					<label for="repo-url">Repository URL</label>
					<div class="input-with-icon">
						<button
							type="button"
							class="icon-button"
							onclick={() => repoIconPickerOpen = true}
							title="Choose repository icon"
						>
							{#if repoIconOption}
								{@const iconInfo = getIconRenderInfo(repoIconOption)}
								{#if iconInfo.type === 'lucide' && iconInfo.component}
									{@const IconComponent = iconInfo.component}
									<IconComponent size={16} />
								{:else if iconInfo.type === 'iconify' && iconInfo.icon}
									<Icon icon={iconInfo.icon} width="16" height="16" />
								{:else if iconInfo.type === 'svg' && iconInfo.url}
									<img src={iconInfo.url} alt="Icon" width="16" height="16" />
								{:else if iconInfo.type === 'text' && iconInfo.text}
									<span class="text-icon-small">{iconInfo.text}</span>
								{:else}
									<Icon icon="lucide:image" width="16" height="16" />
								{/if}
							{:else}
								<Icon icon="lucide:image" width="16" height="16" />
							{/if}
						</button>
						<input
							type="url"
							id="repo-url"
							bind:value={repoUrl}
							placeholder="https://github.com/user/repo"
							class="form-input"
						/>
					</div>
				</div>
				<div class="inline-field">
					<label for="repo-text">Repository Button Text</label>
					{#if repoTextCustom}
						<div class="custom-input-wrapper">
							<input
								type="text"
								id="repo-text"
								bind:value={repoText}
								placeholder="Enter custom text"
								class="form-input custom-input"
							/>
							<button
								type="button"
								onclick={switchToRepoDropdown}
								class="custom-input-close"
								title="Switch back to predefined options"
								aria-label="Switch back to predefined options"
							>
								<X size={16} />
							</button>
						</div>
					{:else}
						<select
							id="repo-text"
							value={repoTextDropdown}
							onchange={(e) => handleRepoTextChange((e.target as HTMLSelectElement).value)}
							class="form-input"
						>
							{#each repoButtonOptions as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					{/if}
				</div>
			</div>

			<!-- Tags -->
			<div class="form-group">
				<div class="tags-header">
					<label for="tags">Tags</label>
					<button type="button" onclick={() => toast.info('Tag manager coming soon')} class="manage-tags-button">
						<Settings size={16} />
						Manage Tags
					</button>
				</div>
				
				<div class="tags-dropdown-container">
					<button type="button" onclick={toggleDropdown} class="tags-dropdown-button">
						<span>{tagIds.length > 0 ? `${tagIds.length} tag${tagIds.length > 1 ? 's' : ''} selected` : 'Select tags'}</span>
						<ChevronDown size={18} class={showTagDropdown ? 'rotate' : ''} />
					</button>

					{#if showTagDropdown}
						<div class="tags-dropdown">
							{#if availableTags.length === 0}
								<div class="dropdown-empty">
									<p>No tags available</p>
									<button type="button" onclick={() => toast.info('Tag manager coming soon')} class="create-tag-button">
										Create Tag
									</button>
								</div>
							{:else}
								{#each groupedTags as group}
									{#if group.category}
										<div class="tag-category-header">{group.category.name}</div>
									{:else}
										<div class="tag-category-header">Uncategorized</div>
									{/if}
									{#each group.tags as tag}
										<label class="tag-option">
											<input
												type="checkbox"
												checked={tagIds.includes(tag.id)}
												onchange={() => toggleTag(tag.id)}
											/>
											<span class="tag-color" style="background-color: {tag.color}20; border-color: {tag.color}40;"></span>
											<span>{tag.title}</span>
										</label>
									{/each}
								{/each}
							{/if}
						</div>
					{/if}
				</div>

				{#if selectedTags.length > 0}
					<div class="selected-tags">
						{#each selectedTags as tag}
							<span 
								class="tag" 
								style="background-color: {tag.color}20; color: {tag.color}; border-color: {tag.color}40;"
							>
								{tag.title}
								<button type="button" onclick={() => removeTag(tag.id)} class="remove-tag" aria-label="Remove tag">
									<X size={14} />
								</button>
							</span>
						{/each}
					</div>
				{/if}
			</div>


			<!-- Featured & Published -->
			<div class="form-group">
				<label for="featured">Featured</label>
				<select 
					id="featured" 
					value={featured ? 'true' : 'false'}
					onchange={(e) => featured = (e.target as HTMLSelectElement).value === 'true'}
					class="form-input"
				>
					<option value="false">No</option>
					<option value="true">Yes</option>
				</select>
				<p class="help-text">
					{featured ? 'Shown on frontpage' : 'Only shown on category pages'}
				</p>
			</div>

			<div class="form-group">
				<Toggle bind:checked={published} label="Published" />
				<p class="help-text">
					{published ? 'Visible on frontend' : 'Hidden from frontend'}
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
						{isNewProject ? 'Create Project' : 'Update Project'}
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- Icon Picker Modals -->
	{#if projectIconPickerOpen}
		<UnifiedIconPicker
			selectedIcon={projectIconOption}
			onIconSelect={(icon) => {
				projectIconOption = icon;
				projectIcon = iconOptionToName(icon);
				projectIconPickerOpen = false;
			}}
			triggerless={true}
			bind:open={projectIconPickerOpen}
		/>
	{/if}

	{#if repoIconPickerOpen}
		<UnifiedIconPicker
			selectedIcon={repoIconOption}
			onIconSelect={(icon) => {
				repoIconOption = icon;
				repoIcon = iconOptionToName(icon);
				repoIconPickerOpen = false;
			}}
			triggerless={true}
			bind:open={repoIconPickerOpen}
		/>
	{/if}

	{#if showCategoryManager}
		<div class="category-manager-overlay" onclick={handleCategoryManagerClose}>
			<div class="category-manager-container" onclick={(e) => e.stopPropagation()}>
				<ProjectCategoryManager />
			</div>
		</div>
	{/if}
</div>

<style>
	.editor-container {
		padding: 24px;
		max-width: 1000px;
		margin: 0 auto;
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

	.form-group.inline-fields {
		flex-direction: row;
		gap: 12px;
	}

	.with-icon-button {
		position: relative;
	}

	.input-with-icon {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.icon-button {
		width: 40px;
		height: 40px;
		min-width: 40px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
		cursor: pointer;
		transition: all 0.2s ease;
		padding: 0;
	}

	.icon-button:hover {
		border-color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.1);
	}

	.icon-button:focus {
		outline: 2px solid var(--accent-color, #6366f1);
		outline-offset: 2px;
	}

	.text-icon-small {
		font-size: 10px;
		font-weight: 500;
		line-height: 1;
	}

	.input-with-icon .form-input {
		flex: 1;
	}

	.inline-field {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.custom-input-wrapper {
		position: relative;
		width: 100%;
	}

	.custom-input {
		padding-right: 40px;
		width: 100%;
		box-sizing: border-box;
	}

	.custom-input-close {
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 4px;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
		padding: 0;
	}

	.custom-input-close:hover {
		background: var(--bg-secondary, #2d2d2d);
		border-color: var(--accent-color, #6366f1);
		color: var(--text-primary, #ffffff);
	}

	.form-group label {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 500;
	}

	.form-input {
		padding: 12px 16px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.form-input::placeholder {
		color: var(--text-secondary, #a1a1aa);
	}

	.help-text {
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
		margin: 0;
	}


	.image-input-group {
		width: 100%;
	}

	.image-preview-container {
		width: 100%;
	}

	.image-preview {
		position: relative;
		width: 100%;
		max-width: 500px;
		aspect-ratio: 16/9;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.image-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.remove-image {
		position: absolute;
		top: 8px;
		right: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: rgba(0, 0, 0, 0.7);
		border: none;
		border-radius: 50%;
		color: white;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.remove-image:hover {
		background: rgba(239, 68, 68, 0.9);
	}

	.category-header,
	.tags-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.manage-categories-button,
	.manage-tags-button {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.manage-tags-button:hover {
		background: var(--bg-secondary, #2d2d2d);
		border-color: var(--accent-color, #6366f1);
	}

	.tags-dropdown-container {
		position: relative;
	}

	.tags-dropdown-button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 12px 16px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
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
	}

	.tags-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 4px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		max-height: 300px;
		overflow-y: auto;
		z-index: 100;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.tag-category-header {
		padding: 8px 12px;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-secondary, #a1a1aa);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.tag-option {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.tag-option:hover {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.tag-option input[type="checkbox"] {
		margin: 0;
		cursor: pointer;
	}

	.tag-color {
		width: 16px;
		height: 16px;
		border-radius: 4px;
		border: 1px solid;
		flex-shrink: 0;
	}

	.dropdown-empty {
		padding: 24px;
		text-align: center;
		color: var(--text-secondary, #a1a1aa);
	}

	.create-tag-button {
		margin-top: 12px;
		padding: 8px 16px;
		background: var(--accent-color, #6366f1);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 13px;
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
		border-radius: 16px;
		font-size: 13px;
		font-weight: 500;
		border: 1px solid;
	}

	.remove-tag {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		background: transparent;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		transition: background 0.2s ease;
		padding: 0;
	}

	.remove-tag:hover {
		background: rgba(0, 0, 0, 0.2);
	}


	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding-top: 24px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 24px;
		border-radius: 8px;
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
		background: var(--bg-secondary, #2d2d2d);
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
		transform: translateY(-1px);
	}

	.button-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
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

	@media (max-width: 768px) {
		.editor-container {
			padding: 16px;
		}

	}
</style>

