<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
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
		Palette,
		Star,
		Lock,
		ChevronDown
	} from 'lucide-svelte';
	import FileUpload, { type UploadedFile } from '$lib/admin/components/ui/FileUpload.svelte';
	import FontPicker from '$lib/admin/components/ui/FontPicker.svelte';
	import CssCodeEditor from '$lib/admin/components/ui/CssCodeEditor.svelte';
	import Toggle from '$lib/admin/components/ui/Toggle.svelte';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';
	import {
		THEME_FONT_SCALE_MIN,
		THEME_FONT_SCALE_MAX,
		THEME_FONT_SCALE_STEP,
		clampThemeFontScale
	} from '$lib/site/constants/themeFontScale';
	import { themeDarkenToRgba } from '$lib/site/constants/themeOverlayOpacity';
	import type { SiteTheme } from '$lib/site/stores/theme';
	import {
		THEME_PREVIEW_SEARCH_PARAM,
		THEME_PREVIEW_MSG_APPLY,
		THEME_PREVIEW_MSG_READY
	} from '$lib/site/themePreview';
	import { THEME_CSS_VARIABLES_REFERENCE } from '$lib/site/constants/themeCssVariablesReference';

	const PREVIEW_ROUTES = [
		{ label: 'Home', path: '/' },
		{ label: 'About', path: '/about' },
		{ label: 'Projects', path: '/projects' },
		{ label: 'Contact', path: '/contact' },
		{ label: 'Blog', path: '/blog' }
	] as const;

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
		backgroundBlur: number;
		backgroundPosition: string;
		backgroundSize: string;
		backgroundAttachment: string;
		fontFamily: string;
		headingFontFamily: string;
		fontScale: string;
		borderRadius: string;
		widgetBorderRadius?: string;
		customCss: string | null;
		scanlinesOpacity?: string;
		overlayVignetteOpacity?: string;
		overlayGridOpacity?: string;
		overlayGrainOpacity?: string;
		overlayGlareOpacity?: string;
		overlayDarkenOpacity?: string;
		bodyFontUrl?: string | null;
		headingFontUrl?: string | null;
		displayOrder: number;
		createdAt: string;
		updatedAt: string;
	}

	let themes = $state<Theme[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let isSavingEnforcement = $state(false);

	/** Admin form: site-wide theme lock */
	let enforcementEnforced = $state(false);
	let enforcementThemeId = $state('');
	
	let visibleThemes = $derived(themes.filter(t => t.isVisible));
	let invisibleThemes = $derived(themes.filter(t => !t.isVisible));
	
	// Drag state
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	
	// Edit/Create mode
	let editingTheme = $state<Theme | null>(null);
	let isCreating = $state(false);
	let editorWorkspaceTab = $state<'editor' | 'preview'>('editor');
	let previewMode = $state<'site' | 'colors'>('site');
	let previewPath = $state<string>(PREVIEW_ROUTES[0].path);
	let previewIframeReady = $state(false);
	let previewIframeEl = $state<HTMLIFrameElement | null>(null);

	let showDeleteThemeDialog = $state(false);
	let themePendingDelete = $state<Theme | null>(null);

	type ThemeEditorAccordionId =
		| 'colors'
		| 'background'
		| 'typography'
		| 'corners'
		| 'overlays'
		| 'customCss';

	let themeEditorOpenSection = $state<ThemeEditorAccordionId | null>('colors');

	function toggleThemeEditorSection(id: ThemeEditorAccordionId): void {
		themeEditorOpenSection = themeEditorOpenSection === id ? null : id;
	}

	let previewIframeSrc = $derived.by(() => {
		if (!browser) return '';
		try {
			const u = new URL(previewPath, $page.url.origin);
			u.searchParams.set(THEME_PREVIEW_SEARCH_PARAM, '1');
			return u.toString();
		} catch {
			return '';
		}
	});

	function buildPreviewSiteTheme(): SiteTheme {
		return {
			id: editingTheme?.id ?? 'preview',
			name: formData.name?.trim() || 'Preview',
			description: formData.description?.trim() || null,
			isActive: true,
			isDefault: false,
			primaryColor: formData.primaryColor,
			secondaryColor: formData.secondaryColor,
			accentColor: formData.accentColor,
			backgroundColor: formData.backgroundColor,
			surfaceColor: formData.surfaceColor,
			borderColor: formData.borderColor,
			textPrimary: formData.textPrimary,
			textSecondary: formData.textSecondary,
			textMuted: formData.textMuted,
			backgroundImage: formData.backgroundImage?.trim() || null,
			backgroundImageExternal: formData.backgroundImageExternal,
			backgroundBlur: formData.backgroundBlur,
			backgroundPosition: formData.backgroundPosition,
			backgroundSize: formData.backgroundSize,
			backgroundAttachment: formData.backgroundAttachment,
			fontFamily: formData.fontFamily,
			headingFontFamily: formData.headingFontFamily,
			fontScale: clampThemeFontScale(formData.fontScale),
			borderRadius: formData.borderRadius,
			widgetBorderRadius: formData.widgetBorderRadius,
			customCss: formData.customCss?.trim() || null,
			bodyFontUrl: editingTheme?.bodyFontUrl ?? null,
			headingFontUrl: editingTheme?.headingFontUrl ?? null,
			scanlinesOpacity: formData.scanlinesOpacity,
			overlayVignetteOpacity: formData.overlayVignetteOpacity,
			overlayGridOpacity: formData.overlayGridOpacity,
			overlayGrainOpacity: formData.overlayGrainOpacity,
			overlayGlareOpacity: formData.overlayGlareOpacity,
			overlayDarkenOpacity: formData.overlayDarkenOpacity
		};
	}

	function pushPreviewToIframe(): void {
		if (!browser || !previewIframeReady) return;
		const win = previewIframeEl?.contentWindow;
		if (!win) return;
		win.postMessage(
			{ type: THEME_PREVIEW_MSG_APPLY, theme: buildPreviewSiteTheme() },
			window.location.origin
		);
	}

	$effect(() => {
		previewPath;
		previewIframeReady = false;
	});

	$effect(() => {
		if (previewMode !== 'site') {
			previewIframeReady = false;
		}
	});

	$effect(() => {
		if (!browser || previewMode !== 'site') return;
		JSON.stringify(formData);
		editingTheme?.id;
		editingTheme?.bodyFontUrl;
		editingTheme?.headingFontUrl;
		if (!previewIframeReady) return;
		const t = window.setTimeout(() => {
			pushPreviewToIframe();
		}, 80);
		return () => window.clearTimeout(t);
	});
	
	function setFontScaleFromSlider(e: Event) {
		formData.fontScale = (e.target as HTMLInputElement).value;
	}

	function clampFontScaleInput() {
		formData.fontScale = clampThemeFontScale(formData.fontScale);
	}

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
		backgroundBlur: 0,
		backgroundPosition: 'center center',
		backgroundSize: 'cover',
		backgroundAttachment: 'fixed',
		fontFamily: 'Inter',
		headingFontFamily: 'Inter',
		fontScale: '1',
		borderRadius: '8px',
		widgetBorderRadius: '8px',
		customCss: '',
		scanlinesOpacity: '1',
		overlayVignetteOpacity: '0',
		overlayGridOpacity: '0',
		overlayGrainOpacity: '0',
		overlayGlareOpacity: '0',
		overlayDarkenOpacity: '0.7'
	});

	let fontScaleNumeric = $derived(parseFloat(clampThemeFontScale(formData.fontScale)));

	onMount(() => {
		function onWinMsg(e: MessageEvent) {
			if (e.origin !== window.location.origin) return;
			if (e.data?.type === THEME_PREVIEW_MSG_READY) {
				previewIframeReady = true;
				pushPreviewToIframe();
			}
		}
		window.addEventListener('message', onWinMsg);
		void loadThemes();
		return () => window.removeEventListener('message', onWinMsg);
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
				const enc = result.enforcement as
					| { enforced?: boolean; themeId?: string | null }
					| undefined;
				if (enc) {
					enforcementEnforced = !!enc.enforced;
					const fallbackId =
						themes.find((t) => t.isDefault)?.id ?? themes[0]?.id ?? '';
					enforcementThemeId =
						typeof enc.themeId === 'string' && enc.themeId
							? enc.themeId
							: fallbackId;
				} else {
					enforcementEnforced = false;
					enforcementThemeId =
						themes.find((t) => t.isDefault)?.id ?? themes[0]?.id ?? '';
				}
			}
		} catch (error) {
			console.error('Error loading themes:', error);
			toast.error('Failed to load themes');
		} finally {
			isLoading = false;
		}
	}

	async function saveThemeEnforcement() {
		if (themes.length === 0) {
			toast.error('Create at least one theme first');
			return;
		}
		if (enforcementEnforced && !enforcementThemeId) {
			toast.error('Select which theme to enforce');
			return;
		}
		isSavingEnforcement = true;
		try {
			const response = await fetch('/api/themes/enforcement', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					enforced: enforcementEnforced,
					themeId: enforcementEnforced ? enforcementThemeId : null
				})
			});
			const result = await response.json().catch(() => ({}));
			if (!response.ok) {
				toast.error((result as { error?: string }).error || 'Failed to save theme lock');
				return;
			}
			if ((result as { data?: { enforced?: boolean; themeId?: string | null } }).data) {
				const d = (result as { data: { enforced: boolean; themeId: string | null } }).data;
				enforcementEnforced = d.enforced;
				if (d.themeId) enforcementThemeId = d.themeId;
			}
			toast.success(
				enforcementEnforced
					? 'All visitors will see the selected theme. The theme picker is disabled on the site.'
					: 'Theme lock is off. Visitors can pick a theme again.'
			);
		} catch {
			toast.error('Failed to save theme lock');
		} finally {
			isSavingEnforcement = false;
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
			backgroundBlur: 0,
			backgroundPosition: 'center center',
			backgroundSize: 'cover',
			backgroundAttachment: 'fixed',
			fontFamily: 'Inter',
			headingFontFamily: 'Inter',
			fontScale: '1',
			borderRadius: '8px',
			widgetBorderRadius: '8px',
			customCss: '',
			scanlinesOpacity: '1',
			overlayVignetteOpacity: '0',
			overlayGridOpacity: '0',
			overlayGrainOpacity: '0',
			overlayGlareOpacity: '0',
			overlayDarkenOpacity: '0.7',
			isVisible: false
		};
	}

	function startCreating() {
		resetForm();
		editingTheme = null;
		isCreating = true;
		editorWorkspaceTab = 'editor';
		themeEditorOpenSection = 'colors';
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
			backgroundBlur: theme.backgroundBlur,
			backgroundPosition: theme.backgroundPosition,
			backgroundSize: theme.backgroundSize,
			backgroundAttachment: theme.backgroundAttachment,
			fontFamily: theme.fontFamily,
			headingFontFamily: theme.headingFontFamily,
			fontScale: clampThemeFontScale(theme.fontScale),
			borderRadius: theme.borderRadius,
			widgetBorderRadius: theme.widgetBorderRadius ?? theme.borderRadius,
			customCss: theme.customCss || '',
			scanlinesOpacity: theme.scanlinesOpacity ?? '1',
			overlayVignetteOpacity: theme.overlayVignetteOpacity ?? '0',
			overlayGridOpacity: theme.overlayGridOpacity ?? '0',
			overlayGrainOpacity: theme.overlayGrainOpacity ?? '0',
			overlayGlareOpacity: theme.overlayGlareOpacity ?? '0',
			overlayDarkenOpacity: theme.overlayDarkenOpacity ?? '0'
		};
		editingTheme = theme;
		isCreating = false;
		editorWorkspaceTab = 'editor';
		themeEditorOpenSection = 'colors';
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
				backgroundBlur: formData.backgroundBlur,
				backgroundPosition: formData.backgroundPosition,
				backgroundSize: formData.backgroundSize,
				backgroundAttachment: formData.backgroundAttachment,
				fontFamily: formData.fontFamily,
				headingFontFamily: formData.headingFontFamily,
				fontScale: clampThemeFontScale(formData.fontScale),
				borderRadius: formData.borderRadius,
				widgetBorderRadius: formData.widgetBorderRadius,
				customCss: formData.customCss.trim() || null,
				scanlinesOpacity: formData.scanlinesOpacity,
				overlayVignetteOpacity: formData.overlayVignetteOpacity,
				overlayGridOpacity: formData.overlayGridOpacity,
				overlayGrainOpacity: formData.overlayGrainOpacity,
				overlayGlareOpacity: formData.overlayGlareOpacity,
				overlayDarkenOpacity: formData.overlayDarkenOpacity
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

	async function setAsDefault(themeId: string) {
		try {
			const response = await fetch(`/api/themes/${themeId}/set-default`, {
				method: 'PUT',
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to set default theme');
			}

			toast.success('Default theme updated');
			await loadThemes();
		} catch (error) {
			toast.error('Failed to set default theme');
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

	function requestDeleteTheme(theme: Theme) {
		if (theme.isDefault) {
			toast.error('Cannot delete default themes');
			return;
		}
		themePendingDelete = theme;
		showDeleteThemeDialog = true;
	}

	function cancelDeleteTheme() {
		showDeleteThemeDialog = false;
		themePendingDelete = null;
	}

	async function confirmDeleteTheme() {
		if (!themePendingDelete) return;
		const theme = themePendingDelete;
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
		} finally {
			cancelDeleteTheme();
		}
	}

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

<ConfirmDialog
	bind:open={showDeleteThemeDialog}
	title="Delete theme"
	message={themePendingDelete ? `Delete “${themePendingDelete.name}”?` : ''}
	detail="This cannot be undone."
	variant="danger"
	confirmLabel="Delete theme"
	cancelLabel="Cancel"
	onConfirm={confirmDeleteTheme}
	onCancel={cancelDeleteTheme}
/>

<div class="themes-settings">
	{#if !isCreating && !editingTheme}
		<div class="settings-description">
			<p>Create and manage site themes. Themes control colors, backgrounds, typography, and visual styling across the entire site.</p>
		</div>

		<section class="theme-enforcement-panel" aria-labelledby="theme-enforcement-heading">
			<div class="theme-enforcement-header">
				<Lock size={18} class="theme-enforcement-icon" aria-hidden="true" />
				<h2 id="theme-enforcement-heading" class="theme-enforcement-title">Site-wide theme lock</h2>
			</div>
			<p class="theme-enforcement-desc">
				When enabled, every visitor sees the theme you choose below and cannot change it from the site
				settings panel. You can still use hidden themes here — they won’t appear in the public theme list
				unless unlocked.
			</p>
			<div class="theme-enforcement-controls">
				<Toggle bind:checked={enforcementEnforced} label="Enforce a single theme for all visitors" />
				<div class="form-group enforcement-theme-select">
					<label for="enforced-theme-select">Theme to apply for everyone</label>
					<select
						id="enforced-theme-select"
						class="enforced-theme-select-input"
						bind:value={enforcementThemeId}
						disabled={!enforcementEnforced || themes.length === 0}
					>
						{#each themes as t (t.id)}
							<option value={t.id}>
								{t.name}{t.isDefault ? ' (default)' : ''}{!t.isVisible ? ' — hidden' : ''}
							</option>
						{/each}
					</select>
				</div>
				<button
					type="button"
					class="btn-enforcement-save"
					disabled={isSavingEnforcement || themes.length === 0}
					onclick={saveThemeEnforcement}
				>
					{#if isSavingEnforcement}
						<Loader2 size={18} class="spin" />
					{:else}
						<Save size={18} />
					{/if}
					Save lock settings
				</button>
			</div>
		</section>
	{/if}

	{#if isLoading}
		<div class="loading-state">
			<Loader2 size={24} class="spin" />
			<span>Loading themes...</span>
		</div>
	{:else if isCreating || editingTheme}
		<!-- Theme Editor -->
		<div
			class="theme-editor"
			class:theme-editor--preview={editorWorkspaceTab === 'preview'}
		>
			<div class="editor-header">
				<h2>{editingTheme ? 'Edit Theme' : 'Create New Theme'}</h2>
				<button class="close-btn" onclick={cancelEdit}>
					<X size={20} />
				</button>
			</div>

			<div class="editor-workspace-tabs" role="tablist" aria-label="Theme editor workspace">
				<button
					type="button"
					class="workspace-tab"
					class:active={editorWorkspaceTab === 'editor'}
					role="tab"
					aria-selected={editorWorkspaceTab === 'editor'}
					id="tab-theme-editor"
					onclick={() => (editorWorkspaceTab = 'editor')}
				>
					Editor
				</button>
				<button
					type="button"
					class="workspace-tab"
					class:active={editorWorkspaceTab === 'preview'}
					role="tab"
					aria-selected={editorWorkspaceTab === 'preview'}
					id="tab-theme-preview"
					onclick={() => (editorWorkspaceTab = 'preview')}
				>
					Live preview
				</button>
			</div>

			<div
				class="editor-content"
				role="tabpanel"
				aria-labelledby={editorWorkspaceTab === 'editor' ? 'tab-theme-editor' : 'tab-theme-preview'}
			>
				{#if editorWorkspaceTab === 'editor'}
				<div class="editor-main">
					<p class="editor-accordion-hint">
						Open one category at a time; it slides closed when you pick another.
					</p>

					<!-- Basic Info (always visible) -->
					<section class="editor-section-static">
						<h3 class="editor-section-static-title">Basic Information</h3>
						<div class="editor-section-static-body">
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
						</div>
					</section>

					<!-- Colors -->
					<section
						class="editor-accordion"
						class:editor-accordion--open={themeEditorOpenSection === 'colors'}
					>
						<button
							type="button"
							class="editor-accordion-trigger"
							id="accordion-theme-colors"
							aria-expanded={themeEditorOpenSection === 'colors'}
							aria-controls="panel-theme-colors"
							onclick={() => toggleThemeEditorSection('colors')}
						>
							<ChevronDown size={18} aria-hidden="true" />
							<span class="editor-accordion-heading">Colors</span>
						</button>
						<div class="editor-accordion-slide" aria-hidden={themeEditorOpenSection !== 'colors'}>
							<div
								class="editor-accordion-slide-inner"
								id="panel-theme-colors"
								role="region"
								aria-labelledby="accordion-theme-colors"
								inert={themeEditorOpenSection !== 'colors'}
							>
						<div class="editor-accordion-content">
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
						</div>
							</div>
						</div>
					</section>

					<!-- Background -->
					<section
						class="editor-accordion"
						class:editor-accordion--open={themeEditorOpenSection === 'background'}
					>
						<button
							type="button"
							class="editor-accordion-trigger"
							id="accordion-theme-background"
							aria-expanded={themeEditorOpenSection === 'background'}
							aria-controls="panel-theme-background"
							onclick={() => toggleThemeEditorSection('background')}
						>
							<ChevronDown size={18} aria-hidden="true" />
							<span class="editor-accordion-heading">Background</span>
						</button>
						<div class="editor-accordion-slide" aria-hidden={themeEditorOpenSection !== 'background'}>
							<div
								class="editor-accordion-slide-inner"
								id="panel-theme-background"
								role="region"
								aria-labelledby="accordion-theme-background"
								inert={themeEditorOpenSection !== 'background'}
							>
						<div class="editor-accordion-content">
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
						</div>
							</div>
						</div>
					</section>

					<!-- Typography -->
					<section
						class="editor-accordion"
						class:editor-accordion--open={themeEditorOpenSection === 'typography'}
					>
						<button
							type="button"
							class="editor-accordion-trigger"
							id="accordion-theme-typography"
							aria-expanded={themeEditorOpenSection === 'typography'}
							aria-controls="panel-theme-typography"
							onclick={() => toggleThemeEditorSection('typography')}
						>
							<ChevronDown size={18} aria-hidden="true" />
							<span class="editor-accordion-heading">Typography</span>
						</button>
						<div class="editor-accordion-slide" aria-hidden={themeEditorOpenSection !== 'typography'}>
							<div
								class="editor-accordion-slide-inner"
								id="panel-theme-typography"
								role="region"
								aria-labelledby="accordion-theme-typography"
								inert={themeEditorOpenSection !== 'typography'}
							>
						<div class="editor-accordion-content">
						<div class="form-row">
							<div class="form-group">
								<FontPicker
									value={formData.fontFamily}
									onChange={(v) => { formData.fontFamily = v; }}
									label="Body Font"
									id="theme-body-font"
									allowUpload={true}
								/>
							</div>
							<div class="form-group">
								<FontPicker
									value={formData.headingFontFamily}
									onChange={(v) => { formData.headingFontFamily = v; }}
									label="Heading Font"
									id="theme-heading-font"
									allowUpload={true}
								/>
							</div>
						</div>
						<div class="form-row">
							<div class="form-group font-scale-group">
								<label>Font Scale</label>
								<div class="font-scale-controls">
									<input
										type="range"
										class="range-input font-scale-slider"
										min={THEME_FONT_SCALE_MIN}
										max={THEME_FONT_SCALE_MAX}
										step={THEME_FONT_SCALE_STEP}
										value={fontScaleNumeric}
										oninput={setFontScaleFromSlider}
									/>
									<input
										type="number"
										class="form-input font-scale-input"
										min={THEME_FONT_SCALE_MIN}
										max={THEME_FONT_SCALE_MAX}
										step={THEME_FONT_SCALE_STEP}
										bind:value={formData.fontScale}
										onblur={clampFontScaleInput}
									/>
								</div>
								<span class="form-hint">{(fontScaleNumeric * 100).toFixed(1)}% — subtle range {THEME_FONT_SCALE_MIN}–{THEME_FONT_SCALE_MAX}</span>
							</div>
						</div>
						</div>
							</div>
						</div>
					</section>

					<!-- Corners -->
					<section
						class="editor-accordion"
						class:editor-accordion--open={themeEditorOpenSection === 'corners'}
					>
						<button
							type="button"
							class="editor-accordion-trigger"
							id="accordion-theme-corners"
							aria-expanded={themeEditorOpenSection === 'corners'}
							aria-controls="panel-theme-corners"
							onclick={() => toggleThemeEditorSection('corners')}
						>
							<ChevronDown size={18} aria-hidden="true" />
							<span class="editor-accordion-heading">Corners</span>
						</button>
						<div class="editor-accordion-slide" aria-hidden={themeEditorOpenSection !== 'corners'}>
							<div
								class="editor-accordion-slide-inner"
								id="panel-theme-corners"
								role="region"
								aria-labelledby="accordion-theme-corners"
								inert={themeEditorOpenSection !== 'corners'}
							>
						<div class="editor-accordion-content">
						<div class="form-row">
							<div class="form-group">
								<label>Main window radius</label>
								<select class="form-input" bind:value={formData.borderRadius}>
									<option value="0px">None (0px)</option>
									<option value="4px">Small (4px)</option>
									<option value="8px">Medium (8px)</option>
									<option value="12px">Large (12px)</option>
									<option value="16px">Extra Large (16px)</option>
								</select>
								<span class="form-hint">Outer site shell (the big frame around the page).</span>
							</div>
							<div class="form-group">
								<label>Widget box radius</label>
								<select class="form-input" bind:value={formData.widgetBorderRadius}>
									<option value="0px">None (0px)</option>
									<option value="4px">Small (4px)</option>
									<option value="8px">Medium (8px)</option>
									<option value="12px">Large (12px)</option>
									<option value="16px">Extra Large (16px)</option>
								</select>
								<span class="form-hint">Status, Chat, About, and other bordered panels.</span>
							</div>
						</div>
						</div>
							</div>
						</div>
					</section>

					<section
						class="editor-accordion"
						class:editor-accordion--open={themeEditorOpenSection === 'overlays'}
					>
						<button
							type="button"
							class="editor-accordion-trigger"
							id="accordion-theme-overlays"
							aria-expanded={themeEditorOpenSection === 'overlays'}
							aria-controls="panel-theme-overlays"
							onclick={() => toggleThemeEditorSection('overlays')}
						>
							<ChevronDown size={18} aria-hidden="true" />
							<span class="editor-accordion-heading">Screen overlays</span>
						</button>
						<div class="editor-accordion-slide" aria-hidden={themeEditorOpenSection !== 'overlays'}>
							<div
								class="editor-accordion-slide-inner"
								id="panel-theme-overlays"
								role="region"
								aria-labelledby="accordion-theme-overlays"
								inert={themeEditorOpenSection !== 'overlays'}
							>
						<div class="editor-accordion-content">
						<p class="form-hint">
							Effects behind the main window, <strong>for this theme only</strong> (unlike weather, which is
							global). Opacity sliders are 0–1; background blur is 0–20px. Finer tuning can override in Custom
							CSS below.
						</p>
						<div class="overlay-sliders">
							<div class="form-group">
								<label for="ov-bg-blur">Blur <span class="opacity-num">{formData.backgroundBlur}px</span></label>
								<input
									id="ov-bg-blur"
									type="range"
									min="0"
									max="20"
									step="1"
									class="form-input overlay-slider"
									bind:value={formData.backgroundBlur}
								/>
								<span class="form-hint">Gaussian blur on the background image only.</span>
							</div>
							<div class="form-group">
								<label for="ov-darken"
									>Darken <span class="opacity-num">{formData.overlayDarkenOpacity}</span></label
								>
								<input
									id="ov-darken"
									type="range"
									min="0"
									max="1"
									step="0.05"
									class="form-input overlay-slider"
									value={parseFloat(formData.overlayDarkenOpacity) || 0}
									oninput={(e) => {
										formData.overlayDarkenOpacity = (e.currentTarget as HTMLInputElement).value;
									}}
								/>
								<span class="form-hint">Black overlay on top of the background image.</span>
							</div>
							<div class="form-group">
								<label for="ov-scanlines"
									>Scanlines <span class="opacity-num">{formData.scanlinesOpacity}</span></label
								>
								<input
									id="ov-scanlines"
									type="range"
									min="0"
									max="1"
									step="0.05"
									class="form-input overlay-slider"
									value={parseFloat(formData.scanlinesOpacity) || 0}
									oninput={(e) => {
										formData.scanlinesOpacity = (e.currentTarget as HTMLInputElement).value;
									}}
								/>
								<span class="form-hint">CRT-style horizontal lines.</span>
							</div>
							<div class="form-group">
								<label for="ov-vignette"
									>Vignette <span class="opacity-num">{formData.overlayVignetteOpacity}</span></label
								>
								<input
									id="ov-vignette"
									type="range"
									min="0"
									max="1"
									step="0.05"
									class="form-input overlay-slider"
									value={parseFloat(formData.overlayVignetteOpacity) || 0}
									oninput={(e) => {
										formData.overlayVignetteOpacity = (e.currentTarget as HTMLInputElement).value;
									}}
								/>
								<span class="form-hint">Darkens edges of the viewport.</span>
							</div>
							<div class="form-group">
								<label for="ov-grid"
									>Grid <span class="opacity-num">{formData.overlayGridOpacity}</span></label
								>
								<input
									id="ov-grid"
									type="range"
									min="0"
									max="1"
									step="0.05"
									class="form-input overlay-slider"
									value={parseFloat(formData.overlayGridOpacity) || 0}
									oninput={(e) => {
										formData.overlayGridOpacity = (e.currentTarget as HTMLInputElement).value;
									}}
								/>
								<span class="form-hint">Retro grid over the background.</span>
							</div>
							<div class="form-group">
								<label for="ov-grain"
									>Grain <span class="opacity-num">{formData.overlayGrainOpacity}</span></label
								>
								<input
									id="ov-grain"
									type="range"
									min="0"
									max="1"
									step="0.05"
									class="form-input overlay-slider"
									value={parseFloat(formData.overlayGrainOpacity) || 0}
									oninput={(e) => {
										formData.overlayGrainOpacity = (e.currentTarget as HTMLInputElement).value;
									}}
								/>
								<span class="form-hint">Subtle film noise.</span>
							</div>
							<div class="form-group">
								<label for="ov-glare"
									>Glare <span class="opacity-num">{formData.overlayGlareOpacity}</span></label
								>
								<input
									id="ov-glare"
									type="range"
									min="0"
									max="1"
									step="0.05"
									class="form-input overlay-slider"
									value={parseFloat(formData.overlayGlareOpacity) || 0}
									oninput={(e) => {
										formData.overlayGlareOpacity = (e.currentTarget as HTMLInputElement).value;
									}}
								/>
								<span class="form-hint">Soft highlight from the upper-left.</span>
							</div>
						</div>
						</div>
							</div>
						</div>
					</section>

					<section
						class="editor-accordion"
						class:editor-accordion--open={themeEditorOpenSection === 'customCss'}
					>
						<button
							type="button"
							class="editor-accordion-trigger"
							id="accordion-theme-custom-css"
							aria-expanded={themeEditorOpenSection === 'customCss'}
							aria-controls="panel-theme-custom-css"
							onclick={() => toggleThemeEditorSection('customCss')}
						>
							<ChevronDown size={18} aria-hidden="true" />
							<span class="editor-accordion-heading">Custom CSS</span>
						</button>
						<div class="editor-accordion-slide" aria-hidden={themeEditorOpenSection !== 'customCss'}>
							<div
								class="editor-accordion-slide-inner"
								id="panel-theme-custom-css"
								role="region"
								aria-labelledby="accordion-theme-custom-css"
								inert={themeEditorOpenSection !== 'customCss'}
							>
						<div class="editor-accordion-content">
						<p class="form-hint custom-css-intro">
							Overrides come <strong>after</strong> palette, fonts, radius, and screen overlay variables, so you
							can set layout tokens on <code>:root</code> (defaults live in <code>app.css</code>).
						</p>
						<details class="theme-var-hint">
							<summary>Built-in CSS variables (reference)</summary>
							<p class="theme-var-hint-lead">
								Theme fields and <code>app.css</code> define these tokens; custom CSS loads after and can
								override any of them. Example values are defaults—copy and edit as needed.
							</p>
							<pre class="var-list">{THEME_CSS_VARIABLES_REFERENCE}</pre>
						</details>
						<div class="form-group">
							<label class="custom-css-field">
								<span class="custom-css-field-label">Stylesheet snippet</span>
								<CssCodeEditor
									class="theme-custom-css-editor"
									bind:value={formData.customCss}
									placeholder={`/* Optional: extra layout tokens */
:root {
  --theme-content-max-width: 1000px;
}`}
									minHeight="320px"
								/>
							</label>
						</div>
						</div>
							</div>
						</div>
					</section>

					<!-- Visibility (always visible) -->
					<section class="editor-section-static editor-section-static--visibility">
						<h3 class="editor-section-static-title">Visibility</h3>
						<div class="theme-visibility-panel">
							<div class="theme-visibility-row">
								<Toggle bind:checked={formData.isVisible} label="Visible in theme selector" />
							</div>
							<p class="theme-visibility-hint">
								When off, visitors cannot pick this theme from the site settings panel (admins can still
								edit it here).
							</p>
						</div>
					</section>
				</div>
				{:else}
			<div class="editor-preview">
				<div class="preview-header">
					<h3>Live Preview</h3>
					<div class="preview-header-actions">
						{#if previewMode === 'site'}
							<div class="preview-page-picker">
								<label class="preview-page-label" for="theme-preview-route">Page</label>
								<select
									id="theme-preview-route"
									class="form-input preview-route-select"
									bind:value={previewPath}
								>
									{#each PREVIEW_ROUTES as r}
										<option value={r.path}>{r.label}</option>
									{/each}
								</select>
							</div>
						{/if}
						<div class="preview-toggle">
							<button
								type="button"
								class:active={previewMode === 'site'}
								onclick={() => (previewMode = 'site')}
							>
								Site View
							</button>
							<button
								type="button"
								class:active={previewMode === 'colors'}
								onclick={() => (previewMode = 'colors')}
							>
								Colors
							</button>
						</div>
					</div>
				</div>
				{#if previewMode === 'site'}
					<p class="form-hint preview-embed-hint">
						Real site UI in an iframe; theme and custom CSS sync from the form. Use the page control to preview
						Home, About, and other routes.
					</p>
					{#if browser}
						<div class="preview-iframe-wrap">
							{#key previewPath}
								<iframe
									class="theme-preview-iframe"
									title="Live site theme preview"
									bind:this={previewIframeEl}
									src={previewIframeSrc}
								></iframe>
							{/key}
						</div>
					{:else}
						<p class="form-hint">Open this page in the browser to load the live preview.</p>
					{/if}
				{:else}
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
						--preview-shell-radius: {formData.borderRadius};
						--preview-widget-radius: {formData.widgetBorderRadius};
						--preview-font-scale: {clampThemeFontScale(formData.fontScale)};
						--preview-shell-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
						--preview-shell-border-w: 2px;
						--preview-max-w: 900px;
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
								style="background: {themeDarkenToRgba(formData.overlayDarkenOpacity, '0')};"
							></div>
						{/if}
						<div class="preview-content">
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
						</div>
					</div>
				{/if}
			</div>
				{/if}
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
								style="background: {themeDarkenToRgba(theme.overlayDarkenOpacity, '0')};"
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
					{#if !theme.isDefault}
						<button 
							class="action-btn set-default" 
							onclick={() => setAsDefault(theme.id)}
							title="Set as default theme"
						>
							<Star size={16} />
						</button>
					{/if}
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
							onclick={() => requestDeleteTheme(theme)}
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
										style="background: {themeDarkenToRgba(theme.overlayDarkenOpacity, '0')};"
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
								{#if !theme.isDefault}
									<button 
										class="action-btn set-default" 
										onclick={() => setAsDefault(theme.id)}
										title="Set as default theme"
									>
										<Star size={16} />
									</button>
								{/if}
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
										onclick={() => requestDeleteTheme(theme)}
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

	.theme-enforcement-panel {
		margin-bottom: 28px;
		padding: 18px 20px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
	}

	.theme-enforcement-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}

	.theme-enforcement-panel :global(.theme-enforcement-icon) {
		color: var(--accent-color, #ef4444);
		flex-shrink: 0;
	}

	.theme-enforcement-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.theme-enforcement-desc {
		margin: 0 0 16px 0;
		font-size: 13px;
		line-height: 1.55;
		color: var(--text-secondary, #a1a1aa);
	}

	.theme-enforcement-controls {
		display: flex;
		flex-direction: column;
		gap: 16px;
		align-items: flex-start;
	}

	.theme-enforcement-controls :global(.toggle-wrapper) {
		width: 100%;
		align-items: flex-start;
	}

	.enforcement-theme-select {
		width: 100%;
		max-width: 420px;
		margin-bottom: 0;
	}

	.enforcement-theme-select label {
		display: block;
		margin-bottom: 6px;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
	}

	.enforced-theme-select-input {
		width: 100%;
		padding: 10px 12px;
		border-radius: 6px;
		border: 1px solid var(--border-color, #3a3a3a);
		background: var(--bg-secondary, #2a2a2a);
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.enforced-theme-select-input:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.btn-enforcement-save {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		border: none;
		border-radius: 6px;
		background: var(--accent-color, #ef4444);
		color: #ffffff;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-enforcement-save:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-enforcement-save :global(.spin) {
		animation: spin 0.8s linear infinite;
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

	.action-btn.set-default:hover {
		background: rgba(234, 179, 8, 0.2);
		color: #eab308;
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
		display: flex;
		flex-direction: column;
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		overflow: hidden;
		height: calc(100dvh - 200px);
		max-height: calc(100dvh - 200px);
		min-height: 480px;
	}

	/* Live preview tab */
	.theme-editor.theme-editor--preview {
		height: calc(100dvh - 120px);
		max-height: calc(100dvh - 120px);
		min-height: min(88dvh, 1100px);
	}

	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		flex-shrink: 0;
	}

	.editor-workspace-tabs {
		display: flex;
		gap: 0;
		padding: 0 12px;
		background: var(--bg-primary, #1a1a1a);
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		flex-shrink: 0;
	}

	.workspace-tab {
		position: relative;
		padding: 12px 18px;
		border: none;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;
		transition: color 0.15s ease;
	}

	.workspace-tab:hover {
		color: var(--text-primary, #ffffff);
	}

	.workspace-tab.active {
		color: var(--text-primary, #ffffff);
		font-weight: 600;
		box-shadow: inset 0 -2px 0 0 var(--text-primary, #ffffff);
	}

	.workspace-tab:focus {
		outline: none;
	}

	.workspace-tab:focus-visible {
		outline: 2px solid rgba(255, 255, 255, 0.28);
		outline-offset: 2px;
		border-radius: 4px;
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
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.editor-main {
		padding: 20px;
		overflow-y: auto;
		flex: 1;
		min-height: 0;
		/* Avoid scroll jumps when focus/scroll-into-view fights nested admin layouts */
		overflow-anchor: none;
		overscroll-behavior: contain;
	}

	.editor-accordion-hint {
		margin: 0 0 16px 0;
		font-size: 13px;
		line-height: 1.45;
		color: var(--text-muted, #71717a);
	}

	.editor-section-static {
		margin-bottom: 20px;
		padding: 16px 18px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		background: var(--bg-secondary, #141414);
	}

	.editor-section-static-title {
		margin: 0 0 14px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.editor-section-static--visibility {
		margin-top: 8px;
		margin-bottom: 0;
	}

	.editor-accordion {
		margin-bottom: 10px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		background: var(--bg-secondary, #141414);
		overflow: hidden;
	}

	.editor-accordion-trigger {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 14px 16px;
		margin: 0;
		cursor: pointer;
		user-select: none;
		font-family: inherit;
		text-align: left;
		border: none;
		background: transparent;
		color: inherit;
	}

	.editor-accordion-trigger :global(svg) {
		flex-shrink: 0;
		transition: transform 0.3s ease;
		color: var(--text-secondary, #a1a1aa);
	}

	.editor-accordion--open .editor-accordion-trigger :global(svg) {
		transform: rotate(180deg);
	}

	.editor-accordion-trigger:hover :global(svg) {
		color: var(--text-primary, #ffffff);
	}

	.editor-accordion-heading {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.editor-accordion-trigger:focus {
		outline: none;
	}

	.editor-accordion-trigger:focus-visible {
		box-shadow: inset 0 0 0 2px var(--accent-color, #6366f1);
	}

	.editor-accordion-slide {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.35s ease;
	}

	.editor-accordion--open .editor-accordion-slide {
		grid-template-rows: 1fr;
	}

	.editor-accordion-slide-inner {
		overflow: hidden;
		min-height: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.editor-accordion-slide {
			transition: none;
		}

		.editor-accordion-trigger :global(svg) {
			transition: none;
		}
	}

	.editor-accordion-content {
		padding: 0 16px 18px 16px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.editor-accordion-content > :first-child {
		margin-top: 16px;
	}

	.theme-visibility-panel {
		--accent-color: #ef4444;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 16px 18px;
	}

	.theme-visibility-row :global(.toggle-wrapper) {
		width: 100%;
		align-items: flex-start;
	}

	.theme-visibility-row :global(.toggle-label-text) {
		color: var(--text-primary, #ffffff);
		font-weight: 500;
		font-size: 14px;
		line-height: 24px;
	}

	.theme-visibility-row :global(.toggle-slider) {
		background: var(--bg-tertiary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		box-sizing: border-box;
	}

	.theme-visibility-row :global(.toggle-input:checked + .toggle-body .toggle-slider) {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
		border-color: transparent;
	}

	.theme-visibility-row :global(.toggle-input:checked + .toggle-body .toggle-slider::after) {
		background: #ffffff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
	}

	.theme-visibility-hint {
		margin: 12px 0 0 0;
		padding-top: 12px;
		border-top: 1px solid var(--border-color, #3a3a3a);
		font-size: 12px;
		line-height: 1.5;
		color: var(--text-muted, #71717a);
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

	.font-scale-group .font-scale-controls {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.font-scale-slider {
		flex: 1;
		min-width: 0;
	}

	.font-scale-input {
		width: 72px;
		flex-shrink: 0;
		text-align: center;
	}

	.form-hint {
		display: block;
		margin-top: 4px;
		font-size: 11px;
		color: var(--text-muted, #71717a);
	}

	.custom-css-intro {
		margin-bottom: 12px;
		line-height: 1.5;
	}

	.custom-css-intro code {
		font-size: 11px;
		padding: 2px 6px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.25);
	}

	.overlay-sliders {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px 18px;
		max-width: 100%;
		align-items: start;
	}

	@media (max-width: 720px) {
		.overlay-sliders {
			grid-template-columns: 1fr;
		}
	}

	.overlay-slider {
		width: 100%;
		padding: 6px 0;
	}

	.opacity-num {
		color: var(--accent-color, #ef4444);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.theme-var-hint {
		margin-bottom: 12px;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
	}

	.theme-var-hint summary {
		cursor: pointer;
		user-select: none;
	}

	.theme-var-hint-lead {
		margin: 8px 0 0 0;
		font-size: 11px;
		line-height: 1.45;
		color: var(--text-muted, #71717a);
	}

	.theme-var-hint-lead code {
		font-size: 10px;
		padding: 1px 4px;
		border-radius: 3px;
		background: rgba(0, 0, 0, 0.25);
	}

	.var-list {
		margin-top: 8px;
		padding: 10px 12px;
		max-height: min(420px, 55vh);
		overflow: auto;
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		line-height: 1.45;
		background: rgba(0, 0, 0, 0.35);
		border-radius: 6px;
		border: 1px solid var(--border-color, #3a3a3a);
		white-space: pre;
	}

	.custom-css-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
		cursor: text;
	}

	.custom-css-field-label {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
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
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		overflow: hidden;
		padding: 16px 20px 20px;
		background: var(--bg-tertiary, #1f1f1f);
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
		flex-shrink: 0;
	}

	.preview-header h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.preview-header-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.preview-page-picker {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
	}

	.preview-page-label {
		white-space: nowrap;
		margin: 0;
		cursor: pointer;
	}

	.preview-route-select {
		min-width: 140px;
		padding: 6px 10px;
		font-size: 12px;
	}

	.preview-embed-hint {
		margin: 0 0 10px 0;
		flex-shrink: 0;
	}

	.preview-iframe-wrap {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.theme-preview-iframe {
		display: block;
		width: 100%;
		flex: 1;
		min-height: 320px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		background: #0a0a0a;
	}

	.theme-editor--preview .theme-preview-iframe {
		min-height: min(72dvh, 920px);
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
		font-size: calc(14px * var(--preview-font-scale, 1));
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
		flex-shrink: 0;
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
