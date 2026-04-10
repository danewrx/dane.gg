<script lang="ts">
	import {
		Upload,
		X,
		Loader2,
		Image as ImageIcon,
		File as FileIcon,
		Link as LinkIcon
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	export interface UploadedFile {
		filename: string;
		originalName: string;
		path: string;
		size: number;
		mimetype: string;
		isExternal?: boolean; // true if from external URL
	}

	interface Props {
		/** Accepted file types (MIME types or extensions, e.g., ['image/jpeg', 'image/png'] or ['image', '.pdf']) */
		acceptedTypes?: string[];
		/** Maximum file size in bytes (default: 10MB) */
		maxSize?: number;
		/** Whether to allow multiple files */
		multiple?: boolean;
		/** Callback when file is uploaded successfully */
		onUpload?: (file: UploadedFile | UploadedFile[]) => void;
		/** Callback when upload fails */
		onError?: (error: string) => void;
		/** Show preview of upload */
		showPreview?: boolean;
		/** Label for the upload button */
		label?: string;
		disabled?: boolean;
		/** Custom upload endpoint (default: /api/upload) */
		endpoint?: string;
		/** Allow external URL input (default: true) */
		allowExternalUrl?: boolean;
	}

	let {
		acceptedTypes = ['image'],
		maxSize = 10 * 1024 * 1024,
		multiple = false,
		onUpload = () => {},
		onError = () => {},
		showPreview = true,
		label = 'Upload File',
		disabled = false,
		endpoint = '/api/upload',
		allowExternalUrl = true
	}: Props = $props();

	let isDragging = $state(false);
	let isUploading = $state(false);
	let uploadedFiles = $state<UploadedFile[]>([]);
	let fileInput: HTMLInputElement | null = $state(null);
	let useExternalUrl = $state(false);
	let externalUrl = $state('');
	let urlInput: HTMLInputElement | null = $state(null);

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!disabled) {
			isDragging = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		if (disabled || isUploading) return;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFiles(Array.from(files));
		}
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			handleFiles(Array.from(target.files));
		}
	}

	async function handleFiles(files: File[]) {
		if (disabled || isUploading) return;

		const filesToUpload = multiple ? files : [files[0]];

		isUploading = true;

		try {
			const uploadPromises = filesToUpload.map((file) => uploadFile(file));
			const results = await Promise.all(uploadPromises);

			const successfulUploads = results.filter((r): r is UploadedFile => r !== null);

			if (successfulUploads.length > 0) {
				if (multiple) {
					uploadedFiles = [...uploadedFiles, ...successfulUploads];
					onUpload([...uploadedFiles]);
				} else {
					uploadedFiles = [successfulUploads[0]];
					onUpload(successfulUploads[0]);
				}

				toast.success('File uploaded successfully', {
					description: `${successfulUploads.length} file(s) uploaded`
				});
			}
		} catch (error: any) {
			const errorMessage = error.message || 'Failed to upload file';
			onError(errorMessage);
			toast.error('Upload failed', {
				description: errorMessage
			});
		} finally {
			isUploading = false;
			// Reset file input
			if (fileInput) {
				fileInput.value = '';
			}
		}
	}

	async function uploadFile(file: File): Promise<UploadedFile | null> {
		if (file.size > maxSize) {
			const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
			throw new Error(`File size exceeds maximum of ${maxSizeMB}MB`);
		}

		const isValidType = acceptedTypes.some((type) => {
			if (type.startsWith('.')) {
				// Extension check
				const ext = '.' + file.name.split('.').pop()?.toLowerCase();
				return ext === type.toLowerCase();
			}
			if (type.includes('/')) {
				// MIME check
				return file.type === type || file.type.startsWith(type.split('/')[0] + '/');
			}
			// Category check
			return file.type.startsWith(type + '/');
		});

		if (!isValidType) {
			throw new Error(`File type not allowed. Accepted types: ${acceptedTypes.join(', ')}`);
		}

		const formData = new FormData();
		formData.append('file', file);

		// Use custom endpoint if custom settings
		const useCustomEndpoint =
			endpoint === '/api/upload' && (acceptedTypes.length > 0 || maxSize !== 10 * 1024 * 1024);

		const uploadUrl = useCustomEndpoint ? '/api/upload/custom' : endpoint;

		let finalUrl = uploadUrl;
		if (useCustomEndpoint) {
			const params = new URLSearchParams();
			if (acceptedTypes.length > 0) {
				params.append('allowedTypes', acceptedTypes.join(','));
			}
			if (maxSize !== 10 * 1024 * 1024) {
				params.append('maxSize', maxSize.toString());
			}
			if (params.toString()) {
				finalUrl += '?' + params.toString();
			}
		}

		const requestOptions: RequestInit = {
			method: 'POST',
			body: formData,
			credentials: 'include'
		};

		const response = await fetch(finalUrl, requestOptions);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
			throw new Error(errorData.error || errorData.message || 'Upload failed');
		}

		const result = await response.json();
		return result.data;
	}

	function removeFile(index: number) {
		uploadedFiles = uploadedFiles.filter((_, i) => i !== index);
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
	}

	function getFileIcon(mimetype: string) {
		if (mimetype.startsWith('image/')) {
			return ImageIcon;
		}
		return FileIcon;
	}

	function validateUrl(url: string): boolean {
		try {
			const urlObj = new URL(url);
			return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
		} catch {
			return false;
		}
	}

	async function handleUrlSubmit() {
		if (!externalUrl.trim()) {
			toast.error('URL required', {
				description: 'Please enter a valid URL'
			});
			return;
		}

		if (!validateUrl(externalUrl.trim())) {
			toast.error('Invalid URL', {
				description: 'Please enter a valid HTTP or HTTPS URL'
			});
			return;
		}

		isUploading = true;

		try {
			const urlFile: UploadedFile = {
				filename: externalUrl.trim(),
				originalName: externalUrl.trim(),
				path: externalUrl.trim(),
				size: 0,
				mimetype: 'application/url',
				isExternal: true
			};

			if (multiple) {
				uploadedFiles = [...uploadedFiles, urlFile];
				onUpload([...uploadedFiles]);
			} else {
				uploadedFiles = [urlFile];
				onUpload(urlFile);
			}

			toast.success('URL added successfully');
			externalUrl = '';
		} catch (error: any) {
			const errorMessage = error.message || 'Failed to add URL';
			onError(errorMessage);
			toast.error('Failed to add URL', {
				description: errorMessage
			});
		} finally {
			isUploading = false;
		}
	}

	function handleUrlKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !disabled && !isUploading) {
			e.preventDefault();
			handleUrlSubmit();
		}
	}
</script>

<div class="file-upload">
	{#if allowExternalUrl}
		<div class="mode-tabs">
			<button
				type="button"
				class="tab-button"
				class:active={!useExternalUrl}
				onclick={() => {
					useExternalUrl = false;
					externalUrl = '';
				}}
			>
				Upload File
			</button>
			<button
				type="button"
				class="tab-button"
				class:active={useExternalUrl}
				onclick={() => {
					useExternalUrl = true;
					externalUrl = '';
				}}
			>
				External URL
			</button>
		</div>
	{/if}

	{#if useExternalUrl}
		{#if !multiple && uploadedFiles.length > 0}
			<!-- Already have a file, show it -->
		{:else}
			<div class="url-input-container">
				<div class="url-input-wrapper">
					<LinkIcon size={20} class="url-icon" />
					<input
						bind:this={urlInput}
						type="url"
						class="url-input"
						placeholder="https://example.com/image.jpg"
						bind:value={externalUrl}
						onkeydown={handleUrlKeydown}
						{disabled}
					/>
					<button
						class="url-submit-button"
						onclick={handleUrlSubmit}
						disabled={disabled || isUploading || !externalUrl.trim()}
						type="button"
					>
						{#if isUploading}
							<Loader2 size={16} class="spinning" />
						{:else}
							Add URL
						{/if}
					</button>
				</div>
			</div>
		{/if}
	{:else if !multiple && uploadedFiles.length > 0}
		<!-- Already have a file, upload area is hidden -->
	{:else}
		<div
			class="upload-area"
			class:dragging={isDragging}
			class:disabled={disabled || isUploading}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			role="button"
			tabindex={disabled || isUploading ? -1 : 0}
			onclick={() => !disabled && !isUploading && fileInput?.click()}
			onkeydown={(e) => {
				if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isUploading) {
					e.preventDefault();
					fileInput?.click();
				}
			}}
		>
			<input
				bind:this={fileInput}
				type="file"
				class="file-input"
				{multiple}
				accept={acceptedTypes
					.map((t) => (t.startsWith('.') ? t : t.includes('/') ? t : `${t}/*`))
					.join(',')}
				onchange={handleFileSelect}
				{disabled}
			/>

			{#if isUploading}
				<div class="upload-content">
					<Loader2 class="upload-icon spinning" size={24} />
					<span>Uploading...</span>
				</div>
			{:else}
				<div class="upload-content">
					<Upload class="upload-icon" size={24} />
					<span>{label}</span>
					{#if acceptedTypes.length > 0}
						<span class="upload-hint">
							Accepted: {acceptedTypes.join(', ')}
						</span>
					{/if}
					<span class="upload-hint">
						Max size: {(maxSize / (1024 * 1024)).toFixed(2)}MB
					</span>
				</div>
			{/if}
		</div>
	{/if}

	{#if showPreview && uploadedFiles.length > 0}
		<div class="uploaded-files">
			{#each uploadedFiles as file, index}
				{@const IconComponent = file.isExternal ? LinkIcon : getFileIcon(file.mimetype)}
				<div class="uploaded-file">
					<div class="file-info">
						<IconComponent size={20} />
						<div class="file-details">
							<span class="file-name" title={file.isExternal ? file.path : file.originalName}>
								{file.isExternal ? file.path : file.originalName}
							</span>
							{#if !file.isExternal}
								<span class="file-size">{formatFileSize(file.size)}</span>
							{:else}
								<span class="file-size">External URL</span>
							{/if}
						</div>
					</div>
					<button
						class="remove-button"
						onclick={() => removeFile(index)}
						type="button"
						aria-label="Remove file"
					>
						<X size={16} />
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.file-upload {
		width: 100%;
	}

	.upload-area {
		border: 2px dashed var(--border-color, #4a4a4a);
		border-radius: 8px;
		padding: 32px;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
		background: var(--bg-secondary, #1a1a1a);
	}

	.upload-area:hover:not(.disabled) {
		border-color: var(--accent-color, #6366f1);
		background: var(--bg-tertiary, #2a2a2a);
	}

	.upload-area.dragging {
		border-color: var(--accent-color, #6366f1);
		background: var(--bg-tertiary, #2a2a2a);
	}

	.upload-area.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.file-input {
		display: none;
	}

	.upload-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.upload-content :global(.upload-icon) {
		color: var(--text-secondary, #9ca3af);
	}

	.upload-content :global(.upload-icon.spinning) {
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

	.upload-content span {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.upload-hint {
		color: var(--text-muted, #6b7280);
		font-size: 12px;
	}

	.mode-tabs {
		display: flex;
		gap: 0;
		margin-bottom: 16px;
		border: 1px solid var(--border-color, #4a4a4a);
		border-radius: 6px;
		overflow: hidden;
		background: var(--bg-secondary, #1a1a1a);
	}

	.tab-button {
		flex: 1;
		padding: 10px 16px;
		background: transparent;
		border: none;
		color: var(--text-secondary, #9ca3af);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}

	.tab-button:hover {
		background: var(--bg-tertiary, #2a2a2a);
		color: var(--text-primary, #ffffff);
	}

	.tab-button.active {
		background: var(--accent-color, #6366f1);
		color: var(--text-primary, #ffffff);
	}

	.url-input-container {
		margin-bottom: 16px;
	}

	.url-input-wrapper {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: var(--bg-secondary, #1a1a1a);
		border: 2px solid var(--border-color, #4a4a4a);
		border-radius: 8px;
		transition: border-color 0.2s ease;
	}

	.url-input-wrapper:focus-within {
		border-color: var(--accent-color, #6366f1);
	}

	.url-input-wrapper :global(.url-icon) {
		color: var(--text-secondary, #9ca3af);
		flex-shrink: 0;
	}

	.url-input {
		flex: 1;
		background: none;
		border: none;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		outline: none;
		padding: 0;
	}

	.url-input::placeholder {
		color: var(--text-muted, #6b7280);
	}

	.url-submit-button {
		background: var(--accent-color, #6366f1);
		border: none;
		color: var(--text-primary, #ffffff);
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.url-submit-button:hover:not(:disabled) {
		background: var(--accent-color-hover, #818cf8);
	}

	.url-submit-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.url-submit-button :global(.spinning) {
		animation: spin 1s linear infinite;
	}

	.uploaded-files {
		margin-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.uploaded-file {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px;
		background: var(--bg-secondary, #1a1a1a);
		border: 1px solid var(--border-color, #4a4a4a);
		border-radius: 6px;
	}

	.file-info {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
	}

	.file-info :global(svg) {
		color: var(--text-secondary, #9ca3af);
		flex-shrink: 0;
	}

	.file-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.file-name {
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-size {
		color: var(--text-muted, #6b7280);
		font-size: 12px;
	}

	.remove-button {
		background: none;
		border: none;
		color: var(--text-muted, #6b7280);
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.remove-button:hover {
		background: var(--bg-tertiary, #2a2a2a);
		color: var(--text-primary, #ffffff);
	}
</style>
