<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Link, Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import UnifiedIconPicker from '$lib/admin/components/ui/UnifiedIconPicker.svelte';
	import { getIconCategories, getCustomOptions, type IconOption } from '$lib/admin/services/iconLibraryService';
	import { getIconRenderInfo } from '$lib/site/utils/iconHelper';
	import type { ComponentType } from 'svelte';

	interface SocialLink {
		id: string;
		name: string;
		url: string;
		iconType: 'coreui-brand' | 'lucide' | 'svg-url' | 'custom-text';
		iconName?: string;
		iconText?: string;
		svgUrl?: string;
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

	// Form data
	let formData = $state({
		name: '',
		url: '',
		iconType: 'coreui-brand' as 'coreui-brand' | 'lucide' | 'svg-url' | 'custom-text',
		iconName: '',
		iconText: '',
		svgUrl: '',
		displayOrder: 0,
		isActive: true
	});

	let selectedIcon: IconOption | null = $state(null);
	let iconPickerOpen = $state(false);
	let customSvgUrl = $state('');
	let customText = $state('');

	onMount(async () => {
		await loadIconCategories();
		loadSocialLinks();
	});

	async function loadIconCategories() {
		try {
			iconCategories = await getIconCategories();
		} catch (error) {
			console.error('Failed to load icon categories:', error);
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
				console.error('Failed to load social links:', data.error);
			}
		} catch (error) {
			console.error('Error loading social links:', error);
		} finally {
			isLoading = false;
		}
	}

	async function saveLink() {
		try {
			isSaving = true;

			// Determine icon type and values from selectedIcon
			let iconType: 'coreui-brand' | 'lucide' | 'svg-url' | 'custom-text' = 'coreui-brand';
			let iconName: string | null = null;
			let iconText: string | null = null;
			let svgUrl: string | null = null;

			if (selectedIcon) {
				iconType = selectedIcon.type as 'coreui-brand' | 'lucide' | 'svg-url' | 'custom-text';
				
				if (selectedIcon.type === 'svg-url') {
					svgUrl = selectedIcon.svgUrl || selectedIcon.name; // Use name if it's the URL
					iconName = null;
					iconText = null;
				} else if (selectedIcon.type === 'custom-text') {
					iconText = selectedIcon.text || selectedIcon.name.replace('custom-text-', '');
					iconName = null;
					svgUrl = null;
				} else if (selectedIcon.type === 'lucide') {
					iconName = selectedIcon.iconName || selectedIcon.name.replace('lucide-', '');
					iconText = null;
					svgUrl = null;
				} else {
					// CoreUI brand icon
					iconName = selectedIcon.iconName || selectedIcon.name.replace('cib-', '');
					iconText = null;
					svgUrl = null;
				}
			}

			const linkData = {
				...formData,
				iconType,
				iconName,
				iconText,
				svgUrl
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
			console.error('Error saving link:', error);
			toast.error('Error saving link', {
				description: 'An unexpected error occurred. Please try again.'
			});
		} finally {
			isSaving = false;
		}
	}

	async function deleteLink(id: string) {
		if (!confirm('Are you sure you want to delete this link?')) return;

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
			console.error('Error deleting link:', error);
			toast.error('Error deleting link', {
				description: 'An unexpected error occurred. Please try again.'
			});
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
			console.error('Error toggling link:', error);
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
		} else if (link.iconType === 'custom-text' && link.iconText) {
			selectedIcon = {
				name: `custom-text-${link.iconText}`,
				displayName: 'Custom Text',
				type: 'custom-text',
				text: link.iconText,
				category: 'custom'
			};
		} else if (link.iconType === 'lucide' && link.iconName) {
			const allIcons = iconCategories.flatMap(cat => cat.icons);
			selectedIcon = allIcons.find(icon => icon.type === 'lucide' && icon.iconName === link.iconName) || null;
		} else if (link.iconType === 'coreui-brand' && link.iconName) {
			const allIcons = iconCategories.flatMap(cat => cat.icons);
			selectedIcon = allIcons.find(icon => icon.type === 'coreui-brand' && icon.iconName === link.iconName) || null;
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
			displayOrder: socialLinks.length,
			isActive: true
		};
		selectedIcon = null;
		editingLink = null;
		showAddForm = false;
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
	<title>Social Links - Site Settings - dane.gg Admin</title>
</svelte:head>

<div class="social-links-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-text">
				<h1>Social Links</h1>
				<p>Manage your social media and external links displayed on the website</p>
			</div>
			<button 
				class="add-button" 
				onclick={() => { resetForm(); showAddForm = true; }}
				disabled={isSaving}
			>
				<Plus size={20} />
				Add Link
			</button>
		</div>
	</div>


	{#if isLoading}
		<div class="loading">
			<div class="loading-spinner"></div>
			<p>Loading social links...</p>
		</div>
	{:else if socialLinks.length === 0}
		<div class="empty-state">
			<Link size={48} class="empty-icon" />
			<h3>No social links yet</h3>
			<p>Add your first social media link to get started</p>
			<button 
				class="add-button" 
				onclick={() => { resetForm(); showAddForm = true; }}
			>
				<Plus size={20} />
				Add Your First Link
			</button>
		</div>
	{:else}
		<div class="links-list">
			{#each socialLinks as link (link.id)}
				<div class="link-item" class:inactive={!link.isActive}>
					<div class="link-info">
						<div class="link-icon">
							{#if link.iconType === 'custom-text' && link.iconText}
								<span class="text-icon">{link.iconText}</span>
							{:else if link.iconType === 'svg-url' && link.svgUrl}
								<img src={link.svgUrl} alt={link.name} width="20" height="20" />
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
								<!-- Default icon when no specific icon is set -->
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
						<button 
							class="action-button" 
							onclick={() => editLink(link)}
							title="Edit link"
						>
							<Edit size={16} />
						</button>
						<button 
							class="action-button danger" 
							onclick={() => deleteLink(link.id)}
							title="Delete link"
						>
							<Trash2 size={16} />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if showAddForm}
		<div class="modal-overlay" onclick={resetForm}>
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h2>{editingLink ? 'Edit Link' : 'Add New Link'}</h2>
					<button class="close-button" onclick={resetForm}>
						×
					</button>
				</div>

				<form class="modal-form" onsubmit={(e) => { e.preventDefault(); saveLink(); }}>
					<div class="form-group">
						<label for="name">Link Name *</label>
						<input 
							type="text" 
							id="name"
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
							bind:value={formData.url}
							placeholder="https://example.com"
							required
							class="form-input"
						/>
					</div>

					<div class="form-group">
						<label>Icon</label>
						<div class="icon-selection-section">
							<button
								type="button"
								class="icon-button"
								onclick={() => iconPickerOpen = true}
								title="Choose icon"
							>
								{#if selectedIcon}
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
								{:else}
									<Icon icon="lucide:image" width="20" height="20" />
								{/if}
							</button>
							<div class="icon-info">
								{#if selectedIcon}
									<div class="icon-name">{selectedIcon.displayName}</div>
									<div class="icon-pack">
										{selectedIcon.type === 'coreui-brand' ? 'CoreUI' : 
										 selectedIcon.type === 'lucide' ? 'Lucide' : 
										 selectedIcon.type === 'svg-url' ? 'Custom SVG' : 
										 selectedIcon.type === 'custom-text' ? 'Custom Text' : 
										 'Unknown'}
									</div>
								{:else}
									<div class="icon-name">No icon selected</div>
									<div class="icon-pack">Click to choose</div>
								{/if}
							</div>
						</div>
					</div>

					<div class="form-group">
						<label for="displayOrder">Display Order</label>
						<input 
							type="number" 
							id="displayOrder"
							bind:value={formData.displayOrder}
							min="0"
						/>
					</div>

					<div class="form-group checkbox-group">
						<label class="checkbox-label">
							<input 
								type="checkbox" 
								bind:checked={formData.isActive}
							/>
							<span class="checkbox-text">Active (visible on website)</span>
						</label>
					</div>

					<div class="form-actions">
						<button type="button" class="cancel-button" onclick={resetForm}>
							Cancel
						</button>
						<button type="submit" class="save-button" disabled={isSaving}>
							{isSaving ? 'Saving...' : (editingLink ? 'Update Link' : 'Add Link')}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if iconPickerOpen}
		<UnifiedIconPicker
			selectedIcon={selectedIcon}
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
		padding: 24px;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 32px;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-text h1 {
		color: var(--text-primary, #ffffff);
		margin: 0 0 8px 0;
		font-size: 28px;
		font-weight: 600;
	}

	.header-text p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0;
		font-size: 14px;
	}

	.add-button {
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

	.add-button:hover:not(:disabled) {
		background: var(--accent-hover, #5558e3);
		transform: translateY(-1px);
	}

	.add-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
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
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.empty-icon {
		color: var(--text-secondary, #a1a1aa);
		margin-bottom: 16px;
	}

	.empty-state h3 {
		color: var(--text-primary, #ffffff);
		margin: 0 0 8px 0;
		font-size: 20px;
		font-weight: 600;
	}

	.empty-state p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0 0 24px 0;
	}

	.links-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.link-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.link-item:hover {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: var(--accent-color, #6366f1);
	}

	.link-item.inactive {
		opacity: 0.6;
	}

	.link-info {
		display: flex;
		align-items: center;
		gap: 16px;
		flex: 1;
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
	
	.default-icon {
		opacity: 0.7;
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
	}

	.action-button {
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
	}

	.action-button:hover {
		background: var(--bg-primary, #1a1a1a);
	}

	.action-button.edit:hover {
		color: var(--accent-color, #6366f1);
	}

	.action-button.danger:hover {
		color: #ef4444;
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
		max-width: 600px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		position: relative;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.modal-header h2 {
		color: var(--text-primary, #ffffff);
		margin: 0;
		font-size: 20px;
		font-weight: 600;
	}

	.close-button {
		background: none;
		border: none;
		color: var(--text-secondary, #a1a1aa);
		font-size: 24px;
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
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

	.modal-form {
		padding: 24px;
		width: 100%;
		box-sizing: border-box;
		overflow-x: hidden;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: block;
		color: var(--text-primary, #ffffff);
		font-weight: 500;
		margin-bottom: 8px;
		font-size: 14px;
	}

	.icon-selection-section {
		display: flex;
		align-items: center;
		gap: 12px;
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

	.icon-info {
		flex: 1;
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

	.form-group input,
	.form-group select {
		width: 100%;
		padding: 12px 16px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		background: var(--bg-secondary, #2d2d2d);
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		transition: border-color 0.2s ease;
		box-sizing: border-box;
		max-width: 100%;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.checkbox-group {
		margin-bottom: 24px;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
	}

	.checkbox-label input[type="checkbox"] {
		width: auto;
		margin: 0;
	}

	.checkbox-text {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.form-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}

	.cancel-button {
		padding: 12px 20px;
		border: 1px solid var(--border-color, #3a3a3a);
		background: transparent;
		color: var(--text-primary, #ffffff);
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.cancel-button:hover {
		background: var(--bg-secondary, #2d2d2d);
	}

	.save-button {
		padding: 12px 20px;
		background: var(--accent-color, #6366f1);
		color: white;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.save-button:hover:not(:disabled) {
		background: var(--accent-hover, #5558e3);
		transform: translateY(-1px);
	}

	.save-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.social-links-page {
			padding: 0 16px;
		}

		.header-content {
			flex-direction: column;
			align-items: flex-start;
			gap: 16px;
		}

		.modal {
			width: 95%;
			max-width: none;
			margin: 16px;
			max-height: 95vh;
		}

		.modal-overlay {
			padding: 16px;
			align-items: flex-start;
			justify-content: center;
		}

		.modal-header {
			padding: 16px 20px;
		}

		.modal-form {
			padding: 20px;
		}

		.form-actions {
			flex-direction: column;
		}

		.form-actions button {
			width: 100%;
		}

		.link-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 16px;
		}

		.link-info {
			width: 100%;
		}

		.link-actions {
			width: 100%;
			justify-content: flex-end;
		}
	}

	@media (max-width: 480px) {
		.page-header {
			margin-bottom: 24px;
		}

		.header-text h1 {
			font-size: 24px;
		}

		.header-text p {
			font-size: 14px;
		}

		.add-button {
			padding: 10px 16px;
			font-size: 14px;
		}

		.modal {
			width: 100%;
			margin: 8px;
			max-height: 98vh;
		}

		.modal-overlay {
			padding: 8px;
		}

		.modal-header {
			padding: 16px;
		}

		.modal-form {
			padding: 16px;
		}

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
