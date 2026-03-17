<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { 
		Loader2, 
		Plus, 
		Trash2, 
		Edit2, 
		Save, 
		X, 
		Copy,
		Image as ImageIcon,
		GripVertical,
		Eye,
		EyeOff,
		Palette
	} from 'lucide-svelte';
	import FileUpload, { type UploadedFile } from '$lib/admin/components/ui/FileUpload.svelte';

	interface Theme {
		id: string;
		name: string;
		description: string | null;
		isDefault: boolean;
		isVisible: boolean;
		primaryColor: string;
		secondaryColor: string;
		accentColor: string;
		backgroundColor: string;
		surfaceColor: string;
		borderColor: string;
		textPrimary: string;
		textSecondary: string;
		textMuted: string;
		backgroundImage: string | null;
		backgroundImageExternal: boolean;
		backgroundOverlay: string;
		backgroundBlur: number;
		backgroundPosition: string;
		backgroundSize: string;
		backgroundAttachment: string;
		fontFamily: string;
		headingFontFamily: string;
		fontScale: string;
		borderRadius: string;
		customCss: string | null;
		displayOrder: number;
		createdAt: string;
		updatedAt: string;
	}

	// Popular Google Fonts
	const popularFonts = [
		'Inter',
		'Roboto',
		'Open Sans',
		'Lato',
		'Montserrat',
		'Poppins',
		'Source Sans Pro',
		'Nunito',
		'Raleway',
		'Ubuntu',
		'Playfair Display',
		'Merriweather',
		'PT Sans',
		'Oswald',
		'Quicksand',
		'Work Sans',
		'Fira Sans',
		'Rubik',
		'Karla',
		'Manrope',
		'Space Grotesk',
		'DM Sans',
		'JetBrains Mono',
		'Fira Code'
	];

	let themes = $state<Theme[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	
	let visibleThemes = $derived(themes.filter(t => t.isVisible));
	let invisibleThemes = $derived(themes.filter(t => !t.isVisible));
	
	// Drag state
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	
	// Edit/Create mode
	let editingTheme = $state<Theme | null>(null);
	let isCreating = $state(false);
	let previewMode = $state<'site' | 'colors'>('site');
	
	// Form state
	let formData = $state({
		name: '',
		description: '',
		isVisible: true,
		primaryColor: '#ffffff',
		secondaryColor: '#a1a1aa',
		accentColor: '#6366f1',
		backgroundColor: '#0a0a0a',
		surfaceColor: '#1a1a1a',
		borderColor: '#2a2a2a',
		textPrimary: '#ffffff',
		textSecondary: '#a1a1aa',
		textMuted: '#71717a',
		backgroundImage: '',
		backgroundImageExternal: false,
		backgroundOverlay: 'rgba(0, 0, 0, 0.7)',
		backgroundBlur: 0,
		backgroundPosition: 'center center',
		backgroundSize: 'cover',
		backgroundAttachment: 'fixed',
		fontFamily: 'Inter',
		headingFontFamily: 'Inter',
		fontScale: '1',
		borderRadius: '8px',
		customCss: ''
	});

	onMount(async () => {
		await loadThemes();
	});

	async function loadThemes() {
		try {
			isLoading = true;
			const response = await fetch('/api/themes/all', {
				credentials: 'include'
			});
			
			if (response.ok) {
				const result = await response.json();
				themes = result.data || [];
			}
		} catch (error) {
			console.error('Error loading themes:', error);
			toast.error('Failed to load themes');
		} finally {
			isLoading = false;
		}
	}

	function resetForm() {
		formData = {
			name: '',
			description: '',
			primaryColor: '#ffffff',
			secondaryColor: '#a1a1aa',
			accentColor: '#6366f1',
			backgroundColor: '#0a0a0a',
			surfaceColor: '#1a1a1a',
			borderColor: '#2a2a2a',
			textPrimary: '#ffffff',
			textSecondary: '#a1a1aa',
			textMuted: '#71717a',
			backgroundImage: '',
			backgroundImageExternal: false,
			backgroundOverlay: 'rgba(0, 0, 0, 0.7)',
			backgroundBlur: 0,
			backgroundPosition: 'center center',
			backgroundSize: 'cover',
			backgroundAttachment: 'fixed',
			fontFamily: 'Inter',
			headingFontFamily: 'Inter',
			fontScale: '1',
			borderRadius: '8px',
			customCss: '',
			isVisible: false
		};
	}

	function startCreating() {
		resetForm();
		editingTheme = null;
		isCreating = true;
	}

	function startEditing(theme: Theme) {
		formData = {
			name: theme.name,
			description: theme.description || '',
			isVisible: theme.isVisible,
			primaryColor: theme.primaryColor,
			secondaryColor: theme.secondaryColor,
			accentColor: theme.accentColor,
			backgroundColor: theme.backgroundColor,
			surfaceColor: theme.surfaceColor,
			borderColor: theme.borderColor,
			textPrimary: theme.textPrimary,
			textSecondary: theme.textSecondary,
			textMuted: theme.textMuted,
			backgroundImage: theme.backgroundImage || '',
			backgroundImageExternal: theme.backgroundImageExternal,
			backgroundOverlay: theme.backgroundOverlay,
			backgroundBlur: theme.backgroundBlur,
			backgroundPosition: theme.backgroundPosition,
			backgroundSize: theme.backgroundSize,
			backgroundAttachment: theme.backgroundAttachment,
			fontFamily: theme.fontFamily,
			headingFontFamily: theme.headingFontFamily,
			fontScale: theme.fontScale,
			borderRadius: theme.borderRadius,
			customCss: theme.customCss || ''
		};
		editingTheme = theme;
		isCreating = false;
	}

	function cancelEdit() {
		editingTheme = null;
		isCreating = false;
		resetForm();
	}

	function handleImageUpload(file: UploadedFile | UploadedFile[]) {
		const uploadedFile = Array.isArray(file) ? file[0] : file;
		if (uploadedFile) {
			formData.backgroundImage = uploadedFile.path;
			formData.backgroundImageExternal = uploadedFile.isExternal || false;
		}
	}

	async function handleRemoveImage() {
		if (!formData.backgroundImageExternal && formData.backgroundImage.startsWith('/uploads/')) {
			const filename = formData.backgroundImage.replace('/uploads/', '');
			try {
				await fetch(`/api/upload/${filename}`, {
					method: 'DELETE',
					credentials: 'include'
				});
			} catch (error) {
				console.error('Error deleting uploaded file:', error);
			}
		}
		formData.backgroundImage = '';
		formData.backgroundImageExternal = false;
	}

	function getImageUrl(path: string | null, isExternal: boolean): string {
		if (!path) return '';
		if (isExternal || path.startsWith('http://') || path.startsWith('https://')) {
			return path;
		}
		if (path.startsWith('/uploads/')) {
			const filename = path.replace('/uploads/', '');
			return `/api/upload/file/${filename}`;
		}
		return path;
	}

	async function saveTheme() {
		if (!formData.name.trim()) {
			toast.error('Theme name is required');
			return;
		}

		try {
			isSaving = true;
			
		const payload = {
			name: formData.name.trim(),
			description: formData.description.trim() || null,
			isVisible: formData.isVisible,
			primaryColor: formData.primaryColor,
				secondaryColor: formData.secondaryColor,
				accentColor: formData.accentColor,
				backgroundColor: formData.backgroundColor,
				surfaceColor: formData.surfaceColor,
				borderColor: formData.borderColor,
				textPrimary: formData.textPrimary,
				textSecondary: formData.textSecondary,
				textMuted: formData.textMuted,
				backgroundImage: formData.backgroundImage || null,
				backgroundImageExternal: formData.backgroundImageExternal,
				backgroundOverlay: formData.backgroundOverlay,
				backgroundBlur: formData.backgroundBlur,
				backgroundPosition: formData.backgroundPosition,
				backgroundSize: formData.backgroundSize,
				backgroundAttachment: formData.backgroundAttachment,
				fontFamily: formData.fontFamily,
				headingFontFamily: formData.headingFontFamily,
				fontScale: formData.fontScale,
				borderRadius: formData.borderRadius,
				customCss: formData.customCss.trim() || null
			};

			let response;
			if (editingTheme) {
				response = await fetch(`/api/themes/${editingTheme.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(payload)
				});
			} else {
				response = await fetch('/api/themes', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify(payload)
				});
			}

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to save theme');
			}

			toast.success(editingTheme ? 'Theme updated' : 'Theme created');
			cancelEdit();
			await loadThemes();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			isSaving = false;
		}
	}

	async function toggleVisibility(theme: Theme) {
		try {
			const newVisibility = !theme.isVisible;
			const response = await fetch(`/api/themes/${theme.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ isVisible: newVisibility })
			});

			if (!response.ok) {
				throw new Error('Failed to update theme visibility');
			}

			if (!newVisibility) {
				const savedThemeId = localStorage.getItem('selectedTheme');
				if (savedThemeId === theme.id) {
					localStorage.removeItem('selectedTheme');
					toast.success('Theme is now hidden. The site will reload to apply the default theme.');
					setTimeout(() => {
						window.location.reload();
					}, 1000);
					return;
				}
			}

			toast.success(newVisibility ? 'Theme is now visible' : 'Theme is now hidden');
			await loadThemes();
		} catch (error) {
			toast.error('Failed to update theme visibility');
		}
	}

	async function duplicateTheme(themeId: string) {
		try {
			const response = await fetch(`/api/themes/${themeId}/duplicate`, {
				method: 'POST',
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to duplicate theme');
			}

			toast.success('Theme duplicated');
			await loadThemes();
		} catch (error) {
			toast.error('Failed to duplicate theme');
		}
	}

	async function deleteTheme(theme: Theme) {
		if (theme.isDefault) {
			toast.error('Cannot delete default themes');
			return;
		}

		if (!confirm(`Are you sure you want to delete "${theme.name}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/themes/${theme.id}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete theme');
			}

			toast.success('Theme deleted');
			await loadThemes();
		} catch (error: any) {
			toast.error(error.message);
		}
	}

	// Drag and drop handlers
	function handleDragStart(event: DragEvent, index: number) {
		if (editingTheme || isCreating) return;
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
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

		const newThemes = [...themes];
		const [draggedItem] = newThemes.splice(draggedIndex, 1);
		newThemes.splice(dropIndex, 0, draggedItem);

		const themeOrders = newThemes.map((theme, index) => ({
			id: theme.id,
			displayOrder: index
		}));

		try {
			isSaving = true;
			const response = await fetch('/api/themes/order', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ themes: themeOrders })
			});

			if (!response.ok) {
				throw new Error('Failed to update order');
			}

			toast.success('Theme order updated');
			await loadThemes();
		} catch (error) {
			toast.error('Failed to update theme order');
			await loadThemes();
		} finally {
			draggedIndex = null;
			isSaving = false;
		}
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}
</script>

<div class="themes-settings">
	<div class="settings-description">
		<p>Create and manage site themes. Themes control colors, backgrounds, typography, and visual styling across the entire site.</p>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<Loader2 size={24} class="spin" />
			<span>Loading themes...</span>
		</div>
	{:else if isCreating || editingTheme}
		<!-- Theme Editor -->
		<div class="theme-editor">
			<div class="editor-header">
				<h2>{editingTheme ? 'Edit Theme' : 'Create New Theme'}</h2>
				<button class="close-btn" onclick={cancelEdit}>
					<X size={20} />
				</button>
			</div>

			<div class="editor-content">
				<div class="editor-main">
					<!-- Basic Info -->
					<section class="editor-section">
						<h3>Basic Information</h3>
						<div class="form-group">
							<label>Theme Name *</label>
							<input
								type="text"
								class="form-input"
								bind:value={formData.name}
								placeholder="My Custom Theme"
							/>
						</div>
					<div class="form-group">
						<label>Description</label>
						<textarea
							class="form-input"
							bind:value={formData.description}
							placeholder="A brief description of this theme..."
							rows="2"
						></textarea>
					</div>
					<div class="form-group">
						<label class="checkbox-label">
							<input
								type="checkbox"
								bind:checked={formData.isVisible}
							/>
							<span>Visible in theme selector</span>
						</label>
						<div class="field-hint">
							When unchecked, this theme will not be available for selection on the frontend
						</div>
					</div>
				</section>

					<!-- Colors -->
					<section class="editor-section">
						<h3>Colors</h3>
						<div class="color-grid">
							<div class="color-input">
								<label>Primary</label>
								<div class="color-picker-wrapper">
									<input type="color" bind:value={formData.primaryColor} />
									<input type="text" class="color-text" bind:value={formData.primaryColor} />
								</div>
							</div>
							<div class="color-input">
								<label>Secondary</label>
								<div class="color-picker-wrapper">
									<input type="color" bind:value={formData.secondaryColor} />
									<input type="text" class="color-text" bind:value={formData.secondaryColor} />
								</div>
							</div>
							<div class="color-input">
								<label>Accent</label>
								<div class="color-picker-wrapper">
									<input type="color" bind:value={formData.accentColor} />
									<input type="text" class="color-text" bind:value={formData.accentColor} />
								</div>
							</div>
							<div class="color-input">
								<label>Background</label>
								<div class="color-picker-wrapper">
									<input type="color" bind:value={formData.backgroundColor} />
									<input type="text" class="color-text" bind:value={formData.backgroundColor} />
								</div>
							</div>
							<div class="color-input">
								<label>Surface</label>
								<div class="color-picker-wrapper">
									<input type="color" bind:value={formData.surfaceColor} />
									<input type="text" class="color-text" bind:value={formData.surfaceColor} />
								</div>
							</div>
							<div class="color-input">
								<label>Border</label>
								<div class="color-picker-wrapper">
									<input type="color" bind:value={formData.borderColor} />
									<input type="text" class="color-text" bind:value={formData.borderColor} />
								</div>
							</div>
							<div class="color-input">
								<label>Text Primary</label>
								<div class="color-picker-wrapper">
									<input type="color" bind:value={formData.textPrimary} />
									<input type="text" class="color-text" bind:value={formData.textPrimary} />
								</div>
							</div>
							<div class="color-input">
								<label>Text Secondary</label>
								<div class="color-picker-wrapper">
									<input type="color" bind:value={formData.textSecondary} />
									<input type="text" class="color-text" bind:value={formData.textSecondary} />
								</div>
							</div>
							<div class="color-input">
								<label>Text Muted</label>
								<div class="color-picker-wrapper">
									<input type="color" bind:value={formData.textMuted} />
									<input type="text" class="color-text" bind:value={formData.textMuted} />
								</div>
							</div>
						</div>
					</section>

					<!-- Background -->
					<section class="editor-section">
						<h3>Background</h3>
						<div class="form-group">
							<label>Background Image</label>
							{#if formData.backgroundImage}
								<div class="image-preview-container">
									<img 
										src={getImageUrl(formData.backgroundImage, formData.backgroundImageExternal)} 
										alt="Background preview" 
										class="bg-preview"
									/>
									<button class="remove-image-btn" onclick={handleRemoveImage}>
										<X size={16} />
									</button>
								</div>
							{:else}
								<FileUpload
									acceptedTypes={['image']}
									onUpload={handleImageUpload}
									showPreview={false}
									label="Upload Background Image"
								/>
							{/if}
						</div>
						<div class="form-row">
							<div class="form-group">
								<label>Overlay Color</label>
								<input
									type="text"
									class="form-input"
									bind:value={formData.backgroundOverlay}
									placeholder="rgba(0, 0, 0, 0.7)"
								/>
							</div>
							<div class="form-group">
								<label>Blur ({formData.backgroundBlur}px)</label>
								<input
									type="range"
									min="0"
									max="20"
									bind:value={formData.backgroundBlur}
									class="range-input"
								/>
							</div>
						</div>
						<div class="form-row">
							<div class="form-group">
								<label>Position</label>
								<select class="form-input" bind:value={formData.backgroundPosition}>
									<option value="center center">Center</option>
									<option value="top center">Top</option>
									<option value="bottom center">Bottom</option>
									<option value="left center">Left</option>
									<option value="right center">Right</option>
								</select>
							</div>
							<div class="form-group">
								<label>Size</label>
								<select class="form-input" bind:value={formData.backgroundSize}>
									<option value="cover">Cover</option>
									<option value="contain">Contain</option>
									<option value="auto">Auto</option>
								</select>
							</div>
							<div class="form-group">
								<label>Attachment</label>
								<select class="form-input" bind:value={formData.backgroundAttachment}>
									<option value="fixed">Fixed</option>
									<option value="scroll">Scroll</option>
								</select>
							</div>
						</div>
					</section>

					<!-- Typography -->
					<section class="editor-section">
						<h3>Typography</h3>
						<div class="form-row">
							<div class="form-group">
								<label>Body Font</label>
								<select class="form-input" bind:value={formData.fontFamily}>
									{#each popularFonts as font}
										<option value={font}>{font}</option>
									{/each}
								</select>
							</div>
							<div class="form-group">
								<label>Heading Font</label>
								<select class="form-input" bind:value={formData.headingFontFamily}>
									{#each popularFonts as font}
										<option value={font}>{font}</option>
									{/each}
								</select>
							</div>
						</div>
						<div class="form-row">
							<div class="form-group">
								<label>Font Scale</label>
								<select class="form-input" bind:value={formData.fontScale}>
									<option value="0.875">Small (0.875)</option>
									<option value="1">Normal (1)</option>
									<option value="1.125">Large (1.125)</option>
									<option value="1.25">Extra Large (1.25)</option>
								</select>
							</div>
							<div class="form-group">
								<label>Border Radius</label>
								<select class="form-input" bind:value={formData.borderRadius}>
									<option value="0px">None (0px)</option>
									<option value="4px">Small (4px)</option>
									<option value="8px">Medium (8px)</option>
									<option value="12px">Large (12px)</option>
									<option value="16px">Extra Large (16px)</option>
								</select>
							</div>
						</div>
					</section>

					<!-- Custom CSS -->
					<section class="editor-section">
						<h3>Custom CSS (Advanced)</h3>
						<div class="form-group">
							<textarea
								class="form-input code-input"
								bind:value={formData.customCss}
								placeholder="/* Add custom CSS overrides here */"
								rows="6"
							></textarea>
						</div>
					</section>
				</div>

				<!-- Preview Panel (Full Width Below) -->
			<div class="editor-preview">
				<div class="preview-header">
					<h3>Live Preview</h3>
					<div class="preview-toggle">
						<button 
							class:active={previewMode === 'site'}
							onclick={() => previewMode = 'site'}
						>
							Site View
						</button>
						<button 
							class:active={previewMode === 'colors'}
							onclick={() => previewMode = 'colors'}
						>
							Colors
						</button>
					</div>
				</div>
				<div 
					class="preview-container"
					style="
						--preview-bg: {formData.backgroundColor};
						--preview-surface: {formData.surfaceColor};
						--preview-border: {formData.borderColor};
						--preview-text: {formData.textPrimary};
						--preview-text-secondary: {formData.textSecondary};
						--preview-text-muted: {formData.textMuted};
						--preview-accent: {formData.accentColor};
						--preview-radius: {formData.borderRadius};
					"
				>
					{#if formData.backgroundImage}
						<div 
							class="preview-bg-image"
							style="
								background-image: url('{getImageUrl(formData.backgroundImage, formData.backgroundImageExternal)}');
								filter: blur({formData.backgroundBlur}px);
							"
						></div>
						<div 
							class="preview-overlay"
							style="background: {formData.backgroundOverlay};"
						></div>
					{/if}
					<div class="preview-content">
						{#if previewMode === 'site'}
							<div class="preview-site">
								<div class="preview-site-header" style="background: {formData.surfaceColor};">
									<span class="preview-site-logo" style="font-family: '{formData.headingFontFamily}', sans-serif;">
										dane.gg
									</span>
									<div class="preview-site-nav" style="font-family: '{formData.fontFamily}', sans-serif;">
										<span>Home</span>
										<span>About</span>
										<span>Projects</span>
										<span>Contact</span>
									</div>
								</div>
								<div class="preview-site-content">
									<div class="preview-card" style="font-family: '{formData.fontFamily}', sans-serif;">
										<h4 style="font-family: '{formData.headingFontFamily}', sans-serif;">
											Welcome to the Site
										</h4>
										<p>
											This preview shows how your theme will look on the live site. The colors, fonts, and styling are applied in real-time as you make changes.
										</p>
										<div class="preview-card-footer">
											<button class="preview-btn">
												Primary Action
											</button>
											<button class="preview-btn-secondary">
												Secondary
											</button>
										</div>
									</div>
								</div>
							</div>
						{:else}
							<div class="preview-colors">
								<div class="preview-color-row">
									<div class="preview-swatch">
										<div class="preview-swatch-color" style="background: {formData.primaryColor};"></div>
										<span class="preview-swatch-label">Primary</span>
									</div>
									<div class="preview-swatch">
										<div class="preview-swatch-color" style="background: {formData.secondaryColor};"></div>
										<span class="preview-swatch-label">Secondary</span>
									</div>
									<div class="preview-swatch">
										<div class="preview-swatch-color" style="background: {formData.accentColor};"></div>
										<span class="preview-swatch-label">Accent</span>
									</div>
									<div class="preview-swatch">
										<div class="preview-swatch-color" style="background: {formData.backgroundColor};"></div>
										<span class="preview-swatch-label">Background</span>
									</div>
									<div class="preview-swatch">
										<div class="preview-swatch-color" style="background: {formData.surfaceColor};"></div>
										<span class="preview-swatch-label">Surface</span>
									</div>
									<div class="preview-swatch">
										<div class="preview-swatch-color" style="background: {formData.borderColor};"></div>
										<span class="preview-swatch-label">Border</span>
									</div>
								</div>
								<div class="preview-color-row">
									<div class="preview-swatch">
										<div class="preview-swatch-color" style="background: {formData.textPrimary};"></div>
										<span class="preview-swatch-label">Text</span>
									</div>
									<div class="preview-swatch">
										<div class="preview-swatch-color" style="background: {formData.textSecondary};"></div>
										<span class="preview-swatch-label">Text 2nd</span>
									</div>
									<div class="preview-swatch">
										<div class="preview-swatch-color" style="background: {formData.textMuted};"></div>
										<span class="preview-swatch-label">Muted</span>
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div class="editor-actions">
			<button class="save-btn" onclick={saveTheme} disabled={isSaving}>
				{#if isSaving}
					<Loader2 size={16} class="spin" />
				{:else}
					<Save size={16} />
				{/if}
				{editingTheme ? 'Update Theme' : 'Create Theme'}
			</button>
			<button class="cancel-btn" onclick={cancelEdit}>
				Cancel
			</button>
		</div>
	</div>
	{:else}
		<!-- Theme List -->
		<div class="themes-list">
			<!-- Visible Themes Section -->
			{#if visibleThemes.length > 0}
				<div class="themes-section">
					<h3 class="section-header">
						<Eye size={16} />
						Visible Themes ({visibleThemes.length})
					</h3>
					{#each visibleThemes as theme, index (theme.id)}
				<div 
					class="theme-card"
					class:dragging={draggedIndex === index}
					class:drag-over={dragOverIndex === index}
					draggable={true}
					ondragstart={(e) => handleDragStart(e, index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, index)}
					ondragend={handleDragEnd}
				>
					<div class="drag-handle">
						<GripVertical size={18} />
					</div>
					
					<div 
						class="theme-preview-mini"
						style="
							background: {theme.backgroundColor};
							border-color: {theme.borderColor};
						"
					>
						{#if theme.backgroundImage}
							<div 
								class="mini-bg-image"
								style="background-image: url('{getImageUrl(theme.backgroundImage, theme.backgroundImageExternal)}');"
							></div>
							<div 
								class="mini-overlay"
								style="background: {theme.backgroundOverlay};"
							></div>
						{/if}
						<div class="mini-content">
							<div 
								class="mini-card"
								style="
									background: {theme.surfaceColor};
									border-color: {theme.borderColor};
								"
							>
								<div class="mini-text" style="background: {theme.textPrimary};"></div>
								<div class="mini-text short" style="background: {theme.textSecondary};"></div>
								<div class="mini-accent" style="background: {theme.accentColor};"></div>
							</div>
						</div>
					</div>

					<div class="theme-info">
						<div class="theme-name-row">
							<h4>{theme.name}</h4>
							{#if theme.isDefault}
								<span class="default-badge">Default</span>
							{/if}
						</div>
						{#if theme.description}
							<p class="theme-description">{theme.description}</p>
						{/if}
					</div>

				<div class="theme-actions">
					<button 
						class="action-btn visibility"
						class:visible={theme.isVisible}
						onclick={() => toggleVisibility(theme)}
						title={theme.isVisible ? 'Hide from theme selector' : 'Show in theme selector'}
					>
						{#if theme.isVisible}
							<Eye size={16} />
						{:else}
							<EyeOff size={16} />
						{/if}
					</button>
					<button 
						class="action-btn edit" 
						onclick={() => startEditing(theme)}
						title="Edit theme"
					>
						<Edit2 size={16} />
					</button>
					<button 
						class="action-btn duplicate" 
						onclick={() => duplicateTheme(theme.id)}
						title="Duplicate theme"
					>
						<Copy size={16} />
					</button>
					{#if !theme.isDefault}
						<button 
							class="action-btn delete" 
							onclick={() => deleteTheme(theme)}
							title="Delete theme"
						>
							<Trash2 size={16} />
						</button>
					{/if}
				</div>
				</div>
					{/each}
				</div>
			{/if}

			<!-- Invisible Themes Section -->
			{#if invisibleThemes.length > 0}
				<div class="themes-section invisible-section">
					<h3 class="section-header">
						<EyeOff size={16} />
						Hidden Themes ({invisibleThemes.length})
					</h3>
					{#each invisibleThemes as theme, index (theme.id)}
						<div 
							class="theme-card"
							class:dragging={draggedIndex === (visibleThemes.length + index)}
							class:drag-over={dragOverIndex === (visibleThemes.length + index)}
							draggable={true}
							ondragstart={(e) => handleDragStart(e, visibleThemes.length + index)}
							ondragover={(e) => handleDragOver(e, visibleThemes.length + index)}
							ondragleave={handleDragLeave}
							ondrop={(e) => handleDrop(e, visibleThemes.length + index)}
							ondragend={handleDragEnd}
						>
							<div class="drag-handle">
								<GripVertical size={18} />
							</div>
							
							<div 
								class="theme-preview-mini"
								style="
									background: {theme.backgroundColor};
									border-color: {theme.borderColor};
								"
							>
								{#if theme.backgroundImage}
									<div 
										class="mini-bg-image"
										style="background-image: url('{getImageUrl(theme.backgroundImage, theme.backgroundImageExternal)}');"
									></div>
									<div 
										class="mini-overlay"
										style="background: {theme.backgroundOverlay};"
									></div>
								{/if}
								<div class="mini-content">
									<div 
										class="mini-card"
										style="
											background: {theme.surfaceColor};
											border-color: {theme.borderColor};
										"
									>
										<div class="mini-text" style="background: {theme.textPrimary};"></div>
										<div class="mini-text short" style="background: {theme.textSecondary};"></div>
										<div class="mini-accent" style="background: {theme.accentColor};"></div>
									</div>
								</div>
							</div>

							<div class="theme-info">
								<div class="theme-name-row">
									<h4>{theme.name}</h4>
									{#if theme.isDefault}
										<span class="default-badge">Default</span>
									{/if}
								</div>
								{#if theme.description}
									<p class="theme-description">{theme.description}</p>
								{/if}
							</div>

							<div class="theme-actions">
								<button 
									class="action-btn visibility"
									class:visible={theme.isVisible}
									onclick={() => toggleVisibility(theme)}
									title={theme.isVisible ? 'Hide from theme selector' : 'Show in theme selector'}
								>
									{#if theme.isVisible}
										<Eye size={16} />
									{:else}
										<EyeOff size={16} />
									{/if}
								</button>
								<button 
									class="action-btn edit" 
									onclick={() => startEditing(theme)}
									title="Edit theme"
								>
									<Edit2 size={16} />
								</button>
								<button 
									class="action-btn duplicate" 
									onclick={() => duplicateTheme(theme.id)}
									title="Duplicate theme"
								>
									<Copy size={16} />
								</button>
								{#if !theme.isDefault}
									<button 
										class="action-btn delete" 
										onclick={() => deleteTheme(theme)}
										title="Delete theme"
									>
										<Trash2 size={16} />
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<button class="add-theme-btn" onclick={startCreating}>
				<Plus size={18} />
				Create New Theme
			</button>
		</div>
	{/if}
</div>

<style>
	.themes-settings {
		width: 100%;
		max-width: 1200px;
	}

	.settings-description {
		margin-bottom: 24px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.settings-description p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
	}

	.loading-state {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--text-secondary, #a1a1aa);
		padding: 2rem;
	}

	/* Theme List */
	.themes-list {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.themes-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.themes-section.invisible-section {
		opacity: 0.8;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0;
		padding: 8px 12px;
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
	}

	.theme-card {
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 16px;
		display: flex;
		align-items: center;
		gap: 16px;
		cursor: move;
		transition: all 0.2s ease;
	}

	.theme-card.dragging {
		opacity: 0.5;
	}

	.theme-card.drag-over {
		border-color: var(--accent-color, #6366f1);
	}

	.theme-card:hover:not(.dragging) {
		background: var(--bg-tertiary, #1f1f1f);
	}

	.drag-handle {
		color: var(--text-secondary, #a1a1aa);
		cursor: grab;
		flex-shrink: 0;
	}

	.theme-preview-mini {
		width: 80px;
		height: 60px;
		border-radius: 6px;
		border: 1px solid;
		overflow: hidden;
		position: relative;
		flex-shrink: 0;
	}

	.mini-bg-image {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
	}

	.mini-overlay {
		position: absolute;
		inset: 0;
	}

	.mini-content {
		position: relative;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
	}

	.mini-card {
		width: 100%;
		height: 100%;
		border-radius: 4px;
		border: 1px solid;
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.mini-text {
		height: 4px;
		border-radius: 2px;
		width: 100%;
	}

	.mini-text.short {
		width: 60%;
	}

	.mini-accent {
		height: 6px;
		border-radius: 3px;
		width: 40%;
		margin-top: auto;
	}

	.theme-info {
		flex: 1;
		min-width: 0;
	}

	.theme-name-row {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.theme-name-row h4 {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.default-badge {
		padding: 2px 8px;
		background: rgba(99, 102, 241, 0.2);
		color: var(--accent-color, #6366f1);
		border-radius: 4px;
		font-size: 11px;
		font-weight: 500;
	}

	.theme-description {
		margin: 4px 0 0 0;
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.theme-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-btn.visibility {
		opacity: 0.5;
	}

	.action-btn.visibility.visible {
		opacity: 1;
		color: #22c55e;
	}

	.action-btn.visibility:hover {
		opacity: 1;
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.action-btn.visibility:not(.visible):hover {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.action-btn.edit:hover {
		background: rgba(99, 102, 241, 0.2);
		color: var(--accent-color, #6366f1);
	}

	.action-btn.duplicate:hover {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}

	.action-btn.delete:hover {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.add-theme-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 16px;
		background: transparent;
		border: 2px dashed var(--border-color, #3a3a3a);
		border-radius: 8px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-theme-btn:hover {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.05);
	}

	/* Theme Editor */
	.theme-editor {
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		overflow: hidden;
	}

	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.editor-header h2 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary, #ffffff);
	}

	.editor-content {
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - 200px);
	}

	.editor-main {
		padding: 20px;
		overflow-y: auto;
		flex: 1;
	}

	.editor-section {
		margin-bottom: 24px;
	}

	.editor-section:last-child {
		margin-bottom: 0;
	}

	.editor-section h3 {
		margin: 0 0 16px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.form-group label {
		display: block;
		margin-bottom: 6px;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
	}

	.form-input {
		width: 100%;
		padding: 10px 12px;
		background: var(--bg-primary, #1a1a1a);
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

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 16px;
	}

	@media (max-width: 600px) {
		.form-row {
			grid-template-columns: 1fr;
		}
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	@media (max-width: 800px) {
		.color-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 500px) {
		.color-grid {
			grid-template-columns: 1fr;
		}
	}

	.color-input {
		min-width: 0;
	}

	.color-input label {
		display: block;
		margin-bottom: 6px;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		white-space: nowrap;
	}

	.color-picker-wrapper {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.color-picker-wrapper input[type="color"] {
		width: 40px;
		height: 40px;
		min-width: 40px;
		border: 2px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		cursor: pointer;
		padding: 2px;
		background: var(--bg-primary, #1a1a1a);
		-webkit-appearance: none;
		appearance: none;
	}

	.color-picker-wrapper input[type="color"]::-webkit-color-swatch-wrapper {
		padding: 0;
	}

	.color-picker-wrapper input[type="color"]::-webkit-color-swatch {
		border: none;
		border-radius: 4px;
	}

	.color-picker-wrapper input[type="color"]::-moz-color-swatch {
		border: none;
		border-radius: 4px;
	}

	.color-text {
		flex: 1;
		min-width: 0;
		padding: 8px 10px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 13px;
		font-family: monospace;
		box-sizing: border-box;
	}

	.range-input {
		width: 100%;
		cursor: pointer;
	}

	.code-input {
		font-family: 'JetBrains Mono', monospace;
		font-size: 13px;
		resize: vertical;
	}

	.image-preview-container {
		position: relative;
		width: 200px;
		height: 120px;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.bg-preview {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.remove-image-btn {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(239, 68, 68, 0.9);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	.remove-image-btn:hover {
		background: #ef4444;
	}

	/* Preview Panel */
	.editor-preview {
		padding: 20px;
		background: var(--bg-tertiary, #1f1f1f);
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.preview-header h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.preview-toggle {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--bg-secondary, #2a2a2a);
		border-radius: 6px;
		padding: 2px;
	}

	.preview-toggle button {
		padding: 6px 12px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.preview-toggle button.active {
		background: var(--accent-color, #6366f1);
		color: white;
	}

	.preview-container {
		position: relative;
		width: 100%;
		height: 300px;
		border-radius: 8px;
		overflow: hidden;
		background: var(--preview-bg);
		border: 1px solid var(--preview-border);
	}

	.preview-bg-image {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
	}

	.preview-overlay {
		position: absolute;
		inset: 0;
	}

	.preview-content {
		position: relative;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	/* Full Site Preview */
	.preview-site {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.preview-site-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1px solid var(--preview-border);
	}

	.preview-site-logo {
		font-size: 14px;
		font-weight: 700;
		color: var(--preview-text);
	}

	.preview-site-nav {
		display: flex;
		gap: 16px;
	}

	.preview-site-nav span {
		font-size: 12px;
		color: var(--preview-text-secondary);
	}

	.preview-site-content {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.preview-card {
		background: var(--preview-surface);
		border: 1px solid var(--preview-border);
		border-radius: var(--preview-radius);
		padding: 20px;
		width: 100%;
		max-width: 400px;
	}

	.preview-card h4 {
		margin: 0 0 8px 0;
		color: var(--preview-text);
		font-size: 16px;
	}

	.preview-card p {
		margin: 0 0 16px 0;
		color: var(--preview-text-secondary);
		font-size: 13px;
		line-height: 1.5;
	}

	.preview-card-footer {
		display: flex;
		gap: 8px;
	}

	.preview-btn {
		background: var(--preview-accent);
		color: white;
		border: none;
		border-radius: calc(var(--preview-radius) / 2);
		padding: 8px 16px;
		font-size: 12px;
		cursor: pointer;
	}

	.preview-btn-secondary {
		background: transparent;
		color: var(--preview-text-secondary);
		border: 1px solid var(--preview-border);
		border-radius: calc(var(--preview-radius) / 2);
		padding: 8px 16px;
		font-size: 12px;
		cursor: pointer;
	}

	/* Color Swatches Preview */
	.preview-colors {
		display: flex;
		flex-direction: column;
		gap: 16px;
		width: 100%;
	}

	.preview-color-row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.preview-swatch {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.preview-swatch-color {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		border: 1px solid var(--preview-border);
	}

	.preview-swatch-label {
		font-size: 10px;
		color: var(--preview-text-secondary);
	}

	/* Editor Actions */
	.editor-actions {
		display: flex;
		gap: 12px;
		padding: 16px 20px;
		border-top: 1px solid var(--border-color, #3a3a3a);
		background: var(--bg-primary, #1a1a1a);
	}

	.save-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: var(--accent-color, #6366f1);
		color: #ffffff;
		border: none;
		padding: 10px 20px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.save-btn:hover:not(:disabled) {
		background: var(--accent-color-dark, #4f46e5);
	}

	.save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.cancel-btn {
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		border: 1px solid var(--border-color, #3a3a3a);
		padding: 10px 20px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-btn:hover {
		background: rgba(255, 255, 255, 0.05);
		color: var(--text-primary, #ffffff);
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
