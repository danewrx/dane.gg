<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Loader2 } from 'lucide-svelte';
	import MarkdownEditor from '$lib/admin/components/MarkdownEditor.svelte';

	const defaultBiography = `I'm a software engineer based in Manchester, currently working for a UK-based Managed Service Provider (MSP), where I've been involved in delivering complex development and infrastructure solutions for various large organizations. My main focus is backend development, but I'm also skilled in frontend technologies, making me a versatile developer across the stack. While C# is my primary language, I'm also proficient in JavaScript, TypeScript, and Python, which allows me to tackle a wide range of projects.

Professionally, I specialize in building scalable, reliable systems. I have strong expertise in DevOps practices and infrastructure tools like Docker, Kubernetes, and Terraform, which I use to create efficient, automated workflows. I also have extensive experience with cloud platforms such as Azure, AWS, and Cloudflare, as well as server management in both Linux and Windows Server environments. From designing deployment pipelines to implementing CI/CD workflows, I'm passionate about driving end-to-end system automation to enhance operational efficiency and consistency.

In addition to my development work, I have a solid background in Tier 3 support desk engineering, where I've troubleshooted and resolved complex issues for users and systems. I also have hands-on experience with Microsoft Intune, managing mobile devices and configuring modern workplace solutions. This blend of support and development experience gives me a unique ability to understand both the technical and user-facing aspects of systems, ensuring a well-rounded approach to problem-solving.

Beyond the technical side of things, I also enjoy expressing my creativity through graphic design and 3D modeling. I'm an avid fan of anime, gaming, DJing, and VR—activities that help me unwind and stay inspired.

This is my personal website where I showcase some of the side projects I'm working on, as well as write about my life, technology, development, and anything else that sparks my interest!`;

	let biography = $state('');
	let isLoading = $state(true);
	let isSaving = $state(false);

	onMount(async () => {
		await loadBiography();
	});

	async function loadBiography() {
		try {
			isLoading = true;
			const response = await fetch('/api/config/about_biography', {
				credentials: 'include'
			});

			if (response.ok) {
				const result = await response.json();
				biography = result.data?.value || '';
			}
		} catch (error) {
			logger.error('Error loading biography:', error);
			toast.error('Failed to load biography');
		} finally {
			isLoading = false;
		}
	}

	async function saveBiography() {
		try {
			isSaving = true;

			const response = await fetch('/api/config/about_biography', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({
					value: biography,
					dataType: 'string'
				})
			});

			if (!response.ok) {
				throw new Error('Failed to save biography');
			}

			toast.success('Biography saved successfully');
		} catch (error) {
			logger.error('Error saving biography:', error);
		}
	}
</script>

<svelte:head>
	<title>{adminPageTitle('Biography')}</title>
</svelte:head>

<div class="biography-settings">
	<div class="settings-description">
		<p>
			Edit the biography content that appears on the About page. Use the toolbar to format your text
			with headings, bold, italic, lists, and more.
		</p>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<Loader2 size={24} class="spin" />
			<span>Loading biography...</span>
		</div>
	{:else}
		<div class="form-group">
			<label for="biography">Biography Content</label>
			<div class="editor-container">
				<MarkdownEditor bind:value={biography} placeholder={defaultBiography} minHeight="500px" />
			</div>
		</div>

		<div class="form-actions">
			<button type="button" class="save-button" onclick={saveBiography} disabled={isSaving}>
				{#if isSaving}
					<Loader2 size={16} class="spin" />
					Saving...
				{:else}
					Save Biography
				{/if}
			</button>
		</div>
	{/if}
</div>

<style>
	.biography-settings {
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
