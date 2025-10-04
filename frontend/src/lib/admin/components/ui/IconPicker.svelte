<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getIconCategories, searchIcons, type IconOption } from '$lib/admin/services/iconLibraryService';
	import { Search, X } from 'lucide-svelte';

	interface Props {
		selectedIcon?: IconOption | null;
		onIconSelect?: (icon: IconOption | null) => void;
		placeholder?: string;
	}

	let { 
		selectedIcon = null, 
		onIconSelect = () => {}, 
		placeholder = 'Choose from icon library...' 
	}: Props = $props();

	let isOpen = $state(false);
	let searchQuery = $state('');
	let selectedCategory = $state('all');
	let iconCategories = $state<any[]>([]);
	let filteredIcons = $state<IconOption[]>([]);
	let isLoading = $state(true);

	// Load icons when component mounts
	$effect(async () => {
		try {
			isLoading = true;
			iconCategories = await getIconCategories();
			await updateFilteredIcons();
		} catch (error) {
			console.error('Failed to load icon categories:', error);
		} finally {
			isLoading = false;
		}
	});

	// Update filtered icons when search query or category changes
	async function updateFilteredIcons() {
		if (searchQuery.trim()) {
			filteredIcons = await searchIcons(searchQuery);
		} else {
			const categories = selectedCategory === 'all' 
				? iconCategories 
				: iconCategories.filter(cat => cat.name === selectedCategory);
			filteredIcons = categories.flatMap(category => category.icons);
		}
	}

	// Watch for changes in search query and category
	$effect(async () => {
		if (iconCategories.length > 0) {
			await updateFilteredIcons();
		}
	});

	function selectIcon(icon: IconOption) {
		selectedIcon = icon;
		onIconSelect(icon);
		isOpen = false;
		searchQuery = '';
	}

	function clearSelection() {
		selectedIcon = null;
		onIconSelect(null);
	}

	function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) {
			searchQuery = '';
		}
	}

	function closeDropdown() {
		isOpen = false;
		searchQuery = '';
	}
</script>

<div class="icon-picker">
	<button 
		class="picker-trigger" 
		onclick={toggleDropdown}
		type="button"
	>
		{#if selectedIcon}
			<div class="selected-icon">
				<Icon 
					icon={`${selectedIcon.iconSet}:${selectedIcon.iconName}`} 
					width="20" 
					height="20" 
				/>
				<span class="icon-name">{selectedIcon.displayName}</span>
			</div>
		{:else}
			<span class="placeholder">{placeholder}</span>
		{/if}
		<div class="dropdown-arrow" class:open={isOpen}>
			▼
		</div>
	</button>

	{#if isOpen}
		<div class="dropdown-overlay" onclick={closeDropdown}></div>
		<div class="dropdown">
			<div class="dropdown-header">
				<div class="search-container">
					<Search size={16} class="search-icon" />
					<input 
						type="text" 
						placeholder="Search icons..." 
						bind:value={searchQuery}
						class="search-input"
					/>
				</div>
				<button class="close-button" onclick={closeDropdown}>
					<X size={16} />
				</button>
			</div>

			<div class="category-tabs">
				<button 
					class="category-tab" 
					class:active={selectedCategory === 'all'}
					onclick={() => selectedCategory = 'all'}
				>
					All
				</button>
				{#each iconCategories as category}
					<button 
						class="category-tab" 
						class:active={selectedCategory === category.name}
						onclick={() => selectedCategory = category.name}
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
					{#each filteredIcons as icon}
					<button 
						class="icon-option" 
						class:selected={selectedIcon?.name === icon.name}
						onclick={() => selectIcon(icon)}
						title={icon.displayName}
					>
						{#if icon.type === 'coreui-brand' && icon.iconSet && icon.iconName}
							<Icon 
								icon={`${icon.iconSet}:${icon.iconName}`} 
								width="24" 
								height="24" 
							/>
						{:else}
							<Icon 
								icon="cib:link" 
								width="24" 
								height="24" 
							/>
						{/if}
						<span class="icon-label">{icon.displayName}</span>
					</button>
					{/each}
				</div>

				{#if filteredIcons.length === 0}
					<div class="no-results">
						<p>No icons found matching "{searchQuery}"</p>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.icon-picker {
		position: relative;
		width: 100%;
		background: #1a1a1a;
		border: 1px solid #2a2a2a;
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	:global(html:not(.dark)) .icon-picker {
		background: #ffffff;
		border-color: #d1d5db;
	}

	.icon-picker:hover {
		border-color: #3a3a3a;
	}

	:global(html:not(.dark)) .icon-picker:hover {
		border-color: #9ca3af;
	}

	.icon-picker:focus-within {
		border-color: var(--accent-color, #3b82f6);
		box-shadow: 0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1));
	}

	.picker-trigger {
		width: 100%;
		padding: 12px 16px;
		border: none;
		background: transparent;
		color: #ffffff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: space-between;
		transition: all 0.2s ease;
	}

	:global(html:not(.dark)) .picker-trigger {
		color: #1f2937;
	}

	.picker-trigger:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	:global(html:not(.dark)) .picker-trigger:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	.selected-icon {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.icon-name {
		font-size: 14px;
		font-weight: 500;
	}

	.placeholder {
		color: #9ca3af;
		font-size: 14px;
	}

	:global(html:not(.dark)) .placeholder {
		color: #6b7280;
	}

	.dropdown-arrow {
		transition: transform 0.2s ease;
		font-size: 12px;
		color: #9ca3af;
	}

	:global(html:not(.dark)) .dropdown-arrow {
		color: #6b7280;
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
		max-width: 600px;
		height: 70vh;
		background: #1a1a1a;
		border: 1px solid #2a2a2a;
		border-radius: 16px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		z-index: 1001;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		backdrop-filter: blur(8px);
	}

	:global(html:not(.dark)) .dropdown {
		background: #ffffff;
		border-color: #e5e7eb;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	}

	.dropdown-header {
		padding: 16px;
		border-bottom: 1px solid #2a2a2a;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	:global(html:not(.dark)) .dropdown-header {
		border-bottom-color: #e5e7eb;
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
		color: #9ca3af;
		pointer-events: none;
	}

	:global(html:not(.dark)) .search-icon {
		color: #6b7280;
	}

	.search-input {
		width: 100%;
		padding: 8px 12px 8px 36px;
		border: 1px solid #2a2a2a;
		border-radius: 6px;
		background: #1a1a1a;
		color: #ffffff;
		font-size: 14px;
		transition: all 0.2s ease;
	}

	:global(html:not(.dark)) .search-input {
		border-color: #d1d5db;
		background: #ffffff;
		color: #1f2937;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--accent-color, #3b82f6);
		box-shadow: 0 0 0 3px var(--accent-color-light, rgba(59, 130, 246, 0.1));
	}

	.close-button {
		padding: 8px;
		border: none;
		background: transparent;
		color: #9ca3af;
		cursor: pointer;
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

	.category-tabs {
		display: flex;
		padding: 0 16px;
		border-bottom: 1px solid #2a2a2a;
		overflow-x: auto;
	}

	:global(html:not(.dark)) .category-tabs {
		border-bottom-color: #e5e7eb;
	}

	.category-tab {
		padding: 8px 16px;
		border: none;
		background: transparent;
		color: #9ca3af;
		cursor: pointer;
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		border-bottom: 2px solid transparent;
		transition: all 0.2s ease;
	}

	.category-tab:hover {
		color: #ffffff;
		background: #374151;
	}

	.category-tab.active {
		color: #6366f1;
		border-bottom-color: #6366f1;
	}

	.icons-grid {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 8px;
		padding: 16px;
		overflow-y: auto;
		min-height: 0;
	}

	.icon-option {
		padding: 12px 8px;
		border: 1px solid #2a2a2a;
		border-radius: 6px;
		background: #1a1a1a;
		color: #ffffff;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		transition: all 0.2s ease;
		text-align: center;
	}

	:global(html:not(.dark)) .icon-option {
		border-color: #e5e7eb;
		background: #ffffff;
		color: #1f2937;
	}

	.icon-option:hover {
		border-color: var(--accent-color, #3b82f6);
		background: var(--accent-color-light, rgba(59, 130, 246, 0.1));
		transform: translateY(-1px);
	}

	.icon-option.selected {
		border-color: var(--accent-color, #3b82f6);
		background: var(--accent-color, #3b82f6);
		color: var(--accent-color-contrast, #ffffff);
	}

	.icon-label {
		font-size: 11px;
		font-weight: 500;
		line-height: 1.2;
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

	/* Custom icon styles removed - IconPicker only shows CoreUI brand icons */

	/* No outline-icon styles needed - using CoreUI brand icons only */

	/* Responsive styles for centered modal */
	@media (max-width: 768px) {
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
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
			gap: 6px;
			padding: 12px;
		}
		
		.icon-option {
			padding: 8px 6px;
		}
		
		.icon-label {
			font-size: 10px;
		}
	}

	.loading-state {
		padding: 32px 16px;
		text-align: center;
		color: #9ca3af;
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid #e5e7eb;
		border-top: 2px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 8px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.no-results {
		padding: 32px 16px;
		text-align: center;
		color: #9ca3af;
	}

	.no-results p {
		margin: 0;
		font-size: 14px;
	}
</style>
