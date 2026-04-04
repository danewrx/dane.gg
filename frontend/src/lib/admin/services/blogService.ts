export interface BlogPost {
	id: string;
	title: string;
	slug: string;
	content: string;
	thumbnail: string | null;
	published: boolean;
	publishedAt: string | null;
	createdAt: string;
	updatedAt: string;
	tags: BlogTag[];
}

export interface BlogTag {
	id: string;
	name: string;
}

export interface CreateBlogPost {
	title: string;
	slug: string;
	content: string;
	thumbnail?: string;
	published: boolean;
	tags: string[];
}

export interface UpdateBlogPost {
	title?: string;
	slug?: string;
	content?: string;
	thumbnail?: string;
	published?: boolean;
	tags?: string[];
}

const API_BASE = '/api/blog';

/**
 * Get all blog posts (admin)
 */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
	try {
		const response = await fetch(`${API_BASE}/admin/all`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to fetch blog posts');
		}

		const result = await response.json();
		return result.data || [];
	} catch (error) {
		console.error('Error fetching blog posts:', error);
		throw error;
	}
}

/**
 * Get a single blog post by ID (admin)
 */
export async function getBlogPost(id: string): Promise<BlogPost> {
	try {
		const response = await fetch(`${API_BASE}/admin/${id}`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to fetch blog post');
		}

		const result = await response.json();
		return result.data;
	} catch (error) {
		console.error('Error fetching blog post:', error);
		throw error;
	}
}

/**
 * Create a new blog post (admin)
 */
export async function createBlogPost(post: CreateBlogPost): Promise<BlogPost> {
	try {
		const response = await fetch(`${API_BASE}/admin`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(post)
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create blog post');
		}

		const result = await response.json();
		return result.data;
	} catch (error) {
		console.error('Error creating blog post:', error);
		throw error;
	}
}

/**
 * Update a blog post (admin)
 */
export async function updateBlogPost(id: string, post: UpdateBlogPost): Promise<BlogPost> {
	try {
		const response = await fetch(`${API_BASE}/admin/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify(post)
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to update blog post');
		}

		const result = await response.json();
		return result.data;
	} catch (error) {
		console.error('Error updating blog post:', error);
		throw error;
	}
}

/**
 * Delete a blog post (admin)
 */
export async function deleteBlogPost(id: string): Promise<void> {
	try {
		const response = await fetch(`${API_BASE}/admin/${id}`, {
			method: 'DELETE',
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to delete blog post');
		}
	} catch (error) {
		console.error('Error deleting blog post:', error);
		throw error;
	}
}

/**
 * Get all blog tags (admin)
 */
export async function getAllBlogTags(): Promise<BlogTag[]> {
	try {
		const response = await fetch(`${API_BASE}/admin/tags/all`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to fetch blog tags');
		}

		const result = await response.json();
		return result.data || [];
	} catch (error) {
		console.error('Error fetching blog tags:', error);
		throw error;
	}
}

/**
 * Get blog posts that use a specific tag (admin)
 */
export async function getPostsUsingBlogTag(tagId: string): Promise<{ id: string; title: string }[]> {
	try {
		const response = await fetch(`${API_BASE}/admin/tags/${tagId}/posts`, {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to fetch posts using tag');
		}

		const result = await response.json();
		return result.data || [];
	} catch (error) {
		console.error('Error fetching posts using blog tag:', error);
		throw error;
	}
}

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}

