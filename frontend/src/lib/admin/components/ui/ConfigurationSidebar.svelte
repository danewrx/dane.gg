<script lang="ts">
	import { 
		CloudRain,
		Link,
		MessageSquare,
		Server,
		Twitter,
		ChevronRight,
		Globe,
		Home,
		User,
		FileText,
		Zap
	} from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	export interface ConfigurationCategory {
		id: string;
		title: string;
		description: string;
		icon: ComponentType;
		color: string;
		bgColor: string;
		borderColor: string;
		iconBgColor: string;
		path: string;
		section: 'general' | 'home' | 'about';
	}

	interface Props {
		categories: ConfigurationCategory[];
		selectedCategoryId: string | null;
		onItemClick: (category: ConfigurationCategory) => void;
	}

	let { categories, selectedCategoryId, onItemClick }: Props = $props();

	// Group categories by section
	let groupedCategories = $derived({
		general: categories.filter(c => c.section === 'general'),
		home: categories.filter(c => c.section === 'home'),
		about: categories.filter(c => c.section === 'about')
	});
</script>

<aside class="settings-sidebar">
	<nav class="sidebar-nav">
		{#if groupedCategories.general.length > 0}
			<div class="section-header">
				<Globe size={14} />
				<span>General</span>
			</div>
			<div class="menu-group">
				{#each groupedCategories.general as category, index (category.id)}
					{@const isFirst = index === 0}
					{@const isLast = index === groupedCategories.general.length - 1}
					{@const isOnly = groupedCategories.general.length === 1}
					<button 
						class="sidebar-item"
						class:active={selectedCategoryId === category.id}
						class:first={isFirst || isOnly}
						class:last={isLast || isOnly}
						onclick={() => onItemClick(category)}
					>
						<div 
							class="sidebar-icon"
							class:active={selectedCategoryId === category.id}
							style="color: {selectedCategoryId === category.id ? 'var(--accent-color, #6366f1)' : category.iconBgColor};"
						>
							{#if category.icon === CloudRain}
								<CloudRain size={20} stroke-width={1.5} />
							{:else if category.icon === Link}
								<Link size={20} stroke-width={1.5} />
							{:else if category.icon === MessageSquare}
								<MessageSquare size={20} stroke-width={1.5} />
							{:else if category.icon === Server}
								<Server size={20} stroke-width={1.5} />
							{:else if category.icon === Twitter}
								<Twitter size={20} stroke-width={1.5} />
							{/if}
						</div>
						<span class="sidebar-title">{category.title}</span>
						<div class="sidebar-chevron">
							<ChevronRight size={18} />
						</div>
					</button>
				{/each}
			</div>
		{/if}

		{#if groupedCategories.home.length > 0}
			<div class="section-header">
				<Home size={14} />
				<span>Home Page</span>
			</div>
			<div class="menu-group">
				{#each groupedCategories.home as category, index (category.id)}
					{@const isFirst = index === 0}
					{@const isLast = index === groupedCategories.home.length - 1}
					{@const isOnly = groupedCategories.home.length === 1}
					<button 
						class="sidebar-item"
						class:active={selectedCategoryId === category.id}
						class:first={isFirst || isOnly}
						class:last={isLast || isOnly}
						onclick={() => onItemClick(category)}
					>
						<div 
							class="sidebar-icon"
							class:active={selectedCategoryId === category.id}
							style="color: {selectedCategoryId === category.id ? 'var(--accent-color, #6366f1)' : category.iconBgColor};"
						>
							{#if category.icon === CloudRain}
								<CloudRain size={20} stroke-width={1.5} />
							{:else if category.icon === Link}
								<Link size={20} stroke-width={1.5} />
							{:else if category.icon === MessageSquare}
								<MessageSquare size={20} stroke-width={1.5} />
							{:else if category.icon === Server}
								<Server size={20} stroke-width={1.5} />
							{:else if category.icon === Twitter}
								<Twitter size={20} stroke-width={1.5} />
							{:else if category.icon === FileText}
								<FileText size={20} stroke-width={1.5} />
							{/if}
						</div>
						<span class="sidebar-title">{category.title}</span>
						<div class="sidebar-chevron">
							<ChevronRight size={18} />
						</div>
					</button>
				{/each}
			</div>
		{/if}

		{#if groupedCategories.about.length > 0}
			<div class="section-header">
				<User size={14} />
				<span>About Page</span>
			</div>
			<div class="menu-group">
				{#each groupedCategories.about as category, index (category.id)}
					{@const isFirst = index === 0}
					{@const isLast = index === groupedCategories.about.length - 1}
					{@const isOnly = groupedCategories.about.length === 1}
					<button 
						class="sidebar-item"
						class:active={selectedCategoryId === category.id}
						class:first={isFirst || isOnly}
						class:last={isLast || isOnly}
						onclick={() => onItemClick(category)}
					>
						<div 
							class="sidebar-icon"
							class:active={selectedCategoryId === category.id}
							style="color: {selectedCategoryId === category.id ? 'var(--accent-color, #6366f1)' : category.iconBgColor};"
						>
							{#if category.icon === FileText}
								<FileText size={20} stroke-width={1.5} />
							{:else if category.icon === Zap}
								<Zap size={20} stroke-width={1.5} />
							{/if}
						</div>
						<span class="sidebar-title">{category.title}</span>
						<div class="sidebar-chevron">
							<ChevronRight size={18} />
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</nav>
</aside>

<style>
	.settings-sidebar {
		width: 320px;
		min-width: 320px;
		background: transparent;
		border-right: 1px solid var(--border-color, #3a3a3a);
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	@media (max-width: 1023px) {
		.settings-sidebar {
			width: 100%;
			min-width: 100%;
			border-right: none;
		}
	}

	.sidebar-nav {
		flex: 1;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		box-sizing: border-box;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px 4px 12px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.section-header:not(:first-child) {
		margin-top: 8px;
	}

	.section-header :global(svg) {
		opacity: 0.7;
	}

	.menu-group {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.1);
		width: 100%;
		box-sizing: border-box;
	}

	.sidebar-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: transparent;
		border: none;
		border-radius: 0;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		color: var(--text-secondary, #a1a1aa);
		position: relative;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.sidebar-item:last-child {
		border-bottom: none;
	}

	.sidebar-item.first {
		border-top-left-radius: 12px;
		border-top-right-radius: 12px;
	}

	.sidebar-item.last {
		border-bottom-left-radius: 12px;
		border-bottom-right-radius: 12px;
	}

	.sidebar-item:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.sidebar-item.active {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
		border-left: 3px solid var(--accent-color, #6366f1);
	}

	.sidebar-icon {
		width: 36px;
		height: 36px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: all 0.2s ease;
		background: var(--bg-tertiary, #3a3a3a);
		border: none;
		box-shadow: none;
	}

	:global(html:not(.dark)) .sidebar-icon {
		background: rgba(0, 0, 0, 0.05);
	}

	.sidebar-icon.active {
		background: var(--bg-tertiary, #3a3a3a);
	}

	:global(html:not(.dark)) .sidebar-icon.active {
		background: rgba(0, 0, 0, 0.05);
	}

	.sidebar-title {
		font-size: 15px;
		font-weight: 500;
		line-height: 1.4;
		color: inherit;
		flex: 1;
		text-align: left;
	}

	.sidebar-item.active .sidebar-title {
		color: var(--text-primary, #ffffff);
		font-weight: 600;
	}

	.sidebar-chevron {
		color: var(--text-secondary, #a1a1aa);
		flex-shrink: 0;
		opacity: 0.5;
		display: none;
	}

	@media (max-width: 1023px) {
		.sidebar-chevron {
			display: block;
		}
	}
</style>

