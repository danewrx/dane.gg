import { logger } from '$lib/logger';

export interface ThemeCategory {
	id: string;
	name: string;
	displayOrder: number;
	createdAt?: string;
}

export async function getAllThemeCategories(): Promise<ThemeCategory[]> {
	try {
		const response = await fetch('/api/themes/categories/all', {
			credentials: 'include'
		});

		if (!response.ok) {
			throw new Error('Failed to fetch theme categories');
		}

		const result = await response.json();
		return result.data || [];
	} catch (error) {
		logger.error('Error fetching theme categories:', error);
		throw error;
	}
}

export async function createThemeCategory(name: string): Promise<ThemeCategory> {
	const response = await fetch('/api/themes/categories', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ name })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to create category');
	}

	const result = await response.json();
	return result.data;
}

export async function updateThemeCategory(id: string, name: string): Promise<ThemeCategory> {
	const response = await fetch(`/api/themes/categories/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ name })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update category');
	}

	const result = await response.json();
	return result.data;
}

export async function deleteThemeCategory(id: string): Promise<void> {
	const response = await fetch(`/api/themes/categories/${id}`, {
		method: 'DELETE',
		credentials: 'include'
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to delete category');
	}
}

export async function updateThemeCategoryOrder(
	categoryOrders: { id: string; displayOrder: number }[]
): Promise<void> {
	const response = await fetch('/api/themes/categories/order', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({ categoryOrders })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || 'Failed to update category order');
	}
}
