<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Loader2 } from 'lucide-svelte';
	import MarkdownEditor from '$lib/admin/components/MarkdownEditor.svelte';

	let tagline = $state('');
	let isLoading = $state(true);
	let isSaving = $state(false);

	onMount(async () => {
		await loadTagline();
	});

	async function loadTagline() {
		try {
			isLoading = true;
			const response = await fetch('/api/contact/settings/tagline', {
				credentials: 'include'
			});
			
			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data?.value) {
					tagline = result.data.value;
				} else {
					tagline = '';
				}
			}
		} catch (error) {
			console.error('Error loading contact tagline:', error);
			toast.error('Failed to load contact tagline');
		} finally {
			isLoading = false;
		}
	}

	async function saveTagline() {
		try {
			isSaving = true;
			
			const response = await fetch('/api/contact/settings/tagline', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					value: tagline
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				toast.success('Contact tagline saved successfully');
			} else {
				throw new Error(result.error || 'Failed to save contact tagline');
			}
		} catch (error) {
			console.error('Error saving contact tagline:', error);
			toast.error('Failed to save contact tagline');
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="contact-tagline-settings">
	<div class="settings-description">
		<p>Edit the tagline/introductory message that appears at the top of the contact page. You can use markdown formatting and inline HTML for styling.</p>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<Loader2 size={24} class="spin" />
			<span>Loading contact tagline...</span>
		</div>
	{:else}
		<div class="form-group">
			<label for="tagline">Contact Tagline</label>
			<div class="editor-container">
				<MarkdownEditor
					bind:value={tagline}
					placeholder="Enter your contact page tagline here..."
					minHeight="300px"
				/>
			</div>
		</div>

		<div class="form-actions">
			<button 
				type="button"
				class="save-button" 
				onclick={saveTagline}
				disabled={isSaving}
			>
				{#if isSaving}
					<Loader2 size={16} class="spin" />
					Saving...
				{:else}
					Save Tagline
				{/if}
			</button>
		</div>
	{/if}
</div>

<style>
	.contact-tagline-settings {
		width: 100%;
		max-width: 1000px;
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

	.form-group {
		margin-bottom: 24px;
	}

	.form-group label {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-primary, #ffffff);
		margin-bottom: 8px;
	}

	.editor-container {
		width: 100%;
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

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
