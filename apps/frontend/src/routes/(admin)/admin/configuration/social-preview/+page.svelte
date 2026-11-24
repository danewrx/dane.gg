<script lang="ts">
	import { logger } from '$lib/logger';
	import { adminPageTitle } from '$lib/site/pageTitle';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Loader2, X, Type, Image as ImageIcon, Layers, Palette } from 'lucide-svelte';
	import FontPicker from '$lib/admin/components/ui/FontPicker.svelte';
	import { STATIC_ROUTE_PATHS } from '$lib/site/routes';
	import Tabs from '$lib/admin/components/ui/Tabs.svelte';
	import FileUpload, { type UploadedFile } from '$lib/admin/components/ui/FileUpload.svelte';

	const KEYS = { background: 'og_background_image', logo: 'og_logo_image' } as const;
	type Field = keyof typeof KEYS;
	const DEFAULT_IMAGES: Record<Field, string> = {
		background: '/api/blog/og-default/background',
		logo: '/api/blog/og-default/logo'
	};

	const TEXT_FIELDS = [
		{ key: 'og_default_title', label: 'Heading', fallback: 'Dane Buchanan' },
		{
			key: 'og_default_subtitle',
			label: 'Subheading',
			fallback: 'software engineer & freelance designer'
		},
		{ key: 'og_default_pill', label: 'Website text (white pill)', fallback: 'dane.gg' }
	] as const;

	const IMAGE_FIELDS = [
		{
			field: 'background',
			title: 'Background',
			hint: 'Shown behind a dark fade on the left. 1200×630 works best.',
			icon: ImageIcon
		},
		{
			field: 'logo',
			title: 'Logo',
			hint: 'Drawn on the right, up to 420px square. A transparent PNG works best.',
			icon: Layers
		}
	] as const;

	const PREVIEW_TABS = [
		{ id: 'default', label: 'Home card', value: 'default' },
		{ id: 'page', label: 'Page card', value: 'page' },
		{ id: 'blog', label: 'Blog post card', value: 'blog' }
	];
	let pageSeo = $state<Record<string, { name: string; description: string }>>({});
	let previewTab = $state('default');
	let selectedPage = $state('');
	// Every page except the home page, straight from the backend's list
	const pagePaths = $derived(
		Object.keys(pageSeo).filter((path) => path !== '/' && STATIC_ROUTE_PATHS.includes(path))
	);
	let blogPosts = $state<{ slug: string; title: string; updatedAt: string }[]>([]);
	let selectedSlug = $state('');
	let selectedPost = $derived(blogPosts.find((post) => post.slug === selectedSlug));

	async function loadBlogPosts() {
		try {
			const response = await fetch('/api/blog?list=1');
			const rows = response.ok ? ((await response.json()).data ?? []) : [];
			blogPosts = rows;
			selectedSlug = rows[0]?.slug ?? '';
		} catch (error) {
			logger.error('Error loading blog posts for the preview:', error);
		}
	}

	const STYLE_FIELDS = [
		{ key: 'og_fade_color', label: 'Fade colour (over the background)', fallback: '#000000' },
		{ key: 'og_title_color', label: 'Title colour', fallback: '#ffffff' },
		{ key: 'og_text_color', label: 'Heading & subheading colour', fallback: '#b3b3b3' },
		{ key: 'og_pill_color', label: 'Website box colour', fallback: '#ffffff' },
		{ key: 'og_pill_text_color', label: 'Website box text colour', fallback: '#0b1020' }
	] as const;
	const SIZE_FIELDS = [
		{ key: 'og_title_scale', label: 'Title size', unit: '%', min: 50, max: 120, fallback: 100 },
		{ key: 'og_heading_size', label: 'Heading size', unit: 'px', min: 16, max: 48, fallback: 32 },
		{ key: 'og_text_size', label: 'Subheading size', unit: 'px', min: 16, max: 48, fallback: 32 },
		{ key: 'og_pill_size', label: 'Website box size', unit: 'px', min: 16, max: 48, fallback: 32 }
	] as const;
	const SIZE_OVERRIDE_KEYS = ['titleScale', 'headingSize', 'textSize', 'pillSize'] as const;
	let styleSizes = $state<number[]>(SIZE_FIELDS.map((f) => f.fallback));
	const FONT_KEY = 'og_font';
	let styleColors = $state<string[]>(STYLE_FIELDS.map((f) => f.fallback));
	let styleFont = $state('W95FA');
	let savingStyle = $state(false);

	let previewSrc = $state('');
	let previewRequest = 0;
	const STYLE_OVERRIDE_KEYS = [
		'fadeColor',
		'titleColor',
		'textColor',
		'pillColor',
		'pillTextColor'
	] as const;

	$effect(() => {
		if (isLoading || (previewTab === 'blog' && !selectedSlug)) return;
		void previewVersion;
		const body = JSON.stringify({
			kind: previewTab,
			path: selectedPage,
			name: pageSeo[selectedPage]?.name,
			description: pageSeo[selectedPage]?.description,
			slug: selectedSlug,
			overrides: {
				style: {
					...Object.fromEntries(STYLE_OVERRIDE_KEYS.map((key, i) => [key, styleColors[i]])),
					...Object.fromEntries(SIZE_OVERRIDE_KEYS.map((key, i) => [key, styleSizes[i]])),
					font: styleFont
				},
				text: { title: texts[0], subtitle: texts[1], pill: texts[2] }
			}
		});
		const request = ++previewRequest;
		const timer = setTimeout(async () => {
			try {
				const response = await fetch('/api/blog/og-preview.png', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body
				});
				if (!response.ok || request !== previewRequest) return;
				const url = URL.createObjectURL(await response.blob());
				if (previewSrc) URL.revokeObjectURL(previewSrc);
				previewSrc = url;
			} catch (error) {
				logger.error('Error rendering the preview:', error);
			}
		}, 300);
		return () => clearTimeout(timer);
	});

	let texts = $state<string[]>(TEXT_FIELDS.map((f) => f.fallback));
	let savingText = $state(false);
	let previewVersion = $state(0);

	let values = $state<Record<Field, string>>({ background: '', logo: '' });
	let isLoading = $state(true);
	let saving = $state<Field | null>(null);

	async function load(field: Field) {
		const response = await fetch(`/api/config/${KEYS[field]}`, { credentials: 'include' });
		values[field] = response.ok ? ((await response.json()).data?.value ?? '') : '';
	}

	onMount(async () => {
		void loadBlogPosts();
		try {
			await Promise.all([
				load('background'),
				load('logo'),
				...STYLE_FIELDS.map(async (field, i) => {
					const response = await fetch(`/api/config/${field.key}`, { credentials: 'include' });
					if (response.ok) styleColors[i] = (await response.json()).data?.value || field.fallback;
				}),
				(async () => {
					const response = await fetch(`/api/config/${FONT_KEY}`, { credentials: 'include' });
					if (response.ok) {
						const saved = (await response.json()).data?.value;
						styleFont = saved === 'sans' ? 'Nunito' : !saved || saved === 'pixel' ? 'W95FA' : saved;
					}
				})(),
				...SIZE_FIELDS.map(async (field, i) => {
					const response = await fetch(`/api/config/${field.key}`, { credentials: 'include' });
					if (response.ok) {
						styleSizes[i] = Number((await response.json()).data?.value) || field.fallback;
					}
				}),
				(async () => {
					const response = await fetch('/api/config/page-seo');
					if (response.ok) {
						pageSeo = (await response.json()).data ?? {};
						selectedPage =
							Object.keys(pageSeo).find(
								(path) => path !== '/' && STATIC_ROUTE_PATHS.includes(path)
							) ?? '';
					}
				})(),
				...TEXT_FIELDS.map(async (field, i) => {
					const response = await fetch(`/api/config/${field.key}`, { credentials: 'include' });
					if (response.ok) texts[i] = (await response.json()).data?.value ?? field.fallback;
				})
			]);
		} catch (error) {
			logger.error('Error loading social preview settings:', error);
			toast.error('Failed to load settings');
		} finally {
			isLoading = false;
		}
	});

	async function save(field: Field, value: string) {
		try {
			saving = field;
			const response = await fetch(`/api/config/${KEYS[field]}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ value, dataType: 'string' })
			});
			if (!response.ok) throw new Error('Request failed');
			values[field] = value;
			previewVersion++;
			toast.success(value ? 'Saved' : 'Reset to the built-in default');
		} catch (error) {
			logger.error('Error saving social preview setting:', error);
			toast.error('Failed to save');
		} finally {
			saving = null;
		}
	}

	async function saveTexts() {
		try {
			savingText = true;
			for (const [i, field] of TEXT_FIELDS.entries()) {
				const response = await fetch(`/api/config/${field.key}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ value: texts[i], dataType: 'string' })
				});
				if (!response.ok) throw new Error('Request failed');
			}
			previewVersion++;
			toast.success('Saved');
		} catch (error) {
			logger.error('Error saving social preview text:', error);
			toast.error('Failed to save');
		} finally {
			savingText = false;
		}
	}

	async function saveStyle(reset = false) {
		try {
			savingStyle = true;
			if (reset) {
				styleColors = STYLE_FIELDS.map((f) => f.fallback);
				styleSizes = SIZE_FIELDS.map((f) => f.fallback);
				styleFont = 'W95FA';
			}
			const entries = [
				...STYLE_FIELDS.map((f, i) => [f.key, reset ? f.fallback : styleColors[i]]),
				...SIZE_FIELDS.map((f, i) => [f.key, String(reset ? f.fallback : styleSizes[i])]),
				[FONT_KEY, reset ? 'W95FA' : styleFont]
			];
			const responses = await Promise.all(
				entries.map(([key, value]) =>
					fetch(`/api/config/${key}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include',
						body: JSON.stringify({ value, dataType: 'string' })
					})
				)
			);
			if (responses.some((response) => !response.ok)) throw new Error('Request failed');
			previewVersion++;
			toast.success(reset ? 'Style reset' : 'Saved');
		} catch (error) {
			logger.error('Error saving social preview style:', error);
			toast.error('Failed to save');
		} finally {
			savingStyle = false;
		}
	}

	function onUpload(field: Field, file: UploadedFile | UploadedFile[]) {
		const uploaded = Array.isArray(file) ? file[0] : file;
		if (uploaded) void save(field, uploaded.path);
	}
</script>

<svelte:head>
	<title>{adminPageTitle('Social Preview')}</title>
</svelte:head>

<div class="social-preview">
	<div class="settings-description">
		<p>
			Controls the preview card shown when your links are shared (Twitter, Discord, etc.). Blog
			posts with a cover image use the cover; every other card uses the background and logo below.
			Each page's name and description come from the SEO page.
		</p>
	</div>

	<section class="card">
		<h3 class="card-title">Live preview</h3>
		<Tabs
			tabs={PREVIEW_TABS}
			activeTab={previewTab}
			onTabChange={(id) => (previewTab = id)}
			variant="default"
			size="sm"
		/>
		{#if previewTab === 'default'}
			<img class="card-preview" src={previewSrc} alt="Preview of the home page social card" />
		{:else if previewTab === 'page'}
			<select class="text-input" bind:value={selectedPage} aria-label="Page to preview">
				{#each pagePaths as path (path)}
					<option value={path}>{pageSeo[path].name}</option>
				{/each}
			</select>
			<img
				class="card-preview"
				src={previewSrc}
				alt="Preview of the social card for {selectedPage}"
			/>
			<p class="help-text">
				Used for the About, Contact, Projects and Blog pages. The home page and other pages use the
				home card.
			</p>
		{:else if selectedPost}
			<select class="text-input" bind:value={selectedSlug} aria-label="Blog post to preview">
				{#each blogPosts as post (post.slug)}
					<option value={post.slug}>{post.title}</option>
				{/each}
			</select>
			<img
				class="card-preview"
				src={previewSrc}
				alt="Preview of the social card for {selectedPost.title}"
			/>
			<p class="help-text">
				A post's cover image replaces the background and logo; its title, date and tags come from
				the post.
			</p>
		{:else}
			<p class="help-text">Publish a blog post to preview its card here.</p>
		{/if}
	</section>

	{#if isLoading}
		<div class="loading"><Loader2 size={24} class="spin" /> Loading...</div>
	{:else}
		<section class="card">
			<h3 class="card-title"><Type size={18} /> Text</h3>
			<p class="help-text">
				Shown on every card: the heading and website text appear on all of them, and the subheading
				on the home card. Leave a box empty to hide that line.
			</p>
			{#each TEXT_FIELDS as field, i (field.key)}
				<div class="form-group">
					<label class="field-label" for={field.key}>{field.label}</label>
					<input
						id={field.key}
						class="text-input"
						type="text"
						bind:value={texts[i]}
						maxlength="120"
					/>
				</div>
			{/each}
			<div class="form-actions">
				<button type="button" class="save-button" onclick={saveTexts} disabled={savingText}>
					{#if savingText}<Loader2 size={16} class="spin" />{/if}
					{savingText ? 'Saving...' : 'Save text'}
				</button>
			</div>
		</section>

		<section class="card">
			<h3 class="card-title"><Palette size={18} /> Style</h3>
			<p class="help-text">Colours, font and text sizes used on every card.</p>
			{#each STYLE_FIELDS as field, i (field.key)}
				<div class="color-row">
					<input id={field.key} class="color-input" type="color" bind:value={styleColors[i]} />
					<label class="field-label" for={field.key}>{field.label}</label>
					<code class="color-code">{styleColors[i]}</code>
				</div>
			{/each}
			{#each SIZE_FIELDS as field, i (field.key)}
				<div class="form-group">
					<label class="field-label size-label" for={field.key}>
						{field.label}
						<span class="color-code">{styleSizes[i]}{field.unit}</span>
					</label>
					<input
						id={field.key}
						type="range"
						min={field.min}
						max={field.max}
						bind:value={styleSizes[i]}
					/>
				</div>
			{/each}
			<FontPicker
				id="og-font"
				label="Font"
				value={styleFont}
				onChange={(font) => (styleFont = font)}
			/>
			<div class="form-actions">
				<button
					type="button"
					class="reset-button"
					onclick={() => saveStyle(true)}
					disabled={savingStyle}
				>
					Reset to defaults
				</button>
				<button
					type="button"
					class="save-button"
					onclick={() => saveStyle()}
					disabled={savingStyle}
				>
					{#if savingStyle}<Loader2 size={16} class="spin" />{/if}
					{savingStyle ? 'Saving...' : 'Save style'}
				</button>
			</div>
		</section>

		{#each IMAGE_FIELDS as { field: f, title, hint, icon: Icon } (f)}
			<section class="card">
				<h3 class="card-title"><Icon size={18} /> {title}</h3>
				<p class="help-text">{hint}</p>
				<div class="image-row">
					<img
						class="current"
						class:logo={f === 'logo'}
						src={values[f] || DEFAULT_IMAGES[f]}
						alt="Current {title}"
					/>
					<!-- The built-in default can't be removed, only replaced. -->
					{#if values[f]}
						<button
							type="button"
							class="remove-image-btn"
							title="Remove (use the built-in default)"
							disabled={saving === f}
							onclick={() => save(f, '')}
						>
							<X size={16} />
						</button>
					{/if}
				</div>
				{#if !values[f]}
					<p class="help-text">This is the built-in default. Upload an image to replace it.</p>
					<FileUpload
						acceptedTypes={['image']}
						onUpload={(file) => onUpload(f, file)}
						showPreview={false}
						label="Upload image"
					/>
				{/if}
			</section>
		{/each}
	{/if}
</div>

<style>
	.social-preview {
		width: 100%;
		max-width: 720px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.settings-description {
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.settings-description p {
		color: var(--text-secondary, #a1a1aa);
		margin: 0;
		font-size: 14px;
		line-height: 1.5;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 20px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 10px;
	}

	.card-title {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.help-text {
		margin: 0;
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
		line-height: 1.5;
	}

	.card-preview {
		display: block;
		width: 100%;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-label {
		font-size: 13px;
		color: var(--text-secondary, #a1a1aa);
	}

	.text-input {
		width: 100%;
		box-sizing: border-box;
		background: var(--bg-tertiary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 12px 14px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.text-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	.color-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.color-input {
		width: 40px;
		height: 32px;
		padding: 0;
		background: none;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		cursor: pointer;
	}

	.size-label {
		display: flex;
		justify-content: space-between;
	}

	.color-code {
		margin-left: auto;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
	}

	.reset-button {
		background: none;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 12px 20px;
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		cursor: pointer;
	}

	.save-button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: var(--accent-bg, var(--accent-color, #6366f1));
		color: var(--accent-fg);
		border: none;
		border-radius: 8px;
		padding: 12px 20px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}

	.save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.image-row {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.current {
		display: block;
		max-width: 100%;
		max-height: 200px;
		background: var(--bg-tertiary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
	}

	.current.logo {
		background: #1a1240;
		padding: 8px;
		max-height: 160px;
	}

	.remove-image-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		background: rgba(239, 68, 68, 0.9);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.remove-image-btn:hover {
		background: rgba(239, 68, 68, 1);
	}

	.loading {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--text-secondary, #a1a1aa);
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 640px) {
		.card {
			padding: 16px;
		}

		.save-button {
			width: 100%;
			justify-content: center;
		}
	}
</style>
