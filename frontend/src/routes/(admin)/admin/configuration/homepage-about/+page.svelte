<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Loader2 } from 'lucide-svelte';
	import MarkdownEditor from '$lib/admin/components/MarkdownEditor.svelte';

	const defaultAboutMe = `Hi, I'm Dane! I'm a software engineer & freelance designer. You can read my full, more professional bio [here](/about)!

**Some quick facts about me:**

- I'm from Manchester in the UK.
- I currently work full-time as a software engineer @ a UK-based Azure Expert MSP
- My main languages are <span style="color: #9179E4;">C#</span>, <span style="color: #F1E05A;">JavaScript</span> & <span style="color: #3178C6;">TypeScript</span>.
- I first started coding at age 13, learning <span style="color: #9179E4;">Visual Basic (VB .NET)</span>.
- In my free time, I design for and run a small clothing brand called Partial Spaces.
- I'm a big fan of the old early 2000s internet and technology.
- I like cats!
- I don't like coffee.`;

	let aboutMe = $state('');
	let isLoading = $state(true);
	let isSaving = $state(false);

	onMount(async () => {
		await loadAboutMe();
	});

	async function loadAboutMe() {
		try {
			isLoading = true;
			const response = await fetch('/api/config/homepage_about_me', {
				credentials: 'include'
			});

			if (response.ok) {
				const result = await response.json();
				aboutMe = result.data?.value || '';
			}
		} catch (error) {
			console.error('Error loading about me:', error);
			toast.error('Failed to load about me content');
		} finally {
			isLoading = false;
		}
	}

	async function saveAboutMe() {
		try {
			isSaving = true;

			const response = await fetch('/api/config/homepage_about_me', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					value: aboutMe,
					dataType: 'string'
				})
			});

			if (!response.ok) {
				throw new Error('Failed to save about me content');
			}

			toast.success('About me content saved successfully');
		} catch (error) {
			console.error('Error saving about me:', error);
			toast.error('Failed to save about me content');
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="homepage-about-settings">
	<div class="settings-description">
		<p>
			Edit the "About Me" content that appears on the homepage. You can use markdown formatting and
			inline HTML for styling (like colored text).
		</p>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<Loader2 size={24} class="spin" />
			<span>Loading about me content...</span>
		</div>
	{:else}
		<div class="form-group">
			<label for="about-me">About Me Content</label>
			<div class="editor-container">
				<MarkdownEditor bind:value={aboutMe} placeholder={defaultAboutMe} minHeight="400px" />
			</div>
		</div>

		<div class="form-actions">
			<button type="button" class="save-button" onclick={saveAboutMe} disabled={isSaving}>
				{#if isSaving}
					<Loader2 size={16} class="spin" />
					Saving...
				{:else}
					Save About Me
				{/if}
			</button>
		</div>
	{/if}
</div>

<style>
	.homepage-about-settings {
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
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
