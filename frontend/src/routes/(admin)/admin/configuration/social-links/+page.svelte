<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import UnifiedIconPicker from '$lib/admin/components/ui/UnifiedIconPicker.svelte';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';
	import { getIconCategories, type IconOption } from '$lib/admin/services/iconLibraryService';
	import { sanitizeSvgInlineMarkup } from '@repo/shared/utils/sanitizeSvgInline';
	import { getIconRenderInfo } from '$lib/site/utils/iconHelper';

	interface SocialLink {
		id: string;
		name: string;
		url: string;
		iconType: 'coreui-brand' | 'lucide' | 'svg-url' | 'svg-inline' | 'custom-text';
		iconName?: string;
		iconText?: string;
		svgUrl?: string;
		svgInline?: string | null;
		displayOrder: number;
		isActive: boolean;
		createdAt: string;
		updatedAt: string;
	}

	let socialLinks: SocialLink[] = $state([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let showAddForm = $state(false);
	let editingLink: SocialLink | null = $state(null);
	let iconCategories: any[] = $state([]);
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	// Form data
	let formData = $state({
		name: '',
		url: '',
		iconType: 'coreui-brand' as
			| 'coreui-brand'
			| 'lucide'
			| 'svg-url'
			| 'svg-inline'
			| 'custom-text',
		iconName: '',
		iconText: '',
		svgUrl: '',
		svgInline: '',
		displayOrder: 0,
		isActive: true
	});

	let selectedIcon: IconOption | null = $state(null);
	let iconPickerOpen = $state(false);

	let showDeleteLinkDialog = $state(false);
	let pendingDeleteLinkId = $state<string | null>(null);

	onMount(async () => {
		await loadIconCategories();
		loadSocialLinks();
	});

	async function loadIconCategories() {
		try {
			iconCategories = await getIconCategories();
		} catch (error) {
			logger.error('Failed to load icon categories:', error);
		}
	}

	async function loadSocialLinks() {
		try {
			isLoading = true;
			const response = await fetch('/api/social-links/admin');
			const data = await response.json();

			if (data.success) {
				socialLinks = data.data;
			} else {
				logger.error('Failed to load social links:', data.error);
			}
		} catch (error) {
			logger.error('Error loading social links:', error);
		} finally {
			isLoading = false;
		}
	}

	async function saveLink() {
		try {
			isSaving = true;

			// Determine icon type and values from selectedIcon
			let iconType:
				| 'coreui-brand'
				| 'lucide'
				| 'svg-url'
				| 'svg-inline'
				| 'custom-text' = 'coreui-brand';
			let iconName: string | null = null;
			let iconText: string | null = null;
			let svgUrl: string | null = null;
			let svgInline: string | null = null;

			if (selectedIcon) {
				iconType = selectedIcon.type as typeof iconType;

				if (selectedIcon.type === 'svg-url') {
					svgUrl = selectedIcon.svgUrl || selectedIcon.name; // Use name if it's the URL
					iconName = null;
					iconText = null;
					svgInline = null;
				} else if (selectedIcon.type === 'svg-inline') {
					svgInline = selectedIcon.svgInline ?? null;
					iconName = null;
					iconText = null;
					svgUrl = null;
				} else if (selectedIcon.type === 'custom-text') {
					iconText = selectedIcon.text || selectedIcon.name.replace('custom-text-', '');
					iconName = null;
					svgUrl = null;
					svgInline = null;
				} else if (selectedIcon.type === 'lucide') {
					iconName = selectedIcon.iconName || selectedIcon.name.replace('lucide-', '');
					iconText = null;
					svgUrl = null;
					svgInline = null;
				} else {
					// CoreUI brand icon
					iconName = selectedIcon.iconName || selectedIcon.name.replace('cib-', '');
					iconText = null;
					svgUrl = null;
					svgInline = null;
				}
			}

			const linkData = {
				...formData,
				iconType,
				iconName,
				iconText,
				svgUrl,
				svgInline
			};

			const url = editingLink ? `/api/social-links/${editingLink.id}` : '/api/social-links';
			const method = editingLink ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(linkData)
			});

			const data = await response.json();

			if (data.success) {
				toast.success(editingLink ? 'Link updated successfully!' : 'Link added successfully!');
				await loadSocialLinks();
				resetForm();
			} else {
				toast.error(`Failed to ${editingLink ? 'update' : 'add'} link`, {
					description: data.error
				});
			}
		} catch (error) {
			logger.error('Error saving link:', error);
			toast.error('Error saving link', {
				description: 'An unexpected error occurred. Please try again.'
			});
		} finally {
			isSaving = false;
		}
	}

	function requestDeleteLink(id: string) {
		pendingDeleteLinkId = id;
		showDeleteLinkDialog = true;
	}

	function cancelDeleteLink() {
		showDeleteLinkDialog = false;
		pendingDeleteLinkId = null;
	}

	async function confirmDeleteLink() {
		if (!pendingDeleteLinkId) return;
		const id = pendingDeleteLinkId;
		try {
			const response = await fetch(`/api/social-links/${id}`, {
				method: 'DELETE'
			});

			const data = await response.json();

			if (data.success) {
				toast.success('Link deleted successfully!');
				await loadSocialLinks();
			} else {
				toast.error('Failed to delete link', {
					description: data.error
				});
			}
		} catch (error) {
			logger.error('Error deleting link:', error);
			toast.error('Error deleting link', {
				description: 'An unexpected error occurred. Please try again.'
			});
		} finally {
			cancelDeleteLink();
		}
	}

	async function toggleActive(id: string) {
		try {
			const response = await fetch(`/api/social-links/${id}/toggle`, {
				method: 'PATCH'
			});

			const data = await response.json();

			if (data.success) {
				toast.success('Link status updated!');
				await loadSocialLinks();
			} else {
				toast.error('Failed to update link status', {
					description: data.error
				});
			}
		} catch (error) {
			logger.error('Error toggling link:', error);
			toast.error('Error updating link', {
				description: 'An unexpected error occurred. Please try again.'
			});
		}
	}

	async function editLink(link: SocialLink) {
		editingLink = link;
		formData = {
			name: link.name,
			url: link.url,
			iconType: link.iconType,
			iconName: link.iconName || '',
			iconText: link.iconText || '',
			svgUrl: link.svgUrl || '',
			svgInline: link.svgInline || '',
			displayOrder: link.displayOrder,
			isActive: link.isActive
		};

		// Find or create the selected icon based on type
		if (link.iconType === 'svg-url' && link.svgUrl) {
			selectedIcon = {
				name: link.svgUrl,
				displayName: 'Custom SVG URL',
				type: 'svg-url',
				svgUrl: link.svgUrl,
				category: 'custom'
			};
		} else if (link.iconType === 'svg-inline' && link.svgInline) {
			selectedIcon = {
				name: 'svg-inline-custom',
				displayName: 'Custom SVG (paste code)',
				type: 'svg-inline',
				svgInline: link.svgInline,
				category: 'custom'
			};
		} else if (link.iconType === 'custom-text' && link.iconText) {
			selectedIcon = {
				name: `custom-text-${link.iconText}`,
				displayName: 'Custom Text',
				type: 'custom-text',
				text: link.iconText,
				category: 'custom'
			};
		} else if (link.iconType === 'lucide' && link.iconName) {
			const allIcons = iconCategories.flatMap((cat) => cat.icons);
			selectedIcon =
				allIcons.find((icon) => icon.type === 'lucide' && icon.iconName === link.iconName) || null;
		} else if (link.iconType === 'coreui-brand' && link.iconName) {
			const allIcons = iconCategories.flatMap((cat) => cat.icons);
			selectedIcon =
				allIcons.find((icon) => icon.type === 'coreui-brand' && icon.iconName === link.iconName) ||
				null;
		} else {
			selectedIcon = null;
		}

		showAddForm = true;
	}

	function resetForm() {
		formData = {
			name: '',
			url: '',
			iconType: 'coreui-brand',
			iconName: '',
			iconText: '',
			svgUrl: '',
			svgInline: '',
			displayOrder: socialLinks.length,
			isActive: true
		};
		selectedIcon = null;
		editingLink = null;
		showAddForm = false;
	}

	function handleDragStart(index: number) {
		if (editingLink || showAddForm) return;
		draggedIndex = index;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (editingLink || showAddForm || draggedIndex === null || draggedIndex === index) return;
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	async function handleDrop(e: DragEvent, index: number) {
		e.preventDefault();
		if (editingLink || showAddForm || draggedIndex === null || draggedIndex === index) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}

		const items = [...socialLinks];
		const [draggedItem] = items.splice(draggedIndex, 1);
		items.splice(index, 0, draggedItem);

		try {
			const updates = items.map((item, idx) => ({
				id: item.id,
				displayOrder: idx
			}));

			const response = await fetch('/api/social-links/reorder', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({ updates })
			});

			const data = await response.json();

			if (data.success) {
				await loadSocialLinks();
			} else {
				toast.error('Failed to reorder links', {
					description: data.error
				});
			}
		} catch (error) {
			logger.error('Error reordering links:', error);
			toast.error('Error reordering links', {
				description: 'An unexpected error occurred. Please try again.'
			});
		} finally {
			draggedIndex = null;
			dragOverIndex = null;
		}
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleIconSelect(icon: IconOption | null) {
		selectedIcon = icon;
	}

	function getIconNameFromOption(icon: IconOption | null): string | null {
		if (!icon) return null;
		if (icon.type === 'lucide' && icon.iconName) {
			return icon.iconName;
		}
		if (icon.type === 'svg-url' && icon.svgUrl) {
			return icon.svgUrl;
		}
		if (icon.type === 'svg-inline') {
			return null;
		}
		if (icon.type === 'custom-text' && icon.text) {
			return icon.text;
		}
		if (icon.type === 'coreui-brand' && icon.iconName) {
			return `cib-${icon.iconName}`;
		}
		return icon.name || null;
	}
</script>

<svelte:head>
	<title>{adminPageTitle('Social links')}</title>
</svelte:head>

<ConfirmDialog
	bind:open={showDeleteLinkDialog}
	title="Delete link"
	message="Remove this social link from the site?"
	detail="This cannot be undone."
	variant="danger"
	confirmLabel="Delete link"
	cancelLabel="Cancel"
	onConfirm={confirmDeleteLink}
	onCancel={cancelDeleteLink}
/>

<div class="social-links-page">
	<div class="settings-description">
		<p>Manage your social media and external links displayed on the website</p>
	</div>

	{#if isLoading}
		<div class="loading">
			<div class="loading-spinner"></div>
			<p>Loading social links...</p>
		</div>
	{:else}
		<div class="links-list" role="list">
			{#if socialLinks.length > 0}
				{#each socialLinks as link, index (link.id)}
					<div
						class="link-item"
						role="listitem"
						aria-label={`Reorder social link: ${link.name}`}
						class:inactive={!link.isActive}
						class:dragging={draggedIndex === index}
						class:drag-over={dragOverIndex === index}
						class:not-draggable={editingLink !== null || showAddForm}
						draggable={editingLink === null && !showAddForm}
						ondragstart={() => handleDragStart(index)}
						ondragover={(e) => handleDragOver(e, index)}
						ondragleave={handleDragLeave}
						ondrop={(e) => handleDrop(e, index)}
						ondragend={handleDragEnd}
					>
						{#if editingLink === null && !showAddForm}
							<div class="drag-handle" title="Drag to reorder">
								<GripVertical size={20} />
							</div>
						{/if}
						{#if editingLink?.id === link.id}
							<div class="new-link-form">
								<h3>{editingLink ? 'Edit Link' : 'Add New Link'}</h3>
								<form
									onsubmit={(e) => {
										e.preventDefault();
										saveLink();
									}}
								>
									<div class="form-group">
										<label for="name">Link Name *</label>
										<input
											type="text"
											id="name"
											class="edit-input"
											bind:value={formData.name}
											placeholder="e.g., Twitter, GitHub, Portfolio"
											required
										/>
									</div>

									<div class="form-group">
										<label for="url">URL *</label>
										<input
											type="url"
											id="url"
											class="edit-input"
											bind:value={formData.url}
											placeholder="https://example.com"
											required
										/>
									</div>

									<div class="form-group">
										<label for="social-link-icon-edit">Icon</label>
										<div class="icon-selection-section">
											<button
												id="social-link-icon-edit"
												type="button"
												class="icon-button"
												onclick={() => (iconPickerOpen = true)}
												title="Choose icon"
											>
												{#if selectedIcon}
													{#if selectedIcon.type === 'svg-inline' && selectedIcon.svgInline}
														{@const safeSvg = sanitizeSvgInlineMarkup(selectedIcon.svgInline)}
														{#if safeSvg}
															<span class="svg-inline-thumb" aria-hidden="true">{@html safeSvg}</span>
														{:else}
															<Icon icon="lucide:image" width="20" height="20" />
														{/if}
													{:else}
														{@const iconName = getIconNameFromOption(selectedIcon)}
														{@const iconInfo = getIconRenderInfo(iconName)}
														{#if iconInfo.type === 'component' && iconInfo.component}
															{@const IconComponent = iconInfo.component}
															<IconComponent size={20} />
														{:else if iconInfo.type === 'iconify' && iconInfo.icon}
															<Icon icon={iconInfo.icon} width="20" height="20" />
														{:else if iconInfo.type === 'svg' && iconInfo.url}
															<img src={iconInfo.url} alt="Icon" width="20" height="20" />
														{:else if iconInfo.type === 'text' && iconInfo.text}
															<span class="text-icon-small">{iconInfo.text}</span>
														{:else}
															<Icon icon="lucide:image" width="20" height="20" />
														{/if}
													{/if}
												{:else}
													<Icon icon="lucide:image" width="20" height="20" />
												{/if}
											</button>
											<div class="icon-info">
												{#if selectedIcon}
													<div class="icon-name">{selectedIcon.displayName}</div>
													<div class="icon-pack">
														{selectedIcon.type === 'coreui-brand'
															? 'CoreUI'
															: selectedIcon.type === 'lucide'
																? 'Lucide'
																: selectedIcon.type === 'svg-url'
																	? 'Custom SVG URL'
																	: selectedIcon.type === 'svg-inline'
																		? 'Inline SVG'
																		: selectedIcon.type === 'custom-text'
																			? 'Custom Text'
																			: 'Unknown'}
													</div>
												{:else}
													<div class="icon-name">No icon selected</div>
													<div class="icon-pack">Click to choose</div>
												{/if}
											</div>
										</div>
									</div>

									<div class="form-group">
										<label class="checkbox-label">
											<input type="checkbox" bind:checked={formData.isActive} />
											<span>Active (visible on website)</span>
										</label>
									</div>

									<div class="form-actions">
										<button type="submit" class="save-btn" disabled={isSaving}>
											{isSaving ? 'Saving...' : editingLink ? 'Update Link' : 'Add Link'}
										</button>
										<button type="button" class="cancel-btn" onclick={resetForm}> Cancel </button>
									</div>
								</form>
							</div>
						{:else}
							<div class="link-info">
								<div class="link-icon">
									{#if link.iconType === 'custom-text' && link.iconText}
										<span class="text-icon">{link.iconText}</span>
									{:else if link.iconType === 'svg-url' && link.svgUrl}
										<img src={link.svgUrl} alt={link.name} width="20" height="20" />
									{:else if link.iconType === 'svg-inline' && link.svgInline}
										{@const safeListSvg = sanitizeSvgInlineMarkup(link.svgInline)}
										{#if safeListSvg}
											<span class="svg-inline-thumb" aria-hidden="true">{@html safeListSvg}</span>
										{:else}
											<Icon icon="lucide:external-link" width="20" height="20" class="default-icon" />
										{/if}
									{:else if link.iconType === 'coreui-brand' && link.iconName}
										<Icon icon={`cib:${link.iconName.replace('cb-', '')}`} width="20" height="20" />
									{:else if link.iconType === 'lucide' && link.iconName}
										{@const iconInfo = getIconRenderInfo(link.iconName)}
										{#if iconInfo.type === 'component' && iconInfo.component}
											{@const IconComponent = iconInfo.component}
											<IconComponent size={20} />
										{:else}
											<Icon icon="lucide:external-link" width="20" height="20" />
										{/if}
									{:else}
										<Icon icon="lucide:external-link" width="20" height="20" class="default-icon" />
									{/if}
								</div>
								<div class="link-details">
									<h3>{link.name}</h3>
									<p>{link.url}</p>
									<div class="link-meta">
										<span class="icon-type">{link.iconType}</span>
										<span class="display-order">Order: {link.displayOrder}</span>
									</div>
								</div>
							</div>
							<div class="link-actions">
								<button
									class="action-button"
									onclick={() => toggleActive(link.id)}
									title={link.isActive ? 'Hide link' : 'Show link'}
								>
									{#if link.isActive}
										<Eye size={16} />
									{:else}
										<EyeOff size={16} />
									{/if}
								</button>
								<button class="action-button" onclick={() => editLink(link)} title="Edit link">
									<Edit size={16} />
								</button>
								<button
									class="action-button danger"
									onclick={() => requestDeleteLink(link.id)}
									title="Delete link"
								>
									<Trash2 size={16} />
								</button>
							</div>
						{/if}
					</div>
				{/each}
			{/if}

			{#if showAddForm && !editingLink}
				<div class="new-link-form">
					<h3>Add New Link</h3>
					<form
						onsubmit={(e) => {
							e.preventDefault();
							saveLink();
						}}
					>
						<div class="form-group">
							<label for="name-new">Link Name *</label>
							<input
								type="text"
								id="name-new"
								class="edit-input"
								bind:value={formData.name}
								placeholder="e.g., Twitter, GitHub, Portfolio"
								required
							/>
						</div>

						<div class="form-group">
							<label for="url-new">URL *</label>
							<input
								type="url"
								id="url-new"
								class="edit-input"
								bind:value={formData.url}
								placeholder="https://example.com"
								required
							/>
						</div>

						<div class="form-group">
							<label for="social-link-icon-new">Icon</label>
							<div class="icon-selection-section">
								<button
									id="social-link-icon-new"
									type="button"
									class="icon-button"
									onclick={() => (iconPickerOpen = true)}
									title="Choose icon"
								>
									{#if selectedIcon}
										{#if selectedIcon.type === 'svg-inline' && selectedIcon.svgInline}
											{@const safeSvgNew = sanitizeSvgInlineMarkup(selectedIcon.svgInline)}
											{#if safeSvgNew}
												<span class="svg-inline-thumb" aria-hidden="true">{@html safeSvgNew}</span>
											{:else}
												<Icon icon="lucide:image" width="20" height="20" />
											{/if}
										{:else}
											{@const iconName = getIconNameFromOption(selectedIcon)}
											{@const iconInfo = getIconRenderInfo(iconName)}
											{#if iconInfo.type === 'component' && iconInfo.component}
												{@const IconComponent = iconInfo.component}
												<IconComponent size={20} />
											{:else if iconInfo.type === 'iconify' && iconInfo.icon}
												<Icon icon={iconInfo.icon} width="20" height="20" />
											{:else if iconInfo.type === 'svg' && iconInfo.url}
												<img src={iconInfo.url} alt="Icon" width="20" height="20" />
											{:else if iconInfo.type === 'text' && iconInfo.text}
												<span class="text-icon-small">{iconInfo.text}</span>
											{:else}
												<Icon icon="lucide:image" width="20" height="20" />
											{/if}
										{/if}
									{:else}
										<Icon icon="lucide:image" width="20" height="20" />
									{/if}
								</button>
								<div class="icon-info">
									{#if selectedIcon}
										<div class="icon-name">{selectedIcon.displayName}</div>
										<div class="icon-pack">
											{selectedIcon.type === 'coreui-brand'
												? 'CoreUI'
												: selectedIcon.type === 'lucide'
													? 'Lucide'
													: selectedIcon.type === 'svg-url'
														? 'Custom SVG URL'
														: selectedIcon.type === 'svg-inline'
															? 'Inline SVG'
															: selectedIcon.type === 'custom-text'
																? 'Custom Text'
																: 'Unknown'}
										</div>
									{:else}
										<div class="icon-name">No icon selected</div>
										<div class="icon-pack">Click to choose</div>
									{/if}
								</div>
							</div>
						</div>

						<div class="form-group">
							<label class="checkbox-label">
								<input type="checkbox" bind:checked={formData.isActive} />
								<span>Active (visible on website)</span>
							</label>
						</div>

						<div class="form-actions">
							<button type="submit" class="save-btn" disabled={isSaving}>
								{isSaving ? 'Saving...' : 'Add Link'}
							</button>
							<button type="button" class="cancel-btn" onclick={resetForm}> Cancel </button>
						</div>
					</form>
				</div>
			{/if}

			{#if !showAddForm && editingLink === null}
				<button
					class="add-link-btn"
					onclick={() => {
						resetForm();
						showAddForm = true;
					}}
					disabled={isSaving || editingLink !== null}
				>
					<Plus size={18} />
					Add Link
				</button>
			{/if}
		</div>
	{/if}

	{#if iconPickerOpen}
		<UnifiedIconPicker
			{selectedIcon}
			onIconSelect={(icon) => {
				handleIconSelect(icon);
				iconPickerOpen = false;
			}}
			triggerless={true}
			bind:open={iconPickerOpen}
		/>
	{/if}
</div>

<style>
	.social-links-page {
		width: 100%;
		max-width: 800px;
		min-width: 0;
		box-sizing: border-box;
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

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 64px 24px;
		text-align: center;
	}

	.loading-spinner {
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

	.links-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.link-item {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		transition: all 0.2s ease;
		cursor: move;
		min-width: 0;
		box-sizing: border-box;
	}

	.link-item.not-draggable {
		cursor: default;
	}

	.link-item.dragging {
		opacity: 0.5;
		cursor: grabbing;
	}

	.link-item.drag-over {
		border-color: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}

	.link-item:not(.dragging):not(.not-draggable):hover {
		background: var(--bg-tertiary, #3a3a3a);
	}

	.link-item.inactive {
		opacity: 0.6;
	}

	.drag-handle {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary, #a1a1aa);
		cursor: grab;
		flex-shrink: 0;
		padding: 4px;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.drag-handle:hover {
		color: var(--text-primary, #ffffff);
		background: rgba(255, 255, 255, 0.05);
	}

	.link-info {
		display: flex;
		align-items: center;
		gap: 16px;
		flex: 1;
		min-width: 0;
	}

	.link-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-tertiary, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		flex-shrink: 0;
	}

	.text-icon {
		font-size: 18px;
		font-weight: 600;
	}

	.link-details {
		flex: 1;
		min-width: 0;
	}

	.link-details h3 {
		color: var(--text-primary, #ffffff);
		margin: 0 0 4px 0;
		font-size: 16px;
		font-weight: 500;
	}

	.link-details p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0 0 8px 0;
		font-size: 14px;
		word-break: break-all;
	}

	.link-meta {
		display: flex;
		gap: 12px;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
	}

	.link-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
		margin-left: auto;
	}

	.action-button {
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

	.action-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
		border-color: var(--accent-color, #6366f1);
	}

	.action-button.danger:hover {
		background: rgba(239, 68, 68, 0.1);
		border-color: #ef4444;
		color: #ef4444;
	}

	.new-link-form {
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 24px;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.new-link-form h3 {
		margin: 0;
		color: var(--text-primary, #ffffff);
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 4px;
	}

	.new-link-form .form-group {
		margin-bottom: 20px;
	}

	.new-link-form .form-group:last-of-type {
		margin-bottom: 0;
	}

	.form-group > label {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
		margin-bottom: 8px;
	}

	.icon-selection-section {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		min-width: 0;
	}

	.icon-button {
		width: 48px;
		height: 48px;
		min-width: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-secondary, #2d2d2d);
		cursor: pointer;
		transition: all 0.2s ease;
		padding: 0;
		flex-shrink: 0;
	}

	.icon-button:hover {
		border-color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.1);
	}

	.icon-button:focus {
		outline: 2px solid var(--accent-color, #6366f1);
		outline-offset: 2px;
	}

	.svg-inline-thumb :global(svg) {
		width: 20px;
		height: 20px;
		display: block;
	}

	.icon-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.icon-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
		line-height: 1.2;
	}

	.icon-pack {
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		line-height: 1.2;
	}

	.text-icon-small {
		font-size: 10px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.edit-input {
		width: 100%;
		padding: 12px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-family: inherit;
		box-sizing: border-box;
	}

	.edit-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		cursor: pointer;
		min-width: 0;
	}

	.checkbox-label span {
		overflow-wrap: anywhere;
		line-height: 1.35;
	}

	.checkbox-label input[type='checkbox'] {
		margin-top: 2px;
		flex-shrink: 0;
	}

	.new-link-form .form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 0;
		padding-top: 0;
		border-top: none;
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
		display: inline-flex;
		align-items: center;
		gap: 8px;
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
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.add-link-btn {
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
		width: 100%;
		margin-top: 12px;
	}

	.add-link-btn:hover:not(:disabled) {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.05);
	}

	.add-link-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.social-links-page {
			padding: 0;
		}

		.form-actions {
			flex-direction: column;
		}

		.form-actions button {
			width: 100%;
		}

		.link-item {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}

		.link-info {
			width: 100%;
		}

		.link-actions {
			width: 100%;
			margin-left: 0;
			justify-content: flex-end;
			flex-wrap: wrap;
		}

		.new-link-form {
			width: 100%;
			padding: 16px;
		}

		.new-link-form .form-actions {
			flex-direction: column-reverse;
			align-items: stretch;
		}

		.new-link-form .form-actions .save-btn,
		.new-link-form .form-actions .cancel-btn {
			width: 100%;
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.link-item {
			padding: 16px;
		}

		.link-icon {
			width: 40px;
			height: 40px;
		}

		.link-details h3 {
			font-size: 14px;
		}

		.link-details p {
			font-size: 12px;
		}

		.action-button {
			padding: 6px;
		}
	}
</style>
