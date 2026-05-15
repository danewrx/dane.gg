<script lang="ts">
	import { logger } from '$lib/logger';

	import Icon from '@iconify/svelte';
	import {
		getIconCategories,
		searchIcons,
		type IconOption
	} from '$lib/admin/services/iconLibraryService';
	import { sanitizeSvgInlineMarkup } from '$lib/shared/utils/sanitizeSvgInline';
	import { validateSvgIconUrl } from '$lib/shared/utils/validateSvgIconUrl';
	import { Search, X } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	interface Props {
		selectedIcon?: IconOption | null;
		onIconSelect?: (icon: IconOption | null) => void;
		placeholder?: string;
		showPreview?: boolean;
		previewLabel?: string;
		previewText?: string;
		triggerless?: boolean;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		omitSvgInline?: boolean;
	}

	let {
		selectedIcon = null,
		onIconSelect = () => {},
		placeholder = 'Choose from icon library...',
		showPreview = true,
		previewLabel = 'Preview',
		previewText = 'Button Text',
		triggerless = false,
		open = $bindable(false),
		onOpenChange = () => {},
		omitSvgInline = false
	}: Props = $props();

	let isOpenInternal = $state(false);
	let isOpen = $derived.by(() => (triggerless ? open : isOpenInternal));
	let customSvgUrl = $state('');
	let customSvgInline = $state('');
	let customText = $state('');
	let showCustomInputs = $state(false);
	let customInputType = $state<'svg-url' | 'svg-inline' | 'text' | null>(null);

	$effect(() => {
		if (triggerless) {
			isOpenInternal = open;
		}
	});

	// Watch for custom icon selection
	let isSelectingCustom = $state(false);

	$effect(() => {
		if (isSelectingCustom) return;

		if (selectedIcon && !showCustomInputs) {
			if (selectedIcon.type === 'svg-url' && selectedIcon.svgUrl) {
				showCustomInputs = true;
				customInputType = 'svg-url';
				customSvgUrl = selectedIcon.svgUrl;
			} else if (selectedIcon.type === 'svg-inline' && selectedIcon.svgInline) {
				showCustomInputs = true;
				customInputType = 'svg-inline';
				customSvgInline = selectedIcon.svgInline;
			} else if (selectedIcon.type === 'custom-text' && selectedIcon.text) {
				showCustomInputs = true;
				customInputType = 'text';
				customText = selectedIcon.text;
			} else if (
				selectedIcon.type !== 'svg-url' &&
				selectedIcon.type !== 'svg-inline' &&
				selectedIcon.type !== 'custom-text'
			) {
				showCustomInputs = false;
				customInputType = null;
			}
		} else if (!selectedIcon && showCustomInputs) {
			showCustomInputs = false;
			customInputType = null;
		}
	});
	let searchQuery = $state('');
	let selectedCategory = $state('all');
	let iconCategories = $state<any[]>([]);
	let filteredIcons = $state<IconOption[]>([]);
	let isLoading = $state(true);

	let gridIcons = $derived(
		omitSvgInline ? filteredIcons.filter((icon) => icon.type !== 'svg-inline') : filteredIcons
	);

	let svgUrlFieldInvalid = $derived(
		customInputType === 'svg-url' &&
			customSvgUrl.trim() !== '' &&
			!validateSvgIconUrl(customSvgUrl)
	);

	$effect(() => {
		(async () => {
			try {
				isLoading = true;
				iconCategories = await getIconCategories();
				await updateFilteredIcons();
			} catch (error) {
				logger.error('Failed to load icon categories:', error);
			} finally {
				isLoading = false;
			}
		})();
	});

	// Update filtered icons on search query or category change
	async function updateFilteredIcons() {
		if (searchQuery.trim()) {
			filteredIcons = await searchIcons(searchQuery);
		} else {
			const categories =
				selectedCategory === 'all'
					? iconCategories
					: iconCategories.filter((cat) => cat.name === selectedCategory);
			filteredIcons = categories.flatMap((category) => category.icons);
		}
	}

	// Watch for changes in search query and category
	$effect(() => {
		if (iconCategories.length > 0) {
			updateFilteredIcons();
		}
	});

	function selectIcon(icon: IconOption, event?: Event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}

		if (icon.type === 'svg-url' || icon.type === 'svg-inline' || icon.type === 'custom-text') {
			isSelectingCustom = true;

			selectedIcon = icon;
			showCustomInputs = true;
			customInputType =
				icon.type === 'svg-url' ? 'svg-url' : icon.type === 'svg-inline' ? 'svg-inline' : 'text';
			if (icon.type === 'svg-url') {
				customSvgUrl = icon.svgUrl || '';
			} else if (icon.type === 'svg-inline') {
				customSvgInline = icon.svgInline || '';
			} else {
				customText = icon.text || '';
			}

			setTimeout(() => {
				isSelectingCustom = false;
			}, 0);
		} else {
			isSelectingCustom = false;
			selectedIcon = icon;
			onIconSelect(icon);
			closeDropdown(event);
		}
	}

	function saveCustomIcon(event?: Event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}

		if (!selectedIcon) return;

		if (customInputType === 'svg-url') {
			const normalized = validateSvgIconUrl(customSvgUrl);
			if (!normalized) return;
			const customIcon: IconOption = {
				...selectedIcon,
				svgUrl: normalized,
				name: normalized
			};
			onIconSelect(customIcon);
			showCustomInputs = false;
			customInputType = null;
			closeDropdown(event);
		} else if (customInputType === 'svg-inline') {
			const safe = sanitizeSvgInlineMarkup(customSvgInline);
			if (!safe) return;
			const customIcon: IconOption = {
				...selectedIcon,
				svgInline: safe,
				name: 'svg-inline-custom',
				displayName: 'Custom SVG (paste code)'
			};
			onIconSelect(customIcon);
			showCustomInputs = false;
			customInputType = null;
			closeDropdown(event);
		} else if (customInputType === 'text' && customText.trim()) {
			const customIcon: IconOption = {
				...selectedIcon,
				text: customText.trim(),
				name: `custom-text-${customText.trim()}`
			};
			onIconSelect(customIcon);
			showCustomInputs = false;
			customInputType = null;
			closeDropdown(event);
		}
	}

	function cancelCustomInput(event?: Event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}

		const wasCustom =
			selectedIcon &&
			(selectedIcon.type === 'svg-url' ||
				selectedIcon.type === 'svg-inline' ||
				selectedIcon.type === 'custom-text');
		if (wasCustom) {
			selectedIcon = null;
			onIconSelect(null);
		}
		showCustomInputs = false;
		customInputType = null;
		customSvgUrl = '';
		customSvgInline = '';
		customText = '';
	}

	function toggleDropdown(event?: Event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}
		if (triggerless) {
			open = !open;
			onOpenChange(open);
		} else {
			isOpenInternal = !isOpenInternal;
		}
		if (isOpen) {
			searchQuery = '';
		}
	}

	function closeDropdown(event?: Event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}
		if (triggerless) {
			open = false;
			onOpenChange(false);
		} else {
			isOpenInternal = false;
		}
		searchQuery = '';
	}

	function getIconRenderInfo(icon: IconOption | null): {
		type: 'lucide' | 'iconify' | 'svg-url' | 'svg-inline' | 'text' | null;
		component?: ComponentType;
		icon?: string;
		url?: string;
		markup?: string;
		text?: string;
	} {
		if (!icon) return { type: null };

		if (icon.type === 'lucide' && icon.lucideComponent) {
			return { type: 'lucide', component: icon.lucideComponent as ComponentType };
		} else if (icon.type === 'coreui-brand' && icon.iconSet && icon.iconName) {
			return { type: 'iconify', icon: `${icon.iconSet}:${icon.iconName}` };
		} else if (icon.type === 'svg-url' && icon.svgUrl) {
			return { type: 'svg-url', url: icon.svgUrl };
		} else if (icon.type === 'svg-inline' && icon.svgInline) {
			const safe = sanitizeSvgInlineMarkup(icon.svgInline);
			if (safe) return { type: 'svg-inline', markup: safe };
		} else if (icon.type === 'custom-text' && icon.text) {
			return { type: 'text', text: icon.text };
		}

		return { type: null };
	}
</script>

<div class="unified-icon-picker">
	{#if showPreview}
		<div class="preview-panel">
			<div class="preview-label">{previewLabel}</div>
			<div class="preview-button">
				{#if selectedIcon}
					{@const iconInfo = getIconRenderInfo(selectedIcon)}
					{#if iconInfo.type === 'lucide' && iconInfo.component}
						{@const IconComponent = iconInfo.component}
						<IconComponent size={16} />
					{:else if iconInfo.type === 'iconify' && iconInfo.icon}
						<Icon icon={iconInfo.icon} width="16" height="16" />
					{:else if iconInfo.type === 'svg-url' && iconInfo.url}
						<img src={iconInfo.url} alt="Icon" width="16" height="16" />
					{:else if iconInfo.type === 'svg-inline' && iconInfo.markup}
						<span class="svg-inline-host" aria-hidden="true">{@html iconInfo.markup}</span>
					{:else if iconInfo.type === 'text' && iconInfo.text}
						<span class="text-icon">{iconInfo.text}</span>
					{:else}
						<Icon icon="lucide:external-link" width="16" height="16" />
					{/if}
				{:else}
					<Icon icon="lucide:external-link" width="16" height="16" />
				{/if}
				<span>{previewText}</span>
			</div>
		</div>
	{/if}

	<div class="picker-container">
		<button class="picker-trigger" onclick={(e) => toggleDropdown(e)} type="button">
			{#if selectedIcon}
				{@const iconInfo = getIconRenderInfo(selectedIcon)}
				<div class="selected-icon">
					{#if iconInfo.type === 'lucide' && iconInfo.component}
						{@const IconComponent = iconInfo.component}
						<IconComponent size={20} />
					{:else if iconInfo.type === 'iconify' && iconInfo.icon}
						<Icon icon={iconInfo.icon} width="20" height="20" />
					{:else if iconInfo.type === 'svg-url' && iconInfo.url}
						<img src={iconInfo.url} alt="Icon" width="20" height="20" />
					{:else if iconInfo.type === 'svg-inline' && iconInfo.markup}
						<span class="svg-inline-host svg-inline-host--md" aria-hidden="true"
							>{@html iconInfo.markup}</span
						>
					{:else if iconInfo.type === 'text' && iconInfo.text}
						<span class="text-icon">{iconInfo.text}</span>
					{:else}
						<Icon icon="lucide:external-link" width="20" height="20" />
					{/if}
					<div class="icon-name-group">
						<span class="icon-name">{selectedIcon.displayName}</span>
						<span class="icon-pack-small"
							>{selectedIcon.type === 'coreui-brand'
								? 'CoreUI'
								: selectedIcon.type === 'lucide'
									? 'Lucide'
									: selectedIcon.type === 'svg-url'
										? 'Custom SVG URL'
										: selectedIcon.type === 'svg-inline'
											? 'Inline SVG'
											: 'Custom Text'}</span
						>
					</div>
				</div>
			{:else}
				<span class="placeholder">{placeholder}</span>
			{/if}
			<div class="dropdown-arrow" class:open={isOpen}>▼</div>
		</button>

		{#if isOpen}
			<div
				class="dropdown-overlay"
				onclick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					if (!showCustomInputs) closeDropdown(e);
				}}
				role="button"
				tabindex="0"
				onkeydown={(e) => {
					e.preventDefault();
					e.stopPropagation();
					if (e.key === 'Escape') closeDropdown(e);
				}}
			></div>
			<form
				class="dropdown"
				class:show-custom-inputs={showCustomInputs}
				onsubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					return false;
				}}
			>
				<div class="dropdown-header">
					<div class="search-container">
						<span class="search-icon" aria-hidden="true"><Search size={16} /></span>
						<input
							type="text"
							placeholder="Search icons..."
							bind:value={searchQuery}
							class="search-input"
						/>
					</div>
					<button type="button" class="close-button" onclick={(e) => closeDropdown(e)}>
						<X size={16} />
					</button>
				</div>

				<div class="category-tabs">
					<button
						class="category-tab"
						class:active={selectedCategory === 'all'}
						onclick={() => (selectedCategory = 'all')}
					>
						All
					</button>
					{#each iconCategories as category}
						<button
							type="button"
							class="category-tab"
							class:active={selectedCategory === category.name}
							onclick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								selectedCategory = category.name;
							}}
						>
							{category.displayName}
						</button>
					{/each}
				</div>

				{#if isLoading}
					<div class="loading-state">
						<div class="loading-spinner"></div>
						<p>Loading icons...</p>
					</div>
				{:else}
					<div class="icons-grid">
						<button
							type="button"
							class="icon-option"
							class:selected={selectedIcon === null}
							onclick={(e) => {
								e.stopPropagation();
								onIconSelect(null);
								isOpen = false;
							}}
							title="None (Default)"
						>
							<div class="no-icon">—</div>
							<span class="icon-label">None</span>
							<span class="icon-pack">Default</span>
						</button>
						{#each gridIcons as icon}
							{@const iconInfo = getIconRenderInfo(icon)}
							<button
								type="button"
								class="icon-option"
								class:selected={selectedIcon?.name === icon.name}
								onclick={(e) => selectIcon(icon, e)}
								title={icon.displayName}
							>
								{#if iconInfo.type === 'lucide' && iconInfo.component}
									{@const IconComponent = iconInfo.component}
									<IconComponent size={24} />
								{:else if iconInfo.type === 'iconify' && iconInfo.icon}
									<Icon icon={iconInfo.icon} width="24" height="24" />
								{:else if iconInfo.type === 'svg-url' && iconInfo.url}
									<img src={iconInfo.url} alt={icon.displayName} width="24" height="24" />
								{:else if iconInfo.type === 'svg-inline' && iconInfo.markup}
									<span class="svg-inline-host svg-inline-host--lg" aria-hidden="true"
										>{@html iconInfo.markup}</span
									>
								{:else if iconInfo.type === 'text' && iconInfo.text}
									<span class="text-icon">{iconInfo.text}</span>
								{:else if icon.type === 'svg-url'}
									<Icon icon="lucide:link" width="24" height="24" />
								{:else if icon.type === 'svg-inline'}
									<Icon icon="lucide:file-code" width="24" height="24" />
								{:else if icon.type === 'custom-text'}
									<span class="text-icon-preview">T</span>
								{:else}
									<Icon icon="lucide:external-link" width="24" height="24" />
								{/if}
								<span class="icon-label" title={icon.displayName}>{icon.displayName}</span>
								<span class="icon-pack"
									>{icon.type === 'coreui-brand'
										? 'CoreUI'
										: icon.type === 'lucide'
											? 'Lucide'
											: icon.type === 'svg-url'
												? 'Custom SVG URL'
												: icon.type === 'svg-inline'
													? 'Inline SVG'
													: 'Custom Text'}</span
								>
							</button>
						{/each}
					</div>

					{#if filteredIcons.length === 0}
						<div class="no-results">
							<p>No icons found matching "{searchQuery}"</p>
						</div>
					{/if}
				{/if}

				{#if showCustomInputs && customInputType}
					<div class="custom-input-section">
						<div class="custom-input-header">
							<h4>
								{customInputType === 'svg-url'
									? 'Enter SVG URL'
									: customInputType === 'svg-inline'
										? 'Paste SVG markup'
										: 'Enter Custom Text'}
							</h4>
							<button
								type="button"
								class="cancel-custom-button"
								onclick={(e) => cancelCustomInput(e)}
							>
								<X size={16} />
							</button>
						</div>
						{#if customInputType === 'svg-url'}
							<div class="custom-input-group">
								<label for="unified-icon-picker-svg-url">SVG URL</label>
								<input
									id="unified-icon-picker-svg-url"
									type="url"
									bind:value={customSvgUrl}
									placeholder="https://example.com/icon.svg"
									class="custom-input"
									class:custom-input-invalid={svgUrlFieldInvalid}
									aria-invalid={svgUrlFieldInvalid}
									autocomplete="off"
								/>
								<small>
									Absolute <code>http://</code> or <code>https://</code> URL, max 500 characters (no username/password in the URL).
								</small>
								{#if svgUrlFieldInvalid}
									<small class="svg-url-validation-error">That does not look like a valid URL.</small>
								{/if}
							</div>
						{:else if customInputType === 'svg-inline'}
							<div class="custom-input-group">
								<label for="unified-icon-picker-svg-inline">SVG markup</label>
								<textarea
									id="unified-icon-picker-svg-inline"
									bind:value={customSvgInline}
									placeholder='<svg xmlns="http://www.w3.org/2000/svg" ...></svg>'
									class="custom-input custom-textarea"
									rows={6}
									spellcheck={false}
								></textarea>
								<small>Paste a single root &lt;svg&gt; element (stored after basic safety checks)</small>
							</div>
						{:else}
							<div class="custom-input-group">
								<label for="unified-icon-picker-custom-text">Custom Text</label>
								<input
									id="unified-icon-picker-custom-text"
									type="text"
									bind:value={customText}
									placeholder="e.g., Custom, Logo, etc."
									maxlength="20"
									class="custom-input"
								/>
								<small>This will be displayed as a styled text badge</small>
							</div>
						{/if}
						<div class="custom-input-actions">
							<button
								type="button"
								class="save-custom-button"
								onclick={(e) => saveCustomIcon(e)}
								disabled={customInputType === 'svg-url'
									? !validateSvgIconUrl(customSvgUrl)
									: customInputType === 'svg-inline'
										? !sanitizeSvgInlineMarkup(customSvgInline)
										: !customText.trim()}
							>
								Save
							</button>
							<button type="button" class="cancel-button" onclick={(e) => cancelCustomInput(e)}>
								Cancel
							</button>
						</div>
					</div>
				{/if}
			</form>
		{/if}
	</div>
</div>

<style>
	.unified-icon-picker {
		display: flex;
		gap: 16px;
		align-items: flex-start;
	}

	.preview-panel {
		flex-shrink: 0;
		width: 200px;
	}

	.preview-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
		margin-bottom: 8px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.preview-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 16px;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		min-width: 150px;
	}

	.preview-button .svg-inline-host :global(svg) {
		width: 16px;
		height: 16px;
		display: block;
	}

	.svg-inline-host {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 0;
	}

	.svg-inline-host--md :global(svg) {
		width: 20px;
		height: 20px;
		display: block;
	}

	.svg-inline-host--lg :global(svg) {
		width: 24px;
		height: 24px;
		display: block;
	}

	.custom-textarea {
		resize: vertical;
		min-height: 120px;
		font-family: ui-monospace, monospace;
		font-size: 12px;
		line-height: 1.4;
	}

	.preview-button .text-icon {
		font-size: 14px;
		line-height: 1;
	}

	.picker-container {
		position: relative;
		flex: 1;
		width: 100%;
		background: var(--bg-tertiary, #3a3a3a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.picker-container:hover {
		border-color: var(--accent-color, #6366f1);
	}

	.picker-container:focus-within {
		border-color: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.picker-trigger {
		width: 100%;
		padding: 10px 14px;
		border: none;
		background: transparent;
		color: var(--text-primary, #ffffff);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: space-between;
		transition: all 0.2s ease;
	}

	.picker-trigger:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.selected-icon {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.icon-name-group {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
	}

	.icon-name {
		font-size: 14px;
		font-weight: 500;
		line-height: 1.2;
	}

	.icon-pack-small {
		font-size: 10px;
		font-weight: 400;
		color: var(--text-secondary, #a1a1aa);
		opacity: 0.7;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		line-height: 1;
	}

	.placeholder {
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
	}

	.dropdown-arrow {
		transition: transform 0.2s ease;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
	}

	.dropdown-arrow.open {
		transform: rotate(180deg);
	}

	.dropdown-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		z-index: 1000;
	}

	.dropdown {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 80%;
		max-width: 700px;
		height: 70vh;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 12px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		z-index: 1001;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.dropdown-header {
		padding: 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.search-container {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		color: var(--text-secondary, #a1a1aa);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 8px 12px 8px 36px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		transition: all 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.close-button {
		padding: 8px;
		border: none;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.close-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.category-tabs {
		display: flex;
		padding: 0 16px;
		border-bottom: 1px solid var(--border-color, #3a3a3a);
		overflow-x: auto;
	}

	.category-tab {
		padding: 8px 16px;
		border: none;
		background: transparent;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		border-bottom: 2px solid transparent;
		transition: all 0.2s ease;
	}

	.category-tab:hover {
		color: var(--text-primary, #ffffff);
		background: var(--bg-tertiary, #3a3a3a);
	}

	.category-tab.active {
		color: var(--accent-color, #6366f1);
		border-bottom-color: var(--accent-color, #6366f1);
	}

	.icons-grid {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 16px;
		overflow-y: auto;
		min-height: 0;
		align-content: flex-start;
		flex-shrink: 1;
	}

	.icon-option {
		padding: 12px 8px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		transition: all 0.2s ease;
		text-align: center;
		width: 120px;
		min-width: 120px;
		max-width: 120px;
		box-sizing: border-box;
		flex-shrink: 0;
		flex-grow: 0;
	}

	.icon-option:hover {
		border-color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.1);
		transform: translateY(-1px);
	}

	.icon-option.selected {
		border-color: var(--accent-color, #6366f1);
		background: var(--accent-color, #6366f1);
		color: var(--accent-color-contrast, #ffffff);
	}

	.icon-label {
		font-size: 11px;
		font-weight: 500;
		line-height: 1.2;
		word-break: break-word;
		text-align: center;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		margin-bottom: 2px;
	}

	.icon-pack {
		font-size: 9px;
		font-weight: 400;
		color: var(--text-secondary, #a1a1aa);
		opacity: 0.7;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		line-height: 1;
	}

	.text-icon {
		font-size: 1.25rem;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		min-height: 24px;
	}

	.no-icon {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		color: var(--text-secondary, #a1a1aa);
	}

	.loading-state {
		padding: 32px 16px;
		text-align: center;
		color: var(--text-secondary, #a1a1aa);
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border-color, #3a3a3a);
		border-top: 2px solid var(--accent-color, #6366f1);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 8px;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.no-results {
		padding: 32px 16px;
		text-align: center;
		color: var(--text-secondary, #a1a1aa);
	}

	.no-results p {
		margin: 0;
		font-size: 14px;
	}

	.custom-input-section {
		border-top: 1px solid var(--border-color, #3a3a3a);
		padding: 16px;
		background: var(--bg-secondary, #2d2d2d);
		flex-shrink: 0;
		z-index: 10;
	}

	.custom-input-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.custom-input-header h4 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.cancel-custom-button {
		background: transparent;
		border: none;
		color: var(--text-secondary, #a1a1aa);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.cancel-custom-button:hover {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.custom-input-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 12px;
	}

	.custom-input-group label {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary, #a1a1aa);
	}

	.custom-input {
		padding: 8px 12px;
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		width: 100%;
		box-sizing: border-box;
	}

	.custom-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.custom-input-group small {
		font-size: 11px;
		color: var(--text-secondary, #a1a1aa);
	}

	.custom-input-group small code {
		font-size: 10px;
	}

	.svg-url-validation-error {
		display: block;
		margin-top: 4px;
		color: #f87171 !important;
	}

	.custom-input-invalid {
		border-color: #f87171 !important;
	}

	.custom-input-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	.save-custom-button,
	.cancel-button {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
	}

	.save-custom-button {
		background: var(--accent-color, #6366f1);
		color: white;
	}

	.save-custom-button:hover:not(:disabled) {
		background: var(--accent-hover, #5558e3);
	}

	.save-custom-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.cancel-button {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.cancel-button:hover {
		background: var(--bg-hover, #4a4a4a);
	}

	@media (max-width: 768px) {
		.unified-icon-picker {
			flex-direction: column;
		}

		.preview-panel {
			width: 100%;
		}

		.dropdown {
			width: 95%;
			height: 80vh;
		}
	}

	@media (max-width: 480px) {
		.dropdown {
			width: 98%;
			height: 85vh;
		}

		.icons-grid {
			gap: 6px;
			padding: 12px;
		}

		.icon-option {
			padding: 8px 6px;
			width: 100px;
			min-width: 100px;
			max-width: 100px;
		}

		.icon-label {
			font-size: 10px;
		}
	}
</style>
