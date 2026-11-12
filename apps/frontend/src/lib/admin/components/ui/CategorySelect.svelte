<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import type { ProjectCategory } from '$lib/admin/services/projectsService';

	interface Props {
		/** Flat list of categories; subcategories are nested under their parent via `parentId` */
		categories: ProjectCategory[];
		value?: string;
		id?: string;
		placeholder?: string;
	}

	let {
		categories,
		value = $bindable(''),
		id = 'category-select',
		placeholder = 'Select a category'
	}: Props = $props();

	interface Option {
		id: string;
		name: string;
		/** Text shown in the closed box, e.g. "Development › KDE Plugins" */
		fullName: string;
		isSub: boolean;
		isLastSub: boolean;
	}

	let open = $state(false);
	let activeIndex = $state(-1);
	let root: HTMLDivElement | undefined;

	const options = $derived.by(() => {
		const list: Option[] = [];
		for (const main of categories.filter((c) => !c.parentId)) {
			list.push({
				id: main.id,
				name: main.name,
				fullName: main.name,
				isSub: false,
				isLastSub: false
			});
			const subs = categories.filter((c) => c.parentId === main.id);
			subs.forEach((sub, i) =>
				list.push({
					id: sub.id,
					name: sub.name,
					fullName: `${main.name} › ${sub.name}`,
					isSub: true,
					isLastSub: i === subs.length - 1
				})
			);
		}
		return list;
	});

	const selected = $derived(options.find((o) => o.id === value));

	function openList() {
		activeIndex = Math.max(
			0,
			options.findIndex((o) => o.id === value)
		);
		open = true;
	}

	function choose(index: number) {
		const option = options[index];
		if (option) value = option.id;
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Tab') {
			open = false;
			return;
		}
		if (e.key === 'Escape') {
			if (open) {
				e.preventDefault();
				e.stopPropagation();
			}
			open = false;
			return;
		}
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			if (!open) return openList();
			const step = e.key === 'ArrowDown' ? 1 : -1;
			activeIndex = (activeIndex + step + options.length) % options.length;
		} else if (e.key === 'Home' || e.key === 'End') {
			if (!open) return;
			e.preventDefault();
			activeIndex = e.key === 'Home' ? 0 : options.length - 1;
		} else if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			if (open) choose(activeIndex);
			else openList();
		}
	}

	function handleWindowPointerDown(e: PointerEvent) {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}

	$effect(() => {
		if (open && activeIndex >= 0) {
			document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
		}
	});
</script>

<svelte:window onpointerdown={handleWindowPointerDown} />

<div class="category-select" bind:this={root}>
	<button
		{id}
		type="button"
		class="trigger"
		role="combobox"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls="{id}-list"
		aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
		onclick={() => (open ? (open = false) : openList())}
		onkeydown={handleKeydown}
	>
		<span class="trigger-text" class:placeholder={!selected}>
			{selected ? selected.fullName : placeholder}
		</span>
		<ChevronDown size={16} />
	</button>

	{#if open}
		<ul id="{id}-list" class="list" role="listbox">
			{#each options as option, index (option.id)}
				<li
					id="{id}-option-{index}"
					class="option"
					class:sub={option.isSub}
					class:main={!option.isSub}
					class:active={index === activeIndex}
					class:selected={option.id === value}
					role="option"
					tabindex="-1"
					aria-selected={option.id === value}
					onmouseenter={() => (activeIndex = index)}
					onclick={() => choose(index)}
					onkeydown={handleKeydown}
				>
					{#if option.isSub}
						<span class="branch" aria-hidden="true">{option.isLastSub ? '└─' : '├─'}</span>
					{/if}
					{option.name}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.category-select {
		position: relative;
		width: 100%;
	}

	.trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		width: 100%;
		padding: 12px 16px;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		color: var(--text-primary, #ffffff);
		font-family: inherit;
		font-size: 14px;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.trigger:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	.trigger-text.placeholder {
		color: var(--text-secondary, #a1a1aa);
	}

	.list {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 20;
		max-height: 280px;
		margin: 0;
		padding: 4px;
		overflow-y: auto;
		list-style: none;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
	}

	.option {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 14px;
		color: var(--text-primary, #ffffff);
		cursor: pointer;
	}

	.option.main {
		font-weight: 600;
	}

	.option.sub {
		padding-left: 28px;
		color: var(--text-secondary, #a1a1aa);
	}

	.option.active {
		background: var(--bg-tertiary, #3a3a3a);
		color: var(--text-primary, #ffffff);
	}

	.option.selected {
		color: var(--accent-on-surface, var(--accent-color, #6366f1));
	}

	.branch {
		color: var(--text-secondary, #a1a1aa);
		opacity: 0.7;
		white-space: pre;
	}
</style>
