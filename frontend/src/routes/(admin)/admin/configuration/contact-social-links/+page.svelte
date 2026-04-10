<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Loader2, Link2, Edit2, Check, X, GripVertical } from 'lucide-svelte';
	import Icon from '@iconify/svelte';

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
	}

	let allSocialLinks: SocialLink[] = $state([]);
	let selectedLinkIds: string[] = $state([]);
	let socialHeader = $state('');
	let isLoading = $state(true);
	let isSaving = $state(false);
	let isEditingHeader = $state(false);
	let tempHeaderText = $state('');
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	onMount(async () => {
		await Promise.all([loadSocialLinks(), loadContactSocialConfig()]);
	});

	async function loadSocialLinks() {
		try {
			const response = await fetch('/api/social-links/admin', {
				credentials: 'include'
			});
			const data = await response.json();

			if (data.success) {
				allSocialLinks = data.data.sort(
					(a: SocialLink, b: SocialLink) => a.displayOrder - b.displayOrder
				);
			}
		} catch (error) {
			console.error('Error loading social links:', error);
			toast.error('Failed to load social links');
		}
	}

	async function loadContactSocialConfig() {
		try {
			const [linksResponse, headerResponse] = await Promise.all([
				fetch('/api/contact/settings/social_links', {
					credentials: 'include'
				}),
				fetch('/api/contact/settings/social_header', {
					credentials: 'include'
				})
			]);

			// Load selected link IDs
			if (linksResponse.ok) {
				const linksData = await linksResponse.json();
				if (linksData.success && linksData.data?.value) {
					try {
						selectedLinkIds = JSON.parse(linksData.data.value);
					} catch {
						selectedLinkIds = [];
					}
				}
			}

			// Load header text
			if (headerResponse.ok) {
				const headerData = await headerResponse.json();
				if (headerData.success && headerData.data?.value) {
					socialHeader = headerData.data.value;
				}
			}
		} catch (error) {
			console.error('Error loading contact social config:', error);
		} finally {
			isLoading = false;
		}
	}

	function toggleLinkSelection(linkId: string) {
		if (selectedLinkIds.includes(linkId)) {
			selectedLinkIds = selectedLinkIds.filter((id) => id !== linkId);
		} else {
			selectedLinkIds = [...selectedLinkIds, linkId];
		}
	}

	function startEditingHeader() {
		tempHeaderText = socialHeader;
		isEditingHeader = true;
	}

	function cancelEditingHeader() {
		tempHeaderText = '';
		isEditingHeader = false;
	}

	async function saveHeader() {
		try {
			const response = await fetch('/api/contact/settings/social_header', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					value: tempHeaderText
				})
			});

			const data = await response.json();

			if (data.success) {
				socialHeader = tempHeaderText;
				isEditingHeader = false;
				tempHeaderText = '';
				toast.success('Header text saved successfully');
			} else {
				toast.error('Failed to save header text');
			}
		} catch (error) {
			console.error('Error saving header:', error);
			toast.error('Failed to save header text');
		}
	}

	async function saveConfig() {
		try {
			isSaving = true;

			// Save selected link IDs
			const linksResponse = await fetch('/api/contact/settings/social_links', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					value: JSON.stringify(selectedLinkIds)
				})
			});

			// Save header text
			const headerResponse = await fetch('/api/contact/settings/social_header', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					value: socialHeader
				})
			});

			const linksData = await linksResponse.json();
			const headerData = await headerResponse.json();

			if (linksData.success && headerData.success) {
				toast.success('Contact social links configuration saved successfully');
			} else {
				toast.error('Failed to save configuration');
			}
		} catch (error) {
			console.error('Error saving contact social config:', error);
			toast.error('Failed to save configuration');
		} finally {
			isSaving = false;
		}
	}

	function handleDragStart(index: number) {
		draggedIndex = index;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === index) return;
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	async function handleDrop(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === index) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}

		const reorderedIds = [...selectedLinkIds];
		const [draggedId] = reorderedIds.splice(draggedIndex, 1);
		reorderedIds.splice(index, 0, draggedId);

		selectedLinkIds = reorderedIds;

		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	let selectedLinks = $derived(
		selectedLinkIds
			.map((id) => allSocialLinks.find((link) => link.id === id))
			.filter((link): link is SocialLink => link !== undefined)
	);

	let unselectedLinks = $derived(
		allSocialLinks
			.filter((link) => !selectedLinkIds.includes(link.id))
			.sort((a, b) => a.displayOrder - b.displayOrder)
	);
</script>

<svelte:head>
	<title>Contact Social Links - Site Settings - dane.gg Admin</title>
</svelte:head>

<div class="contact-social-links-settings">
	<div class="settings-description">
		<p>
			Select which social links should be displayed on the contact page and customize the header
			text for the social links section.
		</p>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<Loader2 size={24} class="spin" />
			<span>Loading social links...</span>
		</div>
	{:else}
		<div class="form-section">
			<div class="form-group">
				{#if isEditingHeader}
					<label for="contact-social-links-header-input">Header</label>
					<div class="header-edit-container">
						<input
							id="contact-social-links-header-input"
							type="text"
							bind:value={tempHeaderText}
							placeholder="e.g., If you want to contact me through social media, please do so via the following channels. I am most active here and will likely respond the quickest:"
							class="header-input"
						/>
						<div class="header-edit-actions">
							<button
								type="button"
								class="icon-button save-icon-button"
								onclick={saveHeader}
								title="Save"
							>
								<Check size={16} />
							</button>
							<button
								type="button"
								class="icon-button cancel-icon-button"
								onclick={cancelEditingHeader}
								title="Cancel"
							>
								<X size={16} />
							</button>
						</div>
					</div>
					<p class="field-hint">
						This text will appear above the social links on the contact page.
					</p>
				{:else}
					<span class="field-label-static">Header</span>
					<div class="header-view-container">
						<div class="header-view-text">
							{#if socialHeader}
								{socialHeader}
							{:else}
								<span class="empty-text">No header text set. Click edit to add one.</span>
							{/if}
						</div>
						<button
							type="button"
							class="icon-button edit-icon-button"
							onclick={startEditingHeader}
							title="Edit header"
						>
							<Edit2 size={16} />
						</button>
					</div>
					<p class="field-hint">
						This text will appear above the social links on the contact page.
					</p>
				{/if}
			</div>
		</div>

		<!-- Selected Links Section -->
		<div class="form-section">
			<div class="form-group">
				<span class="field-label-static">Selected Social Links</span>
				<p class="field-hint">
					These links will be displayed on the contact page. Uncheck to remove them from the
					selection.
				</p>

				{#if selectedLinks.length === 0}
					<div class="empty-state">
						<span class="empty-icon" aria-hidden="true"><Link2 size={48} /></span>
						<p>No links selected. Select links from the available links section below.</p>
					</div>
				{:else}
					<div class="links-list">
						{#each selectedLinks as link, index (link.id)}
							<div
								class="link-item selected"
								class:dragging={draggedIndex === index}
								class:drag-over={dragOverIndex === index}
								role="button"
								tabindex="0"
								draggable={true}
								ondragstart={() => handleDragStart(index)}
								ondragover={(e) => handleDragOver(e, index)}
								ondragleave={handleDragLeave}
								ondrop={(e) => handleDrop(e, index)}
								ondragend={handleDragEnd}
							>
								<div class="drag-handle" title="Drag to reorder">
									<GripVertical size={20} />
								</div>
								<label class="link-checkbox">
									<input
										type="checkbox"
										checked={true}
										onchange={() => toggleLinkSelection(link.id)}
										class="checkbox-input"
									/>
									<div class="link-content">
										<div class="link-icon">
											{#if link.iconType === 'custom-text' && link.iconText}
												<span class="text-icon">{link.iconText}</span>
											{:else if link.iconType === 'svg-url' && link.svgUrl}
												<img src={link.svgUrl} alt={link.name} class="svg-icon" />
											{:else if link.iconType === 'coreui-brand' && link.iconName}
												<Icon
													icon={`cib:${link.iconName.replace('cb-', '')}`}
													width="20"
													height="20"
												/>
											{:else}
												<Link2 size={20} />
											{/if}
										</div>
										<div class="link-info">
											<span class="link-name">{link.name}</span>
											<span class="link-url">{link.url}</span>
										</div>
										{#if !link.isActive}
											<span class="inactive-badge">Inactive</span>
										{/if}
									</div>
								</label>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Available Links Section -->
		<div class="form-section">
			<div class="form-group">
				<span class="field-label-static">Available Social Links</span>
				<p class="field-hint">
					Check the social links you want to add to the contact page. Links are displayed in their
					configured display order.
				</p>

				{#if allSocialLinks.length === 0}
					<div class="empty-state">
						<span class="empty-icon" aria-hidden="true"><Link2 size={48} /></span>
						<p>
							No social links available. Add social links in the <a
								href="/admin/configuration/social-links">Social Links</a
							> settings first.
						</p>
					</div>
				{:else if unselectedLinks.length === 0}
					<div class="empty-state">
						<span class="empty-icon" aria-hidden="true"><Link2 size={48} /></span>
						<p>All available links are already selected.</p>
					</div>
				{:else}
					<div class="links-list">
						{#each unselectedLinks as link (link.id)}
							<div class="link-item">
								<label class="link-checkbox">
									<input
										type="checkbox"
										checked={false}
										onchange={() => toggleLinkSelection(link.id)}
										class="checkbox-input"
									/>
									<div class="link-content">
										<div class="link-icon">
											{#if link.iconType === 'custom-text' && link.iconText}
												<span class="text-icon">{link.iconText}</span>
											{:else if link.iconType === 'svg-url' && link.svgUrl}
												<img src={link.svgUrl} alt={link.name} class="svg-icon" />
											{:else if link.iconType === 'coreui-brand' && link.iconName}
												<Icon
													icon={`cib:${link.iconName.replace('cb-', '')}`}
													width="20"
													height="20"
												/>
											{:else}
												<Link2 size={20} />
											{/if}
										</div>
										<div class="link-info">
											<span class="link-name">{link.name}</span>
											<span class="link-url">{link.url}</span>
										</div>
										{#if !link.isActive}
											<span class="inactive-badge">Inactive</span>
										{/if}
									</div>
								</label>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="form-actions">
			<button type="button" class="save-button" onclick={saveConfig} disabled={isSaving}>
				{#if isSaving}
					<Loader2 size={16} class="spin" />
					Saving...
				{:else}
					Save Configuration
				{/if}
			</button>
		</div>
	{/if}
</div>

<style>
	.contact-social-links-settings {
		width: 100%;
		max-width: 1000px;
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

	.loading-state {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--text-secondary, #a1a1aa);
		padding: 2rem;
	}

	.form-section {
		margin-bottom: 32px;
	}

	.form-section:nth-of-type(2) {
		padding-bottom: 24px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		margin-bottom: 32px;
	}

	.form-group {
		margin-bottom: 24px;
	}

	.form-group > label {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
		margin-bottom: 8px;
	}

	.field-label-static {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
		margin-bottom: 8px;
	}

	.field-hint {
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
		margin-top: 6px;
		margin-bottom: 0;
		line-height: 1.4;
	}

	.header-view-container {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		min-height: 48px;
	}

	.header-view-text {
		flex: 1;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		line-height: 1.5;
		word-wrap: break-word;
	}

	.header-view-text .empty-text {
		color: var(--text-secondary, #a1a1aa);
		font-style: italic;
	}

	.header-edit-container {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.header-input {
		flex: 1;
		min-width: 0;
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

	.header-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.header-edit-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.icon-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-primary, #1a1a1a);
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.icon-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: var(--accent-color, #6366f1);
		color: var(--text-primary, #ffffff);
	}

	.edit-icon-button {
		margin-top: 0;
	}

	.save-icon-button:hover {
		background: rgba(34, 197, 94, 0.1);
		border-color: #22c55e;
		color: #22c55e;
	}

	.cancel-icon-button:hover {
		background: rgba(239, 68, 68, 0.1);
		border-color: #ef4444;
		color: #ef4444;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 64px 24px 48px 24px;
		margin-top: 0.75rem;
		text-align: center;
		border: 2px dashed var(--border-color, #3a3a3a);
		border-radius: 8px;
		background: transparent;
	}

	.empty-icon {
		display: block;
		margin-bottom: 16px;
		opacity: 0.5;
		color: var(--text-secondary, #a1a1aa);
	}

	.empty-icon :global(svg) {
		display: block;
		margin: 0 auto;
	}

	.empty-state p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0;
		font-size: 14px;
	}

	.empty-state a {
		color: var(--accent-color, #6366f1);
		text-decoration: none;
	}

	.empty-state a:hover {
		text-decoration: underline;
	}

	.links-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-top: 0.75rem;
	}

	.link-item {
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-secondary, #2d2d2d);
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: move;
		min-width: 0;
		box-sizing: border-box;
	}

	.link-item:hover {
		background: var(--bg-tertiary, #3a3a3a);
		border-color: var(--accent-color, #6366f1);
	}

	.link-item.selected {
		border-color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.1);
	}

	.link-item.dragging {
		opacity: 0.5;
	}

	.link-item.drag-over {
		border-color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.2);
	}

	.drag-handle {
		color: var(--text-secondary, #a1a1aa);
		cursor: grab;
		display: flex;
		align-items: center;
		flex-shrink: 0;
		padding: 0 4px;
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.link-checkbox {
		display: flex !important;
		flex-direction: row !important;
		flex-wrap: nowrap !important;
		align-items: center !important;
		padding: 16px;
		cursor: pointer;
		margin: 0;
		gap: 12px;
		flex: 1;
		min-width: 0;
		min-height: 56px;
		box-sizing: border-box;
	}

	.link-checkbox .checkbox-input,
	.link-checkbox input[type='checkbox'] {
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: var(--accent-color, #6366f1);
		margin: 0;
		padding: 0;
	}

	.link-content {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
		min-height: 32px;
	}

	.link-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		flex-shrink: 0;
	}

	.text-icon {
		font-size: 16px;
		line-height: 1;
	}

	.svg-icon {
		width: 20px;
		height: 20px;
		object-fit: contain;
	}

	.link-info {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.link-name {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		font-weight: 500;
		line-height: 1.3;
	}

	.link-url {
		color: var(--text-secondary, #a1a1aa);
		font-size: 12px;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		word-break: break-all;
	}

	.inactive-badge {
		padding: 4px 8px;
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
	}

	.form-actions {
		margin-top: 32px;
		padding-top: 20px;
		border-top: 1px solid var(--border-color, #3a3a3a);
	}

	.save-button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: var(--accent-color, #6366f1);
		color: #ffffff;
		border: none;
		padding: 12px 24px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.save-button:hover:not(:disabled) {
		background: var(--accent-color-dark, #4f46e5);
	}

	.save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 560px) {
		.link-item {
			flex-wrap: wrap;
			align-items: flex-start;
		}

		.link-checkbox {
			flex-wrap: wrap !important;
			align-items: flex-start !important;
			padding: 12px;
		}

		.link-checkbox .checkbox-input,
		.link-checkbox input[type='checkbox'] {
			margin-top: 2px;
		}

		.link-url {
			white-space: normal;
			display: -webkit-box;
			-webkit-line-clamp: 3;
			line-clamp: 3;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}

		.save-button {
			width: 100%;
			justify-content: center;
		}
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
