<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Loader2, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Edit2, Save, X } from 'lucide-svelte';

	interface Skill {
		id: string;
		name: string;
		level: number;
		categoryId: string;
		displayOrder: number;
	}

	interface SkillCategory {
		id: string;
		name: string;
		color: string;
		displayOrder: number;
		skills: Skill[];
	}

	let categories = $state<SkillCategory[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);
	let draggedSkillIndex = $state<number | null>(null);
	let dragOverSkillIndex = $state<number | null>(null);
	let draggedSkillCategoryId = $state<string | null>(null);
	
	// New category form
	let showNewCategoryForm = $state(false);
	let newCategoryName = $state('');
	let newCategoryColor = $state('#6366f1');
	
	// New skill form
	let addingSkillToCategoryId = $state<string | null>(null);
	let newSkillName = $state('');
	let newSkillLevel = $state(50);
	
	// Editing
	let editingCategoryId = $state<string | null>(null);
	let editingCategoryName = $state('');
	let editingCategoryColor = $state('');
	
	// Preview colors
	let previewColors = $state<Record<string, string>>({});
	
	let editingSkillId = $state<string | null>(null);
	let editingSkillName = $state('');
	let editingSkillLevel = $state(50);

	// Expanded categories
	let expandedCategories = $state<Set<string>>(new Set());

	onMount(async () => {
		await loadSkills();
	});

	async function loadSkills() {
		try {
			isLoading = true;
			const response = await fetch('/api/skills', {
				credentials: 'include'
			});
			
			if (response.ok) {
				const result = await response.json();
				categories = result.data || [];
				expandedCategories = new Set(categories.map(c => c.id));
			}
		} catch (error) {
			console.error('Error loading skills:', error);
			toast.error('Failed to load skills');
		} finally {
			isLoading = false;
		}
	}

	function toggleCategory(categoryId: string) {
		const newSet = new Set(expandedCategories);
		if (newSet.has(categoryId)) {
			newSet.delete(categoryId);
		} else {
			newSet.add(categoryId);
		}
		expandedCategories = newSet;
	}

	async function createCategory() {
		if (!newCategoryName.trim()) {
			toast.error('Category name is required');
			return;
		}

		try {
			isSaving = true;
			const response = await fetch('/api/skills/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					name: newCategoryName.trim(),
					color: newCategoryColor
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create category');
			}

			toast.success('Category created');
			newCategoryName = '';
			newCategoryColor = '#6366f1';
			showNewCategoryForm = false;
			await loadSkills();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			isSaving = false;
		}
	}

	async function updateCategory(categoryId: string) {
		if (!editingCategoryName.trim()) {
			toast.error('Category name is required');
			return;
		}

		try {
			isSaving = true;
			const response = await fetch(`/api/skills/categories/${categoryId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					name: editingCategoryName.trim(),
					color: editingCategoryColor
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update category');
			}

			toast.success('Category updated');
			const { [categoryId]: _, ...rest } = previewColors;
			previewColors = rest;
			editingCategoryId = null;
			await loadSkills();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			isSaving = false;
		}
	}

	async function deleteCategory(categoryId: string) {
		if (!confirm('Are you sure you want to delete this category and all its skills?')) {
			return;
		}

		try {
			const response = await fetch(`/api/skills/categories/${categoryId}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to delete category');
			}

			toast.success('Category deleted');
			await loadSkills();
		} catch (error) {
			toast.error('Failed to delete category');
		}
	}

	function startEditingCategory(category: SkillCategory) {
		editingCategoryId = category.id;
		editingCategoryName = category.name;
		editingCategoryColor = category.color || '#6366f1';
		previewColors = { ...previewColors, [category.id]: category.color || '#6366f1' };
	}

	function cancelEditingCategory() {
		if (editingCategoryId) {
			const { [editingCategoryId]: _, ...rest } = previewColors;
			previewColors = rest;
		}
		editingCategoryId = null;
		editingCategoryName = '';
		editingCategoryColor = '';
	}
	
	function updatePreviewColor(categoryId: string, color: string) {
		previewColors = { ...previewColors, [categoryId]: color };
		editingCategoryColor = color;
	}
	
	function getCategoryColor(category: SkillCategory): string {
		return previewColors[category.id] || category.color || '#6366f1';
	}

	// Skill operations
	async function createSkill(categoryId: string) {
		if (!newSkillName.trim()) {
			toast.error('Skill name is required');
			return;
		}

		try {
			isSaving = true;
			const response = await fetch('/api/skills/skills', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					name: newSkillName.trim(),
					level: newSkillLevel,
					categoryId
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create skill');
			}

			toast.success('Skill added');
			newSkillName = '';
			newSkillLevel = 50;
			addingSkillToCategoryId = null;
			await loadSkills();
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			isSaving = false;
		}
	}

	async function updateSkill(skillId: string) {
		if (!editingSkillName.trim()) {
			toast.error('Skill name is required');
			return;
		}

		try {
			isSaving = true;
			const response = await fetch(`/api/skills/skills/${skillId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					name: editingSkillName.trim(),
					level: editingSkillLevel
				})
			});

			if (!response.ok) {
				throw new Error('Failed to update skill');
			}

			toast.success('Skill updated');
			editingSkillId = null;
			await loadSkills();
		} catch (error) {
			toast.error('Failed to update skill');
		} finally {
			isSaving = false;
		}
	}

	async function deleteSkill(skillId: string) {
		if (!confirm('Are you sure you want to delete this skill?')) {
			return;
		}

		try {
			const response = await fetch(`/api/skills/skills/${skillId}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Failed to delete skill');
			}

			toast.success('Skill deleted');
			await loadSkills();
		} catch (error) {
			toast.error('Failed to delete skill');
		}
	}

	function startEditingSkill(skill: Skill) {
		editingSkillId = skill.id;
		editingSkillName = skill.name;
		editingSkillLevel = skill.level;
	}

	function cancelEditingSkill() {
		editingSkillId = null;
		editingSkillName = '';
		editingSkillLevel = 50;
	}

	function startAddingSkill(categoryId: string) {
		addingSkillToCategoryId = categoryId;
		newSkillName = '';
		newSkillLevel = 50;
	}

	function cancelAddingSkill() {
		addingSkillToCategoryId = null;
		newSkillName = '';
		newSkillLevel = 50;
	}

	function handleDragStart(index: number) {
		if (editingCategoryId || showNewCategoryForm) return;
		draggedIndex = index;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (editingCategoryId || showNewCategoryForm || draggedIndex === null || draggedIndex === index) return;
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	async function handleDrop(e: DragEvent, index: number) {
		e.preventDefault();
		if (editingCategoryId || showNewCategoryForm || draggedIndex === null || draggedIndex === index) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}

		const items = [...categories];
		const [draggedItem] = items.splice(draggedIndex, 1);
		items.splice(index, 0, draggedItem);

		try {
			const categoriesToUpdate = items.map((item, idx) => ({
				id: item.id,
				displayOrder: idx
			}));

			const response = await fetch('/api/skills/categories/order', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({ categories: categoriesToUpdate })
			});

			const data = await response.json();

			if (data.success) {
				await loadSkills();
			} else {
				toast.error('Failed to reorder categories', {
					description: data.error
				});
			}
		} catch (error) {
			console.error('Error reordering categories:', error);
			toast.error('Error reordering categories', {
				description: 'An unexpected error occurred. Please try again.'
			});
		} finally {
			draggedIndex = null;
			dragOverIndex = null;
		}
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleSkillDragStart(categoryId: string, skillIndex: number) {
		if (editingSkillId || addingSkillToCategoryId) return;
		draggedSkillIndex = skillIndex;
		draggedSkillCategoryId = categoryId;
	}

	function handleSkillDragOver(e: DragEvent, categoryId: string, skillIndex: number) {
		e.preventDefault();
		if (editingSkillId || addingSkillToCategoryId || draggedSkillIndex === null || draggedSkillCategoryId !== categoryId || draggedSkillIndex === skillIndex) return;
		dragOverSkillIndex = skillIndex;
	}

	function handleSkillDragLeave() {
		dragOverSkillIndex = null;
	}

	async function handleSkillDrop(e: DragEvent, categoryId: string, skillIndex: number) {
		e.preventDefault();
		if (editingSkillId || addingSkillToCategoryId || draggedSkillIndex === null || draggedSkillCategoryId !== categoryId || draggedSkillIndex === skillIndex) {
			draggedSkillIndex = null;
			dragOverSkillIndex = null;
			draggedSkillCategoryId = null;
			return;
		}

		const category = categories.find(cat => cat.id === categoryId);
		if (!category || !category.skills) {
			draggedSkillIndex = null;
			dragOverSkillIndex = null;
			draggedSkillCategoryId = null;
			return;
		}

		const skills = [...category.skills];
		const [draggedSkill] = skills.splice(draggedSkillIndex, 1);
		skills.splice(skillIndex, 0, draggedSkill);

		try {
			const skillsToUpdate = skills.map((skill, idx) => ({
				id: skill.id,
				displayOrder: idx
			}));

			const response = await fetch('/api/skills/skills/order', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify({ skills: skillsToUpdate })
			});

			const data = await response.json();

			if (data.success) {
				await loadSkills();
			} else {
				toast.error('Failed to reorder skills', {
					description: data.error
				});
			}
		} catch (error) {
			console.error('Error reordering skills:', error);
			toast.error('Error reordering skills', {
				description: 'An unexpected error occurred. Please try again.'
			});
		} finally {
			draggedSkillIndex = null;
			dragOverSkillIndex = null;
			draggedSkillCategoryId = null;
		}
	}

	function handleSkillDragEnd() {
		draggedSkillIndex = null;
		dragOverSkillIndex = null;
		draggedSkillCategoryId = null;
	}
</script>

<div class="skills-settings">
	<div class="settings-description">
		<p>Manage skill categories and individual skills that appear on your About page. Each skill has a proficiency level from 0-100%.</p>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<Loader2 size={24} class="spin" />
			<span>Loading skills...</span>
		</div>
	{:else}
		<div class="categories-list">
			{#each categories as category, index (category.id)}
				<div 
					class="category-card"
					class:dragging={draggedIndex === index}
					class:drag-over={dragOverIndex === index}
					class:not-draggable={editingCategoryId !== null || showNewCategoryForm || editingSkillId !== null || addingSkillToCategoryId !== null}
					role="button"
					tabindex="0"
					draggable={editingCategoryId === null && !showNewCategoryForm && editingSkillId === null && addingSkillToCategoryId === null}
					ondragstart={() => handleDragStart(index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, index)}
					ondragend={handleDragEnd}
				>
					<div class="category-header">
						{#if editingCategoryId === null && !showNewCategoryForm && editingSkillId === null && addingSkillToCategoryId === null}
							<div class="drag-handle" title="Drag to reorder">
								<GripVertical size={18} />
							</div>
						{/if}
						<button 
							class="expand-toggle"
							onclick={() => toggleCategory(category.id)}
						>
							{#if expandedCategories.has(category.id)}
								<ChevronUp size={18} />
							{:else}
								<ChevronDown size={18} />
							{/if}
						</button>
						
						{#if editingCategoryId === category.id}
							<div class="editing-category">
								<input
									type="text"
									class="edit-input"
									bind:value={editingCategoryName}
									placeholder="Category name"
								/>
								<input
									type="color"
									class="color-input"
									value={editingCategoryColor}
									oninput={(e) => updatePreviewColor(category.id, (e.target as HTMLInputElement).value)}
								/>
								<button class="icon-btn save" onclick={() => updateCategory(category.id)} disabled={isSaving}>
									<Save size={16} />
								</button>
								<button class="icon-btn cancel" onclick={cancelEditingCategory}>
									<X size={16} />
								</button>
							</div>
						{:else}
							<div class="category-info">
								<div 
									class="category-color-dot" 
									style="background: {getCategoryColor(category)}"
								></div>
								<span class="category-name">{category.name}</span>
								<span class="skill-count">({category.skills?.length || 0} skills)</span>
							</div>
							<div class="category-actions">
								<button class="icon-btn edit" onclick={() => startEditingCategory(category)}>
									<Edit2 size={16} />
								</button>
								<button class="icon-btn delete" onclick={() => deleteCategory(category.id)}>
									<Trash2 size={16} />
								</button>
							</div>
						{/if}
					</div>

					{#if expandedCategories.has(category.id)}
						<div class="skills-list">
							{#if category.skills && category.skills.length > 0}
								{#each category.skills as skill, skillIndex (skill.id)}
									<div 
										class="skill-item"
										class:dragging={draggedSkillIndex === skillIndex && draggedSkillCategoryId === category.id}
										class:drag-over={dragOverSkillIndex === skillIndex && draggedSkillCategoryId === category.id}
										class:not-draggable={editingSkillId !== null || addingSkillToCategoryId !== null}
										role="button"
										tabindex="0"
										draggable={editingSkillId === null && addingSkillToCategoryId === null}
										ondragstart={() => handleSkillDragStart(category.id, skillIndex)}
										ondragover={(e) => handleSkillDragOver(e, category.id, skillIndex)}
										ondragleave={handleSkillDragLeave}
										ondrop={(e) => handleSkillDrop(e, category.id, skillIndex)}
										ondragend={handleSkillDragEnd}
									>
										{#if editingSkillId === null && addingSkillToCategoryId === null}
											<div class="skill-drag-handle" title="Drag to reorder">
												<GripVertical size={16} />
											</div>
										{/if}
										{#if editingSkillId === skill.id}
											<div class="editing-skill">
												<input
													type="text"
													class="edit-input skill-name-input"
													bind:value={editingSkillName}
													placeholder="Skill name"
												/>
												<div class="level-input-group">
													<input
														type="range"
														class="level-range"
														bind:value={editingSkillLevel}
														min="0"
														max="100"
													ondragstart={(e) => e.stopPropagation()}
													onmousedown={(e) => e.stopPropagation()}
													/>
													<span class="level-value">{editingSkillLevel}%</span>
												</div>
												<button class="icon-btn save" onclick={() => updateSkill(skill.id)} disabled={isSaving}>
													<Save size={16} />
												</button>
												<button class="icon-btn cancel" onclick={cancelEditingSkill}>
													<X size={16} />
												</button>
											</div>
										{:else}
											<div class="skill-info">
												<span class="skill-name">{skill.name}</span>
												<div class="skill-bar-wrapper">
													<div 
														class="skill-bar" 
														style="width: {skill.level}%; background: {getCategoryColor(category)}"
													></div>
												</div>
												<span class="skill-level">{skill.level}%</span>
											</div>
											<div class="skill-actions">
												<button class="icon-btn edit" onclick={() => startEditingSkill(skill)}>
													<Edit2 size={14} />
												</button>
												<button class="icon-btn delete" onclick={() => deleteSkill(skill.id)}>
													<Trash2 size={14} />
												</button>
											</div>
										{/if}
									</div>
								{/each}
							{:else}
								<p class="no-skills">No skills in this category yet</p>
							{/if}

							{#if addingSkillToCategoryId === category.id}
								<div class="add-skill-form">
									<input
										type="text"
										class="edit-input skill-name-input"
										bind:value={newSkillName}
										placeholder="New skill name"
									/>
									<div class="level-input-group">
										<input
											type="range"
											class="level-range"
											bind:value={newSkillLevel}
											min="0"
											max="100"
											ondragstart={(e) => e.stopPropagation()}
											onmousedown={(e) => e.stopPropagation()}
										/>
										<span class="level-value">{newSkillLevel}%</span>
									</div>
									<button class="icon-btn save" onclick={() => createSkill(category.id)} disabled={isSaving}>
										<Save size={16} />
									</button>
									<button class="icon-btn cancel" onclick={cancelAddingSkill}>
										<X size={16} />
									</button>
								</div>
							{:else}
								<button class="add-skill-btn" onclick={() => startAddingSkill(category.id)}>
									<Plus size={16} />
									Add Skill
								</button>
							{/if}
						</div>
					{/if}
				</div>
			{/each}

			{#if showNewCategoryForm}
				<div class="new-category-form">
					<h3>New Category</h3>
					<div class="form-row">
						<input
							type="text"
							class="edit-input"
							bind:value={newCategoryName}
							placeholder="Category name"
						/>
						<input
							type="color"
							class="color-input"
							bind:value={newCategoryColor}
						/>
					</div>
					<div class="form-actions">
						<button class="save-btn" onclick={createCategory} disabled={isSaving}>
							{#if isSaving}
								<Loader2 size={16} class="spin" />
							{/if}
							Create Category
						</button>
						<button class="cancel-btn" onclick={() => { showNewCategoryForm = false; newCategoryName = ''; }}>
							Cancel
						</button>
					</div>
				</div>
			{:else}
				<button class="add-category-btn" onclick={() => showNewCategoryForm = true}>
					<Plus size={18} />
					Add Category
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.skills-settings {
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

	.categories-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.category-card {
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		overflow: hidden;
		cursor: move;
		transition: all 0.2s ease;
	}

	.category-card.not-draggable {
		cursor: default;
	}

	.category-card.dragging {
		opacity: 0.5;
		cursor: grabbing;
	}

	.category-card.drag-over {
		border-color: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}

	.category-card:not(.dragging):not(.not-draggable):hover {
		border-color: var(--accent-color, #6366f1);
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

	.category-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: var(--bg-tertiary, #1f1f1f);
		border-bottom: 1px solid var(--border-color, #3a3a3a);
	}

	.expand-toggle {
		background: none;
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

	.expand-toggle:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-primary, #ffffff);
	}

	.category-info {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
	}

	.category-color-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.category-name {
		font-weight: 600;
		color: var(--text-primary, #ffffff);
		font-size: 15px;
	}

	.skill-count {
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
	}

	.category-actions {
		display: flex;
		gap: 8px;
	}

	.editing-category {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
	}

	.edit-input {
		background: var(--bg-primary, #1a1a1a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		padding: 8px 12px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
		flex: 1;
	}

	.edit-input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.color-input {
		width: 40px;
		height: 36px;
		padding: 2px;
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 6px;
		background: var(--bg-primary, #1a1a1a);
		cursor: pointer;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		background: transparent;
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
		color: var(--accent-color, #6366f1);
	}

	.icon-btn.save:hover {
		background: rgba(99, 102, 241, 0.2);
	}

	.icon-btn.cancel {
		color: var(--text-secondary, #a1a1aa);
	}

	.icon-btn.cancel:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.skills-list {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.skill-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: var(--bg-primary, #1a1a1a);
		border-radius: 6px;
		border: 1px solid var(--border-color, #3a3a3a);
		cursor: move;
		transition: all 0.2s ease;
	}

	.skill-item.not-draggable {
		cursor: default;
	}

	.skill-item.dragging {
		opacity: 0.5;
		cursor: grabbing;
	}

	.skill-item.drag-over {
		border-color: var(--accent-color, #6366f1);
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
	}

	.skill-item:not(.dragging):not(.not-draggable):hover {
		border-color: var(--accent-color, #6366f1);
	}

	.skill-drag-handle {
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

	.skill-drag-handle:hover {
		color: var(--text-primary, #ffffff);
		background: rgba(255, 255, 255, 0.05);
	}

	.skill-info {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
	}

	.skill-name {
		min-width: 140px;
		color: var(--text-primary, #ffffff);
		font-size: 14px;
	}

	.skill-bar-wrapper {
		flex: 1;
		height: 8px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		overflow: hidden;
	}

	.skill-bar {
		height: 100%;
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.skill-level {
		min-width: 45px;
		text-align: right;
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
		font-weight: 500;
	}

	.skill-actions {
		display: flex;
		gap: 4px;
	}

	.editing-skill,
	.add-skill-form {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		width: 100%;
	}

	.skill-name-input {
		min-width: 140px;
		max-width: 200px;
	}

	.level-input-group {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
	}

	.level-range {
		flex: 1;
		height: 8px;
		-webkit-appearance: none;
		appearance: none;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		outline: none;
	}

	.level-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		background: var(--accent-color, #6366f1);
		border-radius: 50%;
		cursor: pointer;
	}

	.level-range::-moz-range-thumb {
		width: 18px;
		height: 18px;
		background: var(--accent-color, #6366f1);
		border-radius: 50%;
		cursor: pointer;
		border: none;
	}

	.level-value {
		min-width: 45px;
		text-align: right;
		color: var(--text-secondary, #a1a1aa);
		font-size: 13px;
		font-weight: 500;
	}

	.no-skills {
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		text-align: center;
		padding: 16px;
		margin: 0;
	}

	.add-skill-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 16px;
		background: transparent;
		border: 1px dashed var(--border-color, #3a3a3a);
		border-radius: 6px;
		color: var(--text-secondary, #a1a1aa);
		font-size: 14px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-skill-btn:hover {
		border-color: var(--accent-color, #6366f1);
		color: var(--accent-color, #6366f1);
		background: rgba(99, 102, 241, 0.1);
	}

	.new-category-form {
		background: var(--bg-secondary, #2a2a2a);
		border: 1px solid var(--border-color, #3a3a3a);
		border-radius: 8px;
		padding: 20px;
	}

	.new-category-form h3 {
		margin: 0 0 16px 0;
		color: var(--text-primary, #ffffff);
		font-size: 16px;
		font-weight: 600;
	}

	.form-row {
		display: flex;
		gap: 12px;
		margin-bottom: 16px;
	}

	.form-actions {
		display: flex;
		gap: 12px;
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

	.add-category-btn {
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

	.add-category-btn:hover {
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
