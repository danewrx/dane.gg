export interface ProjectTag {
	id: string;
	title: string;
	color: string;
	categoryId: string | null;
	category: {
		id: string;
		name: string;
		createdAt: string;
	} | null;
}

export interface ProjectCategory {
	id: string;
	name: string;
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
	repoUrl: string | null;
	repoText: string;
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
	repoUrl?: string;
	repoText?: string;
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
	repoUrl?: string;
	repoText?: string;
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
		console.error('Error fetching projects:', error);
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
		console.error('Error fetching project:', error);
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
		console.error('Error creating project:', error);
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
		console.error('Error updating project:', error);
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
		console.error('Error deleting project:', error);
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
		console.error('Error fetching project categories:', error);
		throw error;
	}
}

