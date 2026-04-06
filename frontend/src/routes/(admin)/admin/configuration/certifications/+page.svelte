<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Loader2, Plus, Trash2, Edit2, Save, X, Image as ImageIcon, GripVertical } from 'lucide-svelte';
	import FileUpload, { type UploadedFile } from '$lib/admin/components/ui/FileUpload.svelte';
	import ConfirmDialog from '$lib/admin/components/ui/ConfirmDialog.svelte';

	interface Certification {
		id: string;
		title: string;
		earned: string | null;
		endDate: string | null;
		isPresent: boolean;
		status: string;
		imageUrl: string | null;
		isExternal: boolean;
		displayOrder: number;
		createdAt: string;
		updatedAt: string;
	}

	let certifications = $state<Certification[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	
	// New certification form
	let showNewCertForm = $state(false);
	let newCertTitle = $state('');
	let newCertEarned = $state('');
	let newCertEndDate = $state('');
	let newCertIsPresent = $state(false);
	let newCertStatus = $state('Active');
	let newCertStatusManual = $state(false); // Track if status was manually set
	let newCertImageUrl = $state('');
	let newCertImageIsExternal = $state(false);
	let newCertImageFilename = $state<string | null>(null);
	
	// Editing
	let editingCertId = $state<string | null>(null);
	let editingCertTitle = $state('');
	let editingCertEarned = $state('');
	let editingCertEndDate = $state('');
	let editingCertIsPresent = $state(false);
	let editingCertStatus = $state('Active');
	let editingCertStatusManual = $state(false); // Track if status was manually set
	let editingCertImageUrl = $state('');
	let editingCertImageIsExternal = $state(false);
	let editingCertImageFilename = $state<string | null>(null);

	let showDeleteCertDialog = $state(false);
	let pendingDeleteCertId = $state<string | null>(null);

	onMount(async () => {
		await loadCertifications();
	});

	async function loadCertifications() {
		try {
			isLoading = true;
			const response = await fetch('/api/certifications/all', {
				credentials: 'include'
			});
			
			if (response.ok) {
				const result = await response.json();
				certifications = result.data || [];
			}
		} catch (error) {
			console.error('Error loading certifications:', error);
			toast.error('Failed to load certifications');
		} finally {
			isLoading = false;
		}
	}

	function handleNewImageUpload(file: UploadedFile | UploadedFile[]) {
		const uploadedFile = Array.isArray(file) ? file[0] : file;
		if (uploadedFile) {
			newCertImageUrl = uploadedFile.path;
			newCertImageIsExternal = uploadedFile.isExternal || false;
			if (!newCertImageIsExternal && uploadedFile.path.startsWith('/uploads/')) {
				newCertImageFilename = uploadedFile.path.replace('/uploads/', '');
			} else {
				newCertImageFilename = null;
			}
		}
	}

	async function handleRemoveNewImage() {
		if (!newCertImageIsExternal && newCertImageFilename) {
			try {
				const response = await fetch(`/api/upload/${newCertImageFilename}`, {
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

		newCertImageUrl = '';
		newCertImageIsExternal = false;
		newCertImageFilename = null;
	}

	function handleEditImageUpload(file: UploadedFile | UploadedFile[]) {
		const uploadedFile = Array.isArray(file) ? file[0] : file;
		if (uploadedFile) {
			editingCertImageUrl = uploadedFile.path;
			editingCertImageIsExternal = uploadedFile.isExternal || false;
			if (!editingCertImageIsExternal && uploadedFile.path.startsWith('/uploads/')) {
				editingCertImageFilename = uploadedFile.path.replace('/uploads/', '');
			} else {
				editingCertImageFilename = null;
			}
		}
	}

	async function handleRemoveEditImage() {
		if (!editingCertImageIsExternal && editingCertImageFilename) {
			try {
				const response = await fetch(`/api/upload/${editingCertImageFilename}`, {
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

		editingCertImageUrl = '';
		editingCertImageIsExternal = false;
		editingCertImageFilename = null;
	}

	function getImageUrl(path: string | null, isExternal: boolean): string {
		if (!path) return '';
		// If it's an external URL, just return it
		if (isExternal || path.startsWith('http://') || path.startsWith('https://')) {
			return path;
		}
		// If starts with /uploads/, serve through the API
		if (path.startsWith('/uploads/')) {
			const filename = path.replace('/uploads/', '');
			return `/api/upload/file/${filename}`;
		}
		return path;
	}

	// Auto-update status based on isPresent and endDate
	function updateNewCertStatus() {
		if (newCertStatusManual) return; // Don't auto-update if manually set
		
		if (newCertIsPresent) {
			newCertStatus = 'Active';
		} else if (newCertEndDate.trim()) {
			newCertStatus = 'Expired';
		} else {
			newCertStatus = 'Active';
		}
	}

	function updateEditingCertStatus() {
		if (editingCertStatusManual) return; // Don't auto-update if manually set
		
		if (editingCertIsPresent) {
			editingCertStatus = 'Active';
		} else if (editingCertEndDate.trim()) {
			editingCertStatus = 'Expired';
		} else {
			editingCertStatus = 'Active';
		}
	}

	function handleNewIsPresentChange() {
		if (newCertIsPresent) {
			newCertEndDate = ''; // Clear end date if present is checked
		}
		updateNewCertStatus();
	}

	function handleEditingIsPresentChange() {
		if (editingCertIsPresent) {
			editingCertEndDate = ''; // Clear end date if present is checked
		}
		updateEditingCertStatus();
	}

	function handleNewEndDateChange() {
		if (newCertEndDate.trim()) {
			newCertIsPresent = false; // Uncheck present if end date is set
		} else {
			newCertIsPresent = true; // Default to present if no end date
		}
		updateNewCertStatus();
	}

	function handleEditingEndDateChange() {
		if (editingCertEndDate.trim()) {
			editingCertIsPresent = false; // Uncheck present if end date is set
		} else {
			editingCertIsPresent = true; // Default to present if no end date
		}
		updateEditingCertStatus();
	}

	async function createCertification() {
		if (!newCertTitle.trim()) {
			toast.error('Certification title is required');
			return;
		}

		if (!newCertEarned.trim()) {
			toast.error('Start date (earned) is required');
			return;
		}

		if (!newCertImageUrl) {
			toast.error('Image is required');
			return;
		}

		// Default to present if no end date is set
		const finalIsPresent = newCertEndDate.trim() ? newCertIsPresent : true;

		try {
			isSaving = true;
			const response = await fetch('/api/certifications', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					title: newCertTitle.trim(),
					earned: newCertEarned.trim() || null,
					endDate: newCertEndDate.trim() || null,
					isPresent: finalIsPresent,
					status: newCertStatus,
					imageUrl: newCertImageUrl || null,
					isExternal: newCertImageIsExternal
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create certification');
			}

			toast.success('Certification created');
			newCertTitle = '';
			newCertEarned = '';
			newCertEndDate = '';
			newCertIsPresent = false;
			newCertStatus = 'Active';
			newCertStatusManual = false;
			newCertImageUrl = '';
			newCertImageIsExternal = false;
			newCertImageFilename = null;
			showNewCertForm = false;
			await loadCertifications();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			isSaving = false;
		}
	}

	async function updateCertification(certId: string) {
		if (!editingCertTitle.trim()) {
			toast.error('Certification title is required');
			return;
		}

		if (!editingCertEarned.trim()) {
			toast.error('Start date (earned) is required');
			return;
		}

		if (!editingCertImageUrl) {
			toast.error('Image is required');
			return;
		}

		// Default to present if no end date is set
		const finalIsPresent = editingCertEndDate.trim() ? editingCertIsPresent : true;

		try {
			isSaving = true;
			const response = await fetch(`/api/certifications/${certId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					title: editingCertTitle.trim(),
					earned: editingCertEarned.trim() || null,
					endDate: editingCertEndDate.trim() || null,
					isPresent: finalIsPresent,
					status: editingCertStatus,
					imageUrl: editingCertImageUrl || null,
					isExternal: editingCertImageIsExternal,
					autoSetStatus: !editingCertStatusManual // Auto-set status if not manually set
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update certification');
			}

			toast.success('Certification updated');
			editingCertId = null;
			await loadCertifications();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			isSaving = false;
		}
	}

	function requestDeleteCertification(certId: string) {
		pendingDeleteCertId = certId;
		showDeleteCertDialog = true;
	}

	function cancelDeleteCertification() {
		showDeleteCertDialog = false;
		pendingDeleteCertId = null;
	}

	async function confirmDeleteCertification() {
		if (!pendingDeleteCertId) return;
		const certId = pendingDeleteCertId;

		const cert = certifications.find(c => c.id === certId);
		if (cert && !cert.isExternal && cert.imageUrl && cert.imageUrl.startsWith('/uploads/')) {
			const filename = cert.imageUrl.replace('/uploads/', '');
			try {
				await fetch(`/api/upload/${filename}`, {
					method: 'DELETE',
					credentials: 'include'
				});
			} catch (error) {
				console.error('Error deleting uploaded file:', error);
			}
		}

		try {
			const response = await fetch(`/api/certifications/${certId}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to delete certification');
			}

			toast.success('Certification deleted');
			await loadCertifications();
		} catch (error) {
			toast.error('Failed to delete certification');
		} finally {
			cancelDeleteCertification();
		}
	}

	function startEditingCert(cert: Certification) {
		editingCertId = cert.id;
		editingCertTitle = cert.title;
		editingCertEarned = cert.earned || '';
		editingCertEndDate = cert.endDate || '';
		// Default to present if no end date is set
		editingCertIsPresent = cert.endDate ? (cert.isPresent || false) : true;
		editingCertStatus = cert.status;
		editingCertStatusManual = false; // Start fresh - will be set to true if user manually changes status
		editingCertImageUrl = cert.imageUrl || '';
		editingCertImageIsExternal = cert.isExternal;
		if (!cert.isExternal && cert.imageUrl && cert.imageUrl.startsWith('/uploads/')) {
			editingCertImageFilename = cert.imageUrl.replace('/uploads/', '');
		} else {
			editingCertImageFilename = null;
		}
	}

	function cancelEditingCert() {
		editingCertId = null;
		editingCertTitle = '';
		editingCertEarned = '';
		editingCertEndDate = '';
		editingCertIsPresent = false;
		editingCertStatus = 'Active';
		editingCertStatusManual = false;
		editingCertImageUrl = '';
		editingCertImageIsExternal = false;
		editingCertImageFilename = null;
	}

	function cancelNewCert() {
		showNewCertForm = false;
		newCertTitle = '';
		newCertEarned = '';
		newCertEndDate = '';
		newCertIsPresent = false;
		newCertStatus = 'Active';
		newCertStatusManual = false;
		newCertImageUrl = '';
		newCertImageIsExternal = false;
		newCertImageFilename = null;
	}

	// Drag and drop handlers
	function handleDragStart(event: DragEvent, index: number) {
		if (editingCertId !== null || showNewCertForm) return;
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/html', '');
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
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

		const newCerts = [...certifications];
		const [draggedItem] = newCerts.splice(draggedIndex, 1);
		newCerts.splice(dropIndex, 0, draggedItem);

		// Update displayOrder for all certifications
		const certOrders = newCerts.map((cert, index) => ({
			id: cert.id,
			displayOrder: index
		}));

		try {
			isSaving = true;
			const response = await fetch('/api/certifications/order', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					certifications: certOrders
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update order');
			}

			toast.success('Certification order updated');
			await loadCertifications();
		} catch (err: any) {
			console.error('Error updating certification order:', err);
			toast.error('Failed to update certification order', {
				description: err.message || 'Please try again'
			});
			// Reload to reset order
			await loadCertifications();
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
	bind:open={showDeleteCertDialog}
	title="Delete certification"
	message="Remove this certification from the About page?"
	detail="This cannot be undone."
	variant="danger"
	confirmLabel="Delete certification"
	cancelLabel="Cancel"
	onConfirm={confirmDeleteCertification}
	onCancel={cancelDeleteCertification}
/>

<div class="certifications-settings">
	<div class="settings-description">
		<p>Manage certifications that appear on your About page. You can upload an image or use an external URL for each certification badge.</p>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<Loader2 size={24} class="spin" />
			<span>Loading certifications...</span>
		</div>
	{:else}
		<div class="certifications-list">
			{#each certifications as cert, index (cert.id)}
				<div 
					class="certification-card"
					class:dragging={draggedIndex === index}
					class:drag-over={dragOverIndex === index}
					class:not-draggable={editingCertId !== null || showNewCertForm}
					draggable={editingCertId === null && !showNewCertForm}
					ondragstart={(e) => handleDragStart(e, index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, index)}
					ondragend={handleDragEnd}
				>
					{#if editingCertId === cert.id}
						<div class="editing-certification">
							<div class="form-group">
								<label>Title *</label>
								<input
									type="text"
									class="edit-input"
									bind:value={editingCertTitle}
									placeholder="Certification title"
									required
								/>
							</div>
							<div class="form-row">
								<div class="form-group">
									<label>Start Date (Year) *</label>
									<input
										type="text"
										class="edit-input"
										bind:value={editingCertEarned}
										placeholder="2021"
										required
									/>
								</div>
								<div class="form-group">
									<label>End Date (Year)</label>
									<input
										type="text"
										class="edit-input"
										bind:value={editingCertEndDate}
										placeholder="2024"
										disabled={editingCertIsPresent}
										oninput={handleEditingEndDateChange}
									/>
								</div>
							</div>
							<div class="form-group">
								<label class="checkbox-label">
									<input
										type="checkbox"
										bind:checked={editingCertIsPresent}
										onchange={handleEditingIsPresentChange}
									/>
									<span>Present (certification is still active)</span>
								</label>
							</div>
							<div class="form-group">
								<label>
									Status
									{#if !editingCertStatusManual}
										<span class="auto-status-badge">(Auto-set)</span>
									{/if}
								</label>
								<select 
									class="edit-input" 
									bind:value={editingCertStatus}
									onchange={() => editingCertStatusManual = true}
								>
									<option value="Active">Active</option>
									<option value="Inactive">Inactive</option>
									<option value="Expired">Expired</option>
								</select>
							</div>
							<div class="form-group">
								<label>Image *</label>
								{#if editingCertImageUrl}
									<div class="image-preview">
										<img src={getImageUrl(editingCertImageUrl, editingCertImageIsExternal)} alt="Preview" />
										<button 
											class="remove-image-btn" 
											onclick={handleRemoveEditImage}
											title="Remove image (image is required, upload a new one to replace)"
										>
											<X size={16} />
										</button>
									</div>
									<p class="image-required-hint">Image is required. Upload a new image to replace the current one.</p>
								{:else}
									<FileUpload
										acceptedTypes={['image']}
										onUpload={handleEditImageUpload}
										showPreview={false}
										label="Upload Image"
									/>
								{/if}
							</div>
							<div class="form-actions">
								<button class="icon-btn save" onclick={() => updateCertification(cert.id)} disabled={isSaving}>
									<Save size={16} />
									Save
								</button>
								<button class="icon-btn cancel" onclick={cancelEditingCert}>
									<X size={16} />
									Cancel
								</button>
							</div>
						</div>
					{:else}
						{#if editingCertId === null && !showNewCertForm}
							<div class="drag-handle" title="Drag to reorder">
								<GripVertical size={18} />
							</div>
						{/if}
						<div class="certification-info">
							{#if cert.imageUrl}
								<div class="cert-image">
									<img src={getImageUrl(cert.imageUrl, cert.isExternal)} alt={cert.title} />
								</div>
							{:else}
								<div class="cert-image placeholder">
									<ImageIcon size={24} />
								</div>
							{/if}
							<div class="cert-details">
								<h4 class="cert-title">{cert.title}</h4>
								<div class="cert-meta">
									{#if cert.earned}
										<span>Earned {cert.earned}</span>
									{/if}
									<span class="cert-status" class:active={cert.status === 'Active'}>
										{cert.status}
									</span>
								</div>
							</div>
						</div>
						<div class="certification-actions">
							<button class="icon-btn edit" onclick={() => startEditingCert(cert)}>
								<Edit2 size={16} />
							</button>
							<button class="icon-btn delete" onclick={() => requestDeleteCertification(cert.id)}>
								<Trash2 size={16} />
							</button>
						</div>
					{/if}
				</div>
			{/each}

			{#if showNewCertForm}
				<div class="new-certification-form">
					<h3>New Certification</h3>
					<div class="form-group">
						<label>Title *</label>
						<input
							type="text"
							class="edit-input"
							bind:value={newCertTitle}
							placeholder="Certification title"
						/>
					</div>
					<div class="form-row">
						<div class="form-group">
							<label>Start Date (Year) *</label>
							<input
								type="text"
								class="edit-input"
								bind:value={newCertEarned}
								placeholder="2021"
								required
							/>
						</div>
						<div class="form-group">
							<label>End Date (Year)</label>
							<input
								type="text"
								class="edit-input"
								bind:value={newCertEndDate}
								placeholder="2024"
								disabled={newCertIsPresent}
								oninput={handleNewEndDateChange}
							/>
						</div>
					</div>
					<div class="form-group">
						<label class="checkbox-label">
							<input
								type="checkbox"
								bind:checked={newCertIsPresent}
								onchange={handleNewIsPresentChange}
							/>
							<span>Present (certification is still active)</span>
						</label>
					</div>
					<div class="form-group">
						<label>
							Status
							{#if !newCertStatusManual}
								<span class="auto-status-badge">(Auto-set)</span>
							{/if}
						</label>
						<select 
							class="edit-input" 
							bind:value={newCertStatus}
							onchange={() => newCertStatusManual = true}
						>
							<option value="Active">Active</option>
							<option value="Inactive">Inactive</option>
							<option value="Expired">Expired</option>
						</select>
					</div>
					<div class="form-group">
						<label>Image *</label>
						{#if newCertImageUrl}
							<div class="image-preview">
								<img src={getImageUrl(newCertImageUrl, newCertImageIsExternal)} alt="Preview" />
								<button 
									class="remove-image-btn" 
									onclick={handleRemoveNewImage}
									title="Remove image (image is required, upload a new one to replace)"
								>
									<X size={16} />
								</button>
							</div>
							<p class="image-required-hint">Image is required. Upload a new image to replace the current one.</p>
						{:else}
							<FileUpload
								acceptedTypes={['image']}
								onUpload={handleNewImageUpload}
								showPreview={false}
								label="Upload Image"
							/>
						{/if}
					</div>
					<div class="form-actions">
						<button class="save-btn" onclick={createCertification} disabled={isSaving}>
							{#if isSaving}
								<Loader2 size={16} class="spin" />
							{/if}
							Create Certification
						</button>
						<button class="cancel-btn" onclick={cancelNewCert}>
							Cancel
						</button>
					</div>
				</div>
			{:else}
				<button class="add-certification-btn" onclick={() => showNewCertForm = true}>
					<Plus size={18} />
					Add Certification
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.certifications-settings {
		width: 100%;
		max-width: 800px;
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

	.certifications-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.certification-card {
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 20px;
		display: flex;
		align-items: center;
		gap: 20px;
		cursor: move;
		transition: all 0.2s ease;
		position: relative;
	}

	.certification-card.dragging {
		opacity: 0.5;
		cursor: grabbing;
	}

	.certification-card.drag-over {
		border-color: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}

	.certification-card:not(.dragging):not(.not-draggable):hover {
		background: var(--bg-tertiary, #1f1f1f);
	}

	.certification-card.not-draggable {
		cursor: default;
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

	.certification-card.dragging .drag-handle {
		cursor: grabbing;
	}

	.certification-info {
		display: flex;
		align-items: center;
		gap: 16px;
		flex: 1;
	}

	.cert-image {
		width: 80px;
		height: 80px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		overflow: hidden;
		background: var(--bg-tertiary, #1f1f1f);
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.cert-image img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.cert-image.placeholder {
		color: var(--text-secondary, #a1a1aa);
	}

	.cert-details {
		flex: 1;
	}

	.cert-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		margin: 0 0 8px 0;
	}

	.cert-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
	}

	.cert-status {
		padding: 2px 8px;
		border-radius: 4px;
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
		font-size: 12px;
	}

	.cert-status.active {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.certification-actions {
		display: flex;
		gap: 8px;
	}

	.editing-certification {
		width: 100%;
		max-width: 100%;
		display: flex;
		flex-direction: column;
		gap: 24px;
		box-sizing: border-box;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		min-width: 0; /* Prevent overflow */
	}

	.form-group label {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
		margin-bottom: 2px;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		width: 100%;
		min-width: 0; /* Prevent grid overflow */
	}

	.form-row .form-group {
		min-width: 0; /* Prevent grid item overflow */
	}

	.edit-input {
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		padding: 10px 14px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		width: 100%;
		box-sizing: border-box; /* Include padding and border in width */
		min-width: 0; /* Prevent overflow */
	}

	.edit-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.edit-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		flex-direction: row !important;
	}

	.checkbox-label input[type="checkbox"] {
		width: auto;
		cursor: pointer;
	}

	.auto-status-badge {
		font-size: 11px;
		color: var(--text-secondary, #a1a1aa);
		font-weight: normal;
		font-style: italic;
		margin-left: 4px;
	}

	.image-preview {
		position: relative;
		width: 120px;
		height: 120px;
		border-radius: 8px;
		overflow: hidden;
		background: var(--bg-tertiary, #1f1f1f);
		border: 1px solid var(--border-color, #3a3a3a);
	}

	.image-preview img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.remove-image-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		background: rgba(239, 68, 68, 0.9);
		color: white;
		border: none;
		border-radius: 4px;
		padding: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.remove-image-btn:hover {
		background: rgba(239, 68, 68, 1);
	}

	.image-required-hint {
		margin: 8px 0 0 0;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
		font-style: italic;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 12px;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		background: transparent;
		font-size: 14px;
	}

	.icon-btn.edit {
		color: var(--text-secondary, #a1a1aa);
	}

	.icon-btn.edit:hover {
		background: rgba(99, 102, 241, 0.2);
		color: var(--accent-color, #6366f1);
	}

	.icon-btn.delete {
		color: var(--text-secondary, #a1a1aa);
	}

	.icon-btn.delete:hover {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.icon-btn.save {
		color: #22c55e;
	}

	.icon-btn.save:hover {
		background: rgba(34, 197, 94, 0.2);
	}

	.icon-btn.cancel {
		color: var(--text-secondary, #a1a1aa);
	}

	.icon-btn.cancel:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 8px;
	}

	@media (max-width: 520px) {
		.form-actions {
			flex-direction: column-reverse;
			align-items: stretch;
		}

		.form-actions .save-btn,
		.form-actions .cancel-btn,
		.form-actions .icon-btn {
			width: 100%;
			justify-content: center;
			box-sizing: border-box;
		}
	}

	.new-certification-form {
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 24px;
		width: 100%;
		max-width: 100%;
		min-width: 0;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 24px;
		overflow-x: hidden;
	}

	.new-certification-form h3 {
		margin: 0;
		color: var(--text-primary, #ffffff);
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 4px;
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

	.add-certification-btn {
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

	.add-certification-btn:hover {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.05);
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
