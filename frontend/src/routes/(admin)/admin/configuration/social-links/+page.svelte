<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Link, Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import IconPicker from '$lib/admin/components/ui/IconPicker.svelte';
	import { getIconCategories, getCustomOptions, type IconOption } from '$lib/admin/services/iconLibraryService';

	interface SocialLink {
		id: string;
		name: string;
		url: string;
		iconType: 'coreui-brand' | 'svg-url' | 'custom-text';
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
		iconType: 'coreui-brand' as 'coreui-brand' | 'svg-url' | 'custom-text',
		iconName: '',
		iconText: '',
		svgUrl: '',
		displayOrder: 0,
		isActive: true
	});

	let selectedIcon: IconOption | null = $state(null);
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

			const linkData = {
				...formData,
				iconName: formData.iconType === 'custom-text' ? null : selectedIcon?.iconName || formData.iconName,
				iconText: formData.iconType === 'custom-text' ? formData.iconText : null,
				svgUrl: formData.iconType === 'svg-url' ? formData.svgUrl : null
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

	function editLink(link: SocialLink) {
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

		// Find the selected icon
		if (link.iconType !== 'custom-text' && link.iconName) {
			const allIcons = iconCategories.flatMap(cat => cat.icons);
			selectedIcon = allIcons.find(icon => icon.iconName === link.iconName) || null;
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
		if (icon) {
			formData.iconType = icon.type;
			formData.iconName = icon.iconName || '';
			formData.iconText = icon.text || '';
			formData.svgUrl = icon.svgUrl || '';
		}
	}

	function handleIconTypeChange() {
		selectedIcon = null;
		formData.iconName = '';
		formData.iconText = '';
		formData.svgUrl = '';
		customSvgUrl = '';
		customText = '';
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
							{#if link.iconType === 'custom-text'}
								<span class="text-icon">{link.iconText}</span>
							{:else if link.iconType === 'svg-url' && link.svgUrl}
								<img src={link.svgUrl} alt={link.name} width="20" height="20" />
							{:else if link.iconType === 'coreui-brand' && link.iconName}
								<Icon icon={`cib:${link.iconName}`} width="20" height="20" />
							{:else}
								<Link size={20} />
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
						/>
					</div>

					<div class="form-group">
						<label for="iconType">Icon Type</label>
						<select id="iconType" bind:value={formData.iconType} onchange={handleIconTypeChange}>
							<option value="coreui-brand">CoreUI Brand Icon</option>
							<option value="svg-url">Custom SVG URL</option>
							<option value="custom-text">Custom Text</option>
						</select>
					</div>

					{#if formData.iconType === 'svg-url'}
						<div class="form-group">
							<label for="svgUrl">SVG URL</label>
							<input 
								type="url" 
								id="svgUrl"
								bind:value={formData.svgUrl}
								placeholder="https://example.com/icon.svg"
							/>
							<small>Enter a direct URL to an SVG file</small>
						</div>
					{:else if formData.iconType === 'custom-text'}
						<div class="form-group">
							<label for="customText">Custom Text</label>
							<input 
								type="text" 
								id="customText"
								bind:value={formData.iconText}
								placeholder="e.g., Custom, Logo, etc."
								maxlength="20"
							/>
							<small>This will be displayed as a styled text badge</small>
						</div>
					{:else}
						<div class="form-group">
							<label>Select Icon</label>
							<IconPicker 
								selectedIcon={selectedIcon}
								onIconSelect={handleIconSelect}
								placeholder="Choose from icon library..."
							/>
						</div>
					{/if}

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
</div>

<style>
	.social-links-page {
		max-width: 1000px;
		margin: 0 auto;
		background: #1a1a1a;
		color: #ffffff;
		min-height: 100vh;
		padding: 24px;
	}

	:global(html:not(.dark)) .social-links-page {
		background: #ffffff;
		color: #1f2937;
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
		color: #ffffff;
		margin: 0 0 8px 0;
		font-size: 28px;
		font-weight: 600;
	}

	:global(html:not(.dark)) .header-text h1 {
		color: #1f2937;
	}

	.header-text p {
		color: #a1a1aa;
		margin: 0;
		font-size: 16px;
	}

	:global(html:not(.dark)) .header-text p {
		color: #6b7280;
	}

	.add-button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 20px;
		background: var(--accent-color, #3b82f6);
		color: var(--accent-color-contrast, #ffffff);
		border: none;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.add-button:hover:not(:disabled) {
		background: var(--accent-color-dark, #2563eb);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.add-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}


	.loading {
		text-align: center;
		padding: 64px 0;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #374151;
		border-top: 4px solid #6366f1;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 16px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.empty-state {
		text-align: center;
		padding: 64px 0;
	}

	.empty-icon {
		color: #6b7280;
		margin-bottom: 16px;
	}

	.empty-state h3 {
		color: #ffffff;
		margin: 0 0 8px 0;
		font-size: 20px;
		font-weight: 600;
	}

	.empty-state p {
		color: #9ca3af;
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
		padding: 20px;
		background: #1f2937;
		border: 1px solid #374151;
		border-radius: 12px;
		transition: all 0.2s ease;
	}

	:global(html:not(.dark)) .link-item {
		background: #ffffff;
		border-color: #e5e7eb;
	}

	.link-item:hover {
		border-color: #4b5563;
		transform: translateY(-1px);
	}

	:global(html:not(.dark)) .link-item:hover {
		border-color: #d1d5db;
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
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #374151;
		border-radius: 8px;
		color: #ffffff;
	}

	.text-icon {
		font-size: 18px;
		font-weight: 600;
	}

	.link-details h3 {
		color: #ffffff;
		margin: 0 0 4px 0;
		font-size: 16px;
		font-weight: 600;
	}

	:global(html:not(.dark)) .link-details h3 {
		color: #1f2937;
	}

	.link-details p {
		color: #9ca3af;
		margin: 0 0 8px 0;
		font-size: 14px;
		word-break: break-all;
	}

	:global(html:not(.dark)) .link-details p {
		color: #6b7280;
	}

	.link-meta {
		display: flex;
		gap: 12px;
		font-size: 12px;
		color: #6b7280;
	}

	:global(html:not(.dark)) .link-meta {
		color: #9ca3af;
	}

	.link-actions {
		display: flex;
		gap: 8px;
	}

	.action-button {
		padding: 8px;
		border: 1px solid #374151;
		background: #111827;
		color: #9ca3af;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(html:not(.dark)) .action-button {
		border-color: #e5e7eb;
		background: #f9fafb;
		color: #6b7280;
	}

	.action-button:hover {
		background: #374151;
		color: #ffffff;
	}

	:global(html:not(.dark)) .action-button:hover {
		background: #e5e7eb;
		color: #1f2937;
	}

	.action-button.danger:hover {
		background: #7f1d1d;
		border-color: #ef4444;
		color: #fecaca;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.modal {
		background: #1a1a1a;
		border: 1px solid #2a2a2a;
		border-radius: 16px;
		width: 90%;
		max-width: 600px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		animation: slideIn 0.3s ease-out;
		position: relative;
		margin: 0 auto;
		box-sizing: border-box;
	}

	:global(html:not(.dark)) .modal {
		background: #ffffff;
		border-color: #e5e7eb;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	}

	@keyframes slideIn {
		from { 
			opacity: 0;
			transform: translateY(-20px) scale(0.95);
		}
		to { 
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid #2a2a2a;
	}

	:global(html:not(.dark)) .modal-header {
		border-bottom-color: #e5e7eb;
	}

	.modal-header h2 {
		color: #ffffff;
		margin: 0;
		font-size: 20px;
		font-weight: 600;
	}

	:global(html:not(.dark)) .modal-header h2 {
		color: #1f2937;
	}

	.close-button {
		background: none;
		border: none;
		color: #a1a1aa;
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

	:global(html:not(.dark)) .close-button {
		color: #6b7280;
	}

	.close-button:hover {
		background: #2a2a2a;
		color: #ffffff;
	}

	:global(html:not(.dark)) .close-button:hover {
		background: #f3f4f6;
		color: #1f2937;
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
		color: #ffffff;
		font-weight: 500;
		margin-bottom: 8px;
		font-size: 14px;
	}

	:global(html:not(.dark)) .form-group label {
		color: #1f2937;
	}

	.form-group input,
	.form-group select {
		width: 100%;
		padding: 12px 16px;
		border: 1px solid #2a2a2a;
		border-radius: 8px;
		background: #1a1a1a;
		color: #ffffff;
		font-size: 14px;
		transition: border-color 0.2s ease;
		box-sizing: border-box;
		max-width: 100%;
	}

	:global(html:not(.dark)) .form-group input,
	:global(html:not(.dark)) .form-group select {
		border-color: #d1d5db;
		background: #ffffff;
		color: #1f2937;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--accent-color, #3b82f6);
		box-shadow: 0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1));
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
		color: #ffffff;
		font-size: 14px;
	}

	:global(html:not(.dark)) .checkbox-text {
		color: #1f2937;
	}

	.form-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}

	.cancel-button {
		padding: 12px 20px;
		border: 1px solid #2a2a2a;
		background: #1a1a1a;
		color: #a1a1aa;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	:global(html:not(.dark)) .cancel-button {
		border-color: #d1d5db;
		background: #f9fafb;
		color: #6b7280;
	}

	.cancel-button:hover {
		background: #2a2a2a;
		color: #ffffff;
	}

	:global(html:not(.dark)) .cancel-button:hover {
		background: #e5e7eb;
		color: #1f2937;
	}

	.save-button {
		padding: 12px 20px;
		background: var(--accent-color, #3b82f6);
		color: var(--accent-color-contrast, #ffffff);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.save-button:hover:not(:disabled) {
		background: var(--accent-color-dark, #2563eb);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
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
