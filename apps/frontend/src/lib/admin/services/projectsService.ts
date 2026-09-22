import { logger } from '$lib/logger';
export interface ProjectTag {
	id: string;
	title: string;
	color: string;
	categoryId: string | null;
	category: {
		id: string;
		name: string;
		displayOrder?: number;
		createdAt: string;
	} | null;
}

export interface ProjectCategory {
	id: string;
	name: string;
	displayOrder: number;
	createdAt: string;
}

export interface Project {
	id: string;
	title: string;
	description: string;
	categoryId: string;
	featured: boolean;
	imageUrl: string | null;
	active: string;
	published: boolean;
	projectUrl: string | null;
	projectText: string;
	projectIcon: string | null;
	repoUrl: string | null;
	repoText: string;
	repoIcon: string | null;
	logoUrl: string | null;
	logoBgColor: string | null;
	logoBorder: boolean;
	displayOrder: number;
	createdAt: string;
	updatedAt: string;
	tags: ProjectTag[];
	category: ProjectCategory;
}

export interface CreateProject {
	title: string;
	description: string;
	categoryId: string;
	imageUrl?: string;
	active?: string;
	published?: boolean;
	projectUrl?: string;
	projectText?: string;
	projectIcon?: string | null;
	repoUrl?: string;
	repoText?: string;
	repoIcon?: string | null;
	logoUrl?: string | null;
	logoBgColor?: string | null;
	logoBorder?: boolean;
	displayOrder?: number;
	featured?: boolean;
	tagIds?: string[];
}

export interface UpdateProject {
	title?: string;
	description?: string;
	categoryId?: string;
	imageUrl?: string;
	active?: string;
	published?: boolean;
	projectUrl?: string;
	projectText?: string;
	projectIcon?: string | null;
	repoUrl?: string;
	repoText?: string;
	repoIcon?: string | null;
	logoUrl?: string | null;
	logoBgColor?: string | null;
	logoBorder?: boolean;
	displayOrder?: number;
	featured?: boolean;
	tagIds?: string[];
	createdAt?: string;
}

const API_BASE = '/api/projects';

/**
 * Get all projects (admin)
 */
export async function getAllProjects(): Promise<Project[]> {
	try {
		const response = await fetch(`${API_BASE}/admin/all`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to fetch projects');
		}

		const result = await response.json();
		return result.data || [];
	} catch (error) {
		logger.error('Error fetching projects:', error);
		throw error;
	}
}

/**
 * Get a single project by ID (admin)
 */
export async function getProject(id: string): Promise<Project> {
	try {
		const response = await fetch(`${API_BASE}/admin/${id}`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to fetch project');
		}

		const result = await response.json();
		return result.data;
	} catch (error) {
		logger.error('Error fetching project:', error);
		throw error;
	}
}

/**
 * Create a new project (admin)
 */
export async function createProject(project: CreateProject): Promise<Project> {
	try {
		const response = await fetch(`${API_BASE}/admin`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(project)
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create project');
		}

		const result = await response.json();
		return result.data;
	} catch (error) {
		logger.error('Error creating project:', error);
		throw error;
	}
}

/**
 * Update a project (admin)
 */
export async function updateProject(id: string, project: UpdateProject): Promise<Project> {
	try {
		const response = await fetch(`${API_BASE}/admin/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(project)
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update project');
		}

		const result = await response.json();
		return result.data;
	} catch (error) {
		logger.error('Error updating project:', error);
		throw error;
	}
}

/**
 * Delete a project (admin)
 */
export async function deleteProject(id: string): Promise<void> {
	try {
		const response = await fetch(`${API_BASE}/admin/${id}`, {
			method: 'DELETE',
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to delete project');
		}
	} catch (error) {
		logger.error('Error deleting project:', error);
		throw error;
	}
}

/**
 * Get all project categories (admin)
 */
export async function getAllProjectCategories(): Promise<ProjectCategory[]> {
	try {
		const response = await fetch(`${API_BASE}/admin/categories/all`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to fetch project categories');
		}

		const result = await response.json();
		return result.data || [];
	} catch (error) {
		logger.error('Error fetching project categories:', error);
		throw error;
	}
}

/**
 * Create a new project category
 */
export async function createProjectCategory(name: string): Promise<ProjectCategory> {
	try {
		const response = await fetch(`${API_BASE}/admin/categories`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ name })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create category');
		}

		const result = await response.json();
		return result.data;
	} catch (error) {
		logger.error('Error creating project category:', error);
		throw error;
	}
}

/**
 * Update a project category
 */
export async function updateProjectCategory(
	id: string,
	name: string,
	displayOrder?: number
): Promise<ProjectCategory> {
	try {
		const response = await fetch(`${API_BASE}/admin/categories/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ name, displayOrder })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update category');
		}

		const result = await response.json();
		return result.data;
	} catch (error) {
		logger.error('Error updating project category:', error);
		throw error;
	}
}

/**
 * Delete a project category
 */
export async function deleteProjectCategory(id: string): Promise<void> {
	try {
		const response = await fetch(`${API_BASE}/admin/categories/${id}`, {
			method: 'DELETE',
			credentials: 'include'
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to delete category');
		}
	} catch (error) {
		logger.error('Error deleting project category:', error);
		throw error;
	}
}

/**
 * Update project display order
 */
export async function updateProjectOrder(
	projectOrders: { id: string; displayOrder: number }[]
): Promise<void> {
	try {
		const response = await fetch(`${API_BASE}/admin/order`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ projectOrders })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update project order');
		}
	} catch (error) {
		logger.error('Error updating project order:', error);
		throw error;
	}
}

/**
 * Update category display order
 */
export async function updateCategoryOrder(
	categoryOrders: { id: string; displayOrder: number }[]
): Promise<void> {
	try {
		const response = await fetch(`${API_BASE}/admin/categories/order`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ categoryOrders })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update category order');
		}
	} catch (error) {
		logger.error('Error updating category order:', error);
		throw error;
	}
}

/**
 * Get all project tags (admin)
 */
export async function getAllProjectTags(): Promise<ProjectTag[]> {
	try {
		const response = await fetch(`${API_BASE}/admin/tags/all`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to fetch project tags');
		}

		const result = await response.json();
		return result.data || [];
	} catch (error) {
		logger.error('Error fetching project tags:', error);
		throw error;
	}
}

/**
 * Create a new project tag
 */
export async function createProjectTag(
	title: string,
	color: string,
	categoryId: string | null = null
): Promise<ProjectTag> {
	try {
		const response = await fetch(`${API_BASE}/admin/tags`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ title, color, categoryId })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create tag');
		}

		const result = await response.json();
		return result.data;
	} catch (error) {
		logger.error('Error creating project tag:', error);
		throw error;
	}
}

/**
 * Update a project tag
 */
export async function updateProjectTag(
	id: string,
	title: string,
	color: string,
	categoryId: string | null = null
): Promise<ProjectTag> {
	try {
		const response = await fetch(`${API_BASE}/admin/tags/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ title, color, categoryId })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update tag');
		}

		const result = await response.json();
		return result.data;
	} catch (error) {
		logger.error('Error updating project tag:', error);
		throw error;
	}
}

/**
 * Get projects using a specific tag (admin)
 */
export async function getProjectsUsingTag(tagId: string): Promise<{ id: string; title: string }[]> {
	try {
		const response = await fetch(`${API_BASE}/admin/tags/${tagId}/projects`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to fetch projects using tag');
		}

		const result = await response.json();
		return result.data || [];
	} catch (error) {
		logger.error('Error fetching projects using tag:', error);
		throw error;
	}
}

/**
 * Delete a project tag
 */
export async function deleteProjectTag(id: string): Promise<void> {
	try {
		const response = await fetch(`${API_BASE}/admin/tags/${id}`, {
			method: 'DELETE',
			credentials: 'include'
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to delete tag');
		}
	} catch (error) {
		logger.error('Error deleting project tag:', error);
		throw error;
	}
}
