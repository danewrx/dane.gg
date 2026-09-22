/**
 * Project status constants
 * Centralized definitions for project statuses and their associated colors
 */

/**
 * Valid project status values
 */
export const PROJECT_STATUSES = [
	'Active',
	'In Progress',
	'Complete',
	'Abandoned',
	'Archived'
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * Color mapping for project status options
 */
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
	Active: '#10b981',
	'In Progress': '#f97316',
	Complete: '#10b981',
	Abandoned: '#ef4444',
	Archived: '#eab308'
};

/**
 * Default status color for unknown/invalid statuses
 */
export const DEFAULT_STATUS_COLOR = '#6b7280';

/**
 * Get the color for a project status
 * @param status - The project status
 * @returns The color hex code for the status, or the default color if status is unknown
 */
export function getProjectStatusColor(status: string): string {
	return PROJECT_STATUS_COLORS[status as ProjectStatus] || DEFAULT_STATUS_COLOR;
}

/**
 * Check if a status is a valid project status
 * @param status - The status to check
 * @returns True if the status is valid, false otherwise
 */
export function isValidProjectStatus(status: string): status is ProjectStatus {
	return PROJECT_STATUSES.includes(status as ProjectStatus);
}
