import { logger } from '../utils/logger';
import { Router } from 'express';
import { db } from '../db';
import { projects, projectCategories, tags, projectTags } from '../db/schema';
import { eq, desc, and, sql, asc, inArray, isNull, ne } from 'drizzle-orm';
import { requireSession } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiting';
import { getRepoStats } from '../services/githubService';
import { isUUID } from './tracking';

const router = Router();

const MAX_CATEGORY_NAME_LENGTH = 50;

/** Matches categories that share the given parent (null = top level). */
const siblingsOf = (parentId: string | null) =>
	parentId ? eq(projectCategories.parentId, parentId) : isNull(projectCategories.parentId);

/**
 * Checks that `parentId` can be a parent. Pass `selfId` when moving an existing category.
 * Returns an error message, or null when valid. Nesting is limited to one level.
 */
async function validateParentCategory(parentId: unknown, selfId?: string): Promise<string | null> {
	if (!isUUID(parentId)) return 'parentId must be a valid category id';
	if (parentId === selfId) return 'A category cannot be its own parent';

	const [parent] = await db
		.select()
		.from(projectCategories)
		.where(eq(projectCategories.id, parentId))
		.limit(1);
	if (!parent) return 'Parent category not found';
	if (parent.parentId) return 'Subcategories cannot have their own subcategories';

	if (selfId) {
		const [child] = await db
			.select({ id: projectCategories.id })
			.from(projectCategories)
			.where(eq(projectCategories.parentId, selfId))
			.limit(1);
		if (child) return 'A category with subcategories cannot become a subcategory';
	}
	return null;
}

/** Next displayOrder among the siblings of `parentId`. */
async function nextCategoryOrder(parentId: string | null): Promise<number> {
	const [row] = await db
		.select({ maxOrder: sql<number>`COALESCE(MAX(${projectCategories.displayOrder}), 0)` })
		.from(projectCategories)
		.where(siblingsOf(parentId));
	return (row?.maxOrder || 0) + 1;
}

/** Postgres unique_violation, possibly wrapped by drizzle in `cause`. */
function isUniqueViolation(error: any) {
	return error?.code === '23505' || error?.cause?.code === '23505';
}

/**
 * Get all projects (public endpoint)
 * Returns projects grouped by category
 * Only returns published projects
 * Query params:
 *   - featured: boolean - if true, only returns featured projects (for frontpage)
 */
router.get('/', generalLimiter, async (req, res) => {
	try {
		const featuredOnly = req.query.featured === 'true';

		const whereConditions = [eq(projects.published, true)];
		if (featuredOnly) {
			whereConditions.push(eq(projects.featured, true));
		}

		const allProjects = await db
			.select({
				id: projects.id,
				title: projects.title,
				description: projects.description,
				categoryId: projects.categoryId,
				featured: projects.featured,
				imageUrl: projects.imageUrl,
				active: projects.active,
				projectUrl: projects.projectUrl,
				projectText: projects.projectText,
				projectIcon: projects.projectIcon,
				repoUrl: projects.repoUrl,
				repoText: projects.repoText,
				repoIcon: projects.repoIcon,
				logoUrl: projects.logoUrl,
				logoBgColor: projects.logoBgColor,
				logoBorder: projects.logoBorder,
				showRepoStats: projects.showRepoStats,
				displayOrder: projects.displayOrder,
				createdAt: projects.createdAt,
				updatedAt: projects.updatedAt,
				category: {
					id: projectCategories.id,
					name: projectCategories.name,
					displayOrder: projectCategories.displayOrder,
					createdAt: projectCategories.createdAt
				}
			})
			.from(projects)
			.innerJoin(projectCategories, eq(projects.categoryId, projectCategories.id))
			.where(and(...whereConditions))
			.orderBy(
				asc(projectCategories.displayOrder),
				asc(projects.displayOrder),
				desc(projects.updatedAt)
			);

		// Get tags for each project
		const projectsWithTags = await Promise.all(
			allProjects.map(async (project) => {
				const projectTagsList = await db
					.select({
						id: tags.id,
						title: tags.title,
						color: tags.color,
						categoryId: tags.categoryId,
						category: {
							id: projectCategories.id,
							name: projectCategories.name,
							displayOrder: projectCategories.displayOrder,
							createdAt: projectCategories.createdAt
						}
					})
					.from(projectTags)
					.innerJoin(tags, eq(projectTags.tagId, tags.id))
					.leftJoin(projectCategories, eq(tags.categoryId, projectCategories.id))
					.where(eq(projectTags.projectId, project.id));

				return {
					...project,
					repoStats: project.showRepoStats ? await getRepoStats(project.repoUrl) : null,
					tags: projectTagsList
				};
			})
		);

		// Group projects under their top-level category
		const categoryRows = await db.select().from(projectCategories);
		const categoryById = new Map(categoryRows.map((c) => [c.id, c]));
		const byOrder = (a: { displayOrder: number | null }, b: { displayOrder: number | null }) =>
			(a.displayOrder || 0) - (b.displayOrder || 0);

		type CategoryRow = typeof projectCategories.$inferSelect;
		type PublicGroup = { category: CategoryRow; projects: any[] };
		const groups = new Map<string, PublicGroup & { subcategories: Map<string, PublicGroup> }>();

		for (const project of projectsWithTags) {
			const category = categoryById.get(project.categoryId);
			if (!category) continue;
			const top = category.parentId ? categoryById.get(category.parentId) : category;
			if (!top) continue;

			let group = groups.get(top.id);
			if (!group) {
				group = { category: top, projects: [], subcategories: new Map() };
				groups.set(top.id, group);
			}

			const publicProject = {
				id: project.id,
				title: project.title,
				description: project.description,
				featured: project.featured,
				imageUrl: project.imageUrl,
				active: project.active,
				projectUrl: project.projectUrl,
				projectText: project.projectText,
				projectIcon: project.projectIcon,
				repoUrl: project.repoUrl,
				repoText: project.repoText,
				repoIcon: project.repoIcon,
				logoUrl: project.logoUrl,
				logoBgColor: project.logoBgColor,
				logoBorder: project.logoBorder,
				showRepoStats: project.showRepoStats,
				repoStats: project.repoStats,
				displayOrder: project.displayOrder,
				createdAt: project.createdAt,
				updatedAt: project.updatedAt,
				tags: project.tags
			};

			if (category.parentId) {
				let sub = group.subcategories.get(category.id);
				if (!sub) {
					sub = { category, projects: [] };
					group.subcategories.set(category.id, sub);
				}
				sub.projects.push(publicProject);
			} else {
				group.projects.push(publicProject);
			}
		}

		const sortProjects = (list: any[]) =>
			list.sort((a, b) => {
				if (a.displayOrder !== b.displayOrder) {
					return a.displayOrder - b.displayOrder;
				}
				return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
			});

		const sortedCategories = [...groups.values()]
			.sort((a, b) => byOrder(a.category, b.category))
			.map((group) => ({
				category: group.category,
				projects: sortProjects(group.projects),
				subcategories: [...group.subcategories.values()]
					.sort((a, b) => byOrder(a.category, b.category))
					.map((sub) => ({ category: sub.category, projects: sortProjects(sub.projects) }))
			}));

		res.json({
			success: true,
			data: sortedCategories
		});
	} catch (error) {
		logger.error('Error fetching projects:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch projects'
		});
	}
});

/**
 * Get all projects (authenticated users only)
 */
router.get('/admin/all', requireSession, async (req, res) => {
	try {
		const allProjects = await db
			.select({
				id: projects.id,
				title: projects.title,
				description: projects.description,
				categoryId: projects.categoryId,
				featured: projects.featured,
				imageUrl: projects.imageUrl,
				active: projects.active,
				published: projects.published,
				projectUrl: projects.projectUrl,
				projectText: projects.projectText,
				projectIcon: projects.projectIcon,
				repoUrl: projects.repoUrl,
				repoText: projects.repoText,
				repoIcon: projects.repoIcon,
				logoUrl: projects.logoUrl,
				logoBgColor: projects.logoBgColor,
				logoBorder: projects.logoBorder,
				showRepoStats: projects.showRepoStats,
				displayOrder: projects.displayOrder,
				createdAt: projects.createdAt,
				updatedAt: projects.updatedAt,
				category: {
					id: projectCategories.id,
					name: projectCategories.name,
					displayOrder: projectCategories.displayOrder,
					createdAt: projectCategories.createdAt
				}
			})
			.from(projects)
			.innerJoin(projectCategories, eq(projects.categoryId, projectCategories.id))
			.orderBy(asc(projects.displayOrder), desc(projects.createdAt));

		// Get tags for each project
		const projectsWithTags = await Promise.all(
			allProjects.map(async (project) => {
				const projectTagsList = await db
					.select({
						id: tags.id,
						title: tags.title,
						color: tags.color,
						categoryId: tags.categoryId,
						category: {
							id: projectCategories.id,
							name: projectCategories.name,
							displayOrder: projectCategories.displayOrder,
							createdAt: projectCategories.createdAt
						}
					})
					.from(projectTags)
					.innerJoin(tags, eq(projectTags.tagId, tags.id))
					.leftJoin(projectCategories, eq(tags.categoryId, projectCategories.id))
					.where(eq(projectTags.projectId, project.id));

				return {
					...project,
					repoStats: project.showRepoStats ? await getRepoStats(project.repoUrl) : null,
					tags: projectTagsList
				};
			})
		);

		res.json({
			success: true,
			data: projectsWithTags
		});
	} catch (error) {
		logger.error('Error fetching all projects:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch projects'
		});
	}
});

/**
 * Get a single project by ID (authenticated users only)
 */
router.get('/admin/:id', requireSession, async (req, res) => {
	try {
		const { id } = req.params;

		const [project] = await db
			.select({
				id: projects.id,
				title: projects.title,
				description: projects.description,
				categoryId: projects.categoryId,
				featured: projects.featured,
				imageUrl: projects.imageUrl,
				active: projects.active,
				published: projects.published,
				projectUrl: projects.projectUrl,
				projectText: projects.projectText,
				projectIcon: projects.projectIcon,
				repoUrl: projects.repoUrl,
				repoText: projects.repoText,
				repoIcon: projects.repoIcon,
				logoUrl: projects.logoUrl,
				logoBgColor: projects.logoBgColor,
				logoBorder: projects.logoBorder,
				showRepoStats: projects.showRepoStats,
				displayOrder: projects.displayOrder,
				createdAt: projects.createdAt,
				updatedAt: projects.updatedAt,
				category: {
					id: projectCategories.id,
					name: projectCategories.name,
					createdAt: projectCategories.createdAt
				}
			})
			.from(projects)
			.innerJoin(projectCategories, eq(projects.categoryId, projectCategories.id))
			.where(eq(projects.id, id))
			.limit(1);

		if (!project) {
			return res.status(404).json({
				success: false,
				error: 'Project not found'
			});
		}

		// Get tags for project
		const projectTagsList = await db
			.select({
				id: tags.id,
				title: tags.title,
				color: tags.color
			})
			.from(projectTags)
			.innerJoin(tags, eq(projectTags.tagId, tags.id))
			.where(eq(projectTags.projectId, id));

		res.json({
			success: true,
			data: {
				...project,
				tags: projectTagsList
			}
		});
	} catch (error) {
		logger.error('Error fetching project:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch project'
		});
	}
});

/**
 * Create a new project (authenticated users only)
 */
router.post('/admin', requireSession, async (req, res) => {
	try {
		const {
			title,
			description,
			categoryId,
			imageUrl,
			active,
			published,
			projectUrl,
			projectText,
			projectIcon,
			repoUrl,
			repoText,
			repoIcon,
			logoUrl,
			logoBgColor,
			logoBorder,
			showRepoStats,
			displayOrder,
			featured,
			tagIds
		} = req.body;

		if (!title?.trim()) {
			return res.status(400).json({
				success: false,
				error: 'Title is required'
			});
		}
		if (!description?.trim()) {
			return res.status(400).json({
				success: false,
				error: 'Description is required'
			});
		}
		if (!categoryId) {
			return res.status(400).json({
				success: false,
				error: 'Category is required'
			});
		}

		// Validate category
		const [category] = await db
			.select()
			.from(projectCategories)
			.where(eq(projectCategories.id, categoryId))
			.limit(1);

		if (!category) {
			return res.status(400).json({
				success: false,
				error: 'Category not found'
			});
		}

		// Validate active state
		const validStates = ['Active', 'In Progress', 'Complete', 'Abandoned', 'Archived'];
		const projectActive = active && validStates.includes(active) ? active : 'Active';

		const now = new Date();
		const [newProject] = await db
			.insert(projects)
			.values({
				title: title.trim(),
				description: description.trim(),
				categoryId: categoryId,
				imageUrl: imageUrl || null,
				active: projectActive,
				published: published || false,
				projectUrl: projectUrl || null,
				projectText: projectText || 'View Project',
				projectIcon: projectIcon || null,
				repoUrl: repoUrl || null,
				repoText: repoText || 'View Repository',
				repoIcon: repoIcon || null,
				logoUrl: logoUrl || null,
				logoBgColor: (() => {
					const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
					return logoBgColor && hexColorRegex.test(logoBgColor) ? logoBgColor : null;
				})(),
				logoBorder: logoBorder || false,
				showRepoStats: showRepoStats || false,
				displayOrder: displayOrder ?? 0,
				featured: featured || false,
				updatedAt: now
			})
			.returning();

		// Fetch project with category
		const [projectWithCategory] = await db
			.select({
				id: projects.id,
				title: projects.title,
				description: projects.description,
				categoryId: projects.categoryId,
				featured: projects.featured,
				imageUrl: projects.imageUrl,
				active: projects.active,
				published: projects.published,
				projectUrl: projects.projectUrl,
				projectText: projects.projectText,
				projectIcon: projects.projectIcon,
				repoUrl: projects.repoUrl,
				repoText: projects.repoText,
				repoIcon: projects.repoIcon,
				logoUrl: projects.logoUrl,
				logoBgColor: projects.logoBgColor,
				logoBorder: projects.logoBorder,
				showRepoStats: projects.showRepoStats,
				displayOrder: projects.displayOrder,
				createdAt: projects.createdAt,
				updatedAt: projects.updatedAt,
				category: {
					id: projectCategories.id,
					name: projectCategories.name,
					createdAt: projectCategories.createdAt
				}
			})
			.from(projects)
			.innerJoin(projectCategories, eq(projects.categoryId, projectCategories.id))
			.where(eq(projects.id, newProject.id))
			.limit(1);

		// Handle tags
		if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
			// Validate that all tag IDs exist
			const existingTags = await db.select().from(tags).where(inArray(tags.id, tagIds));

			if (existingTags.length !== tagIds.length) {
				return res.status(400).json({
					success: false,
					error: 'One or more tag IDs are invalid'
				});
			}

			await db.insert(projectTags).values(
				tagIds.map((tagId) => ({
					projectId: newProject.id,
					tagId: tagId
				}))
			);
		}

		// Fetch project with tags
		const projectTagsList = await db
			.select({
				id: tags.id,
				title: tags.title,
				color: tags.color
			})
			.from(projectTags)
			.innerJoin(tags, eq(projectTags.tagId, tags.id))
			.where(eq(projectTags.projectId, newProject.id));

		res.json({
			success: true,
			data: {
				...projectWithCategory,
				tags: projectTagsList
			}
		});
	} catch (error) {
		logger.error('Error creating project:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create project'
		});
	}
});

/**
 * Update project display order (authenticated users only)
 */
router.put('/admin/order', requireSession, async (req, res) => {
	try {
		const { projectOrders } = req.body;

		if (!Array.isArray(projectOrders)) {
			return res.status(400).json({
				success: false,
				error: 'projectOrders must be an array'
			});
		}

		await Promise.all(
			projectOrders.map(({ id, displayOrder }: { id: string; displayOrder: number }) =>
				db
					.update(projects)
					.set({ displayOrder: parseInt(displayOrder.toString(), 10) })
					.where(eq(projects.id, id))
			)
		);

		res.json({
			success: true,
			message: 'Project order updated successfully'
		});
	} catch (error) {
		logger.error('Error updating project order:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update project order'
		});
	}
});

/**
 * Update a project (authenticated users only)
 */
router.put('/admin/:id', requireSession, async (req, res) => {
	try {
		const { id } = req.params;
		const {
			title,
			description,
			categoryId,
			imageUrl,
			active,
			published,
			projectUrl,
			projectText,
			projectIcon,
			repoUrl,
			repoText,
			repoIcon,
			logoUrl,
			logoBgColor,
			logoBorder,
			showRepoStats,
			displayOrder,
			featured,
			createdAt,
			tagIds
		} = req.body;

		const [existingProject] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

		if (!existingProject) {
			return res.status(404).json({
				success: false,
				error: 'Project not found'
			});
		}

		// Validate category if provided
		if (categoryId && categoryId !== existingProject.categoryId) {
			const [category] = await db
				.select()
				.from(projectCategories)
				.where(eq(projectCategories.id, categoryId))
				.limit(1);

			if (!category) {
				return res.status(400).json({
					success: false,
					error: 'Category not found'
				});
			}
		}

		// Validate active state if provided
		const validStates = ['Active', 'In Progress', 'Complete', 'Abandoned', 'Archived'];
		if (active && !validStates.includes(active)) {
			return res.status(400).json({
				success: false,
				error: `Invalid active state. Must be one of: ${validStates.join(', ')}`
			});
		}

		const updateData: any = {
			updatedAt: new Date()
		};

		if (title !== undefined) updateData.title = title.trim();
		if (description !== undefined) updateData.description = description.trim();
		if (categoryId !== undefined) updateData.categoryId = categoryId;
		if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
		if (active !== undefined) updateData.active = active;
		if (published !== undefined) updateData.published = published;
		if (projectUrl !== undefined) updateData.projectUrl = projectUrl || null;
		if (projectText !== undefined) updateData.projectText = projectText || 'View Project';
		if (projectIcon !== undefined) updateData.projectIcon = projectIcon || null;
		if (repoUrl !== undefined) updateData.repoUrl = repoUrl || null;
		if (repoText !== undefined) updateData.repoText = repoText || 'View Repository';
		if (repoIcon !== undefined) updateData.repoIcon = repoIcon || null;
		if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
		if (logoBgColor !== undefined) {
			const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
			if (logoBgColor && !hexColorRegex.test(logoBgColor)) {
				return res.status(400).json({ success: false, error: 'logoBgColor must be a valid hex color (e.g. #ff0000)' });
			}
			updateData.logoBgColor = logoBgColor || null;
		}
		if (logoBorder !== undefined) updateData.logoBorder = logoBorder ?? false;
		if (showRepoStats !== undefined) updateData.showRepoStats = Boolean(showRepoStats);
		if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
		if (featured !== undefined) updateData.featured = featured;
		if (createdAt !== undefined) updateData.createdAt = new Date(createdAt);

		await db.update(projects).set(updateData).where(eq(projects.id, id)).returning();

		// Fetch project with category
		const [projectWithCategory] = await db
			.select({
				id: projects.id,
				title: projects.title,
				description: projects.description,
				categoryId: projects.categoryId,
				featured: projects.featured,
				imageUrl: projects.imageUrl,
				active: projects.active,
				published: projects.published,
				projectUrl: projects.projectUrl,
				projectText: projects.projectText,
				projectIcon: projects.projectIcon,
				repoUrl: projects.repoUrl,
				repoText: projects.repoText,
				repoIcon: projects.repoIcon,
				logoUrl: projects.logoUrl,
				logoBgColor: projects.logoBgColor,
				logoBorder: projects.logoBorder,
				showRepoStats: projects.showRepoStats,
				displayOrder: projects.displayOrder,
				createdAt: projects.createdAt,
				updatedAt: projects.updatedAt,
				category: {
					id: projectCategories.id,
					name: projectCategories.name,
					createdAt: projectCategories.createdAt
				}
			})
			.from(projects)
			.innerJoin(projectCategories, eq(projects.categoryId, projectCategories.id))
			.where(eq(projects.id, id))
			.limit(1);

		// Handle tags
		if (tagIds !== undefined) {
			await db.delete(projectTags).where(eq(projectTags.projectId, id));

			// Add new tags
			if (Array.isArray(tagIds) && tagIds.length > 0) {
				// Validate that tag IDs exist
				const existingTags = await db.select().from(tags).where(inArray(tags.id, tagIds));

				if (existingTags.length !== tagIds.length) {
					return res.status(400).json({
						success: false,
						error: 'One or more tag IDs are invalid'
					});
				}

				await db.insert(projectTags).values(
					tagIds.map((tagId) => ({
						projectId: id,
						tagId: tagId
					}))
				);
			}
		}

		// Fetch project with tags
		const projectTagsList = await db
			.select({
				id: tags.id,
				title: tags.title,
				color: tags.color
			})
			.from(projectTags)
			.innerJoin(tags, eq(projectTags.tagId, tags.id))
			.where(eq(projectTags.projectId, id));

		res.json({
			success: true,
			data: {
				...projectWithCategory,
				tags: projectTagsList
			}
		});
	} catch (error) {
		logger.error('Error updating project:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update project'
		});
	}
});

/**
 * Delete a project (authenticated users only)
 */
router.delete('/admin/:id', requireSession, async (req, res) => {
	try {
		const { id } = req.params;

		const [deletedProject] = await db.delete(projects).where(eq(projects.id, id)).returning();

		if (!deletedProject) {
			return res.status(404).json({
				success: false,
				error: 'Project not found'
			});
		}

		res.json({
			success: true,
			data: deletedProject
		});
	} catch (error) {
		logger.error('Error deleting project:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete project'
		});
	}
});

/**
 * Get all published projects for a specific category (public endpoint)
 */
router.get('/category/:categoryId', generalLimiter, async (req, res) => {
	try {
		const { categoryId } = req.params;

		const [category] = await db
			.select()
			.from(projectCategories)
			.where(eq(projectCategories.id, categoryId))
			.limit(1);

		if (!category) {
			return res.status(404).json({
				success: false,
				error: 'Category not found'
			});
		}

		// A main category page also lists its subcategories' projects.
		const subcategories = category.parentId
			? []
			: await db
					.select()
					.from(projectCategories)
					.where(eq(projectCategories.parentId, category.id))
					.orderBy(asc(projectCategories.displayOrder), asc(projectCategories.name));
		const parent = category.parentId
			? (
					await db
						.select({ id: projectCategories.id, name: projectCategories.name })
						.from(projectCategories)
						.where(eq(projectCategories.id, category.parentId))
						.limit(1)
				)[0] || null
			: null;
		const categoryIds = [category.id, ...subcategories.map((c) => c.id)];

		const allProjects = await db
			.select({
				id: projects.id,
				title: projects.title,
				description: projects.description,
				categoryId: projects.categoryId,
				featured: projects.featured,
				imageUrl: projects.imageUrl,
				active: projects.active,
				projectUrl: projects.projectUrl,
				projectText: projects.projectText,
				projectIcon: projects.projectIcon,
				repoUrl: projects.repoUrl,
				repoText: projects.repoText,
				repoIcon: projects.repoIcon,
				logoUrl: projects.logoUrl,
				logoBgColor: projects.logoBgColor,
				logoBorder: projects.logoBorder,
				showRepoStats: projects.showRepoStats,
				displayOrder: projects.displayOrder,
				createdAt: projects.createdAt,
				updatedAt: projects.updatedAt,
				category: {
					id: projectCategories.id,
					name: projectCategories.name,
					displayOrder: projectCategories.displayOrder,
					createdAt: projectCategories.createdAt
				}
			})
			.from(projects)
			.innerJoin(projectCategories, eq(projects.categoryId, projectCategories.id))
			.where(and(eq(projects.published, true), inArray(projects.categoryId, categoryIds)))
			.orderBy(asc(projects.displayOrder), desc(projects.updatedAt));

		const projectsWithTags = await Promise.all(
			allProjects.map(async (project) => {
				const projectTagsList = await db
					.select({
						id: tags.id,
						title: tags.title,
						color: tags.color,
						categoryId: tags.categoryId,
						category: {
							id: projectCategories.id,
							name: projectCategories.name,
							displayOrder: projectCategories.displayOrder,
							createdAt: projectCategories.createdAt
						}
					})
					.from(projectTags)
					.innerJoin(tags, eq(projectTags.tagId, tags.id))
					.leftJoin(projectCategories, eq(tags.categoryId, projectCategories.id))
					.where(eq(projectTags.projectId, project.id));

				const repoStats = project.showRepoStats ? await getRepoStats(project.repoUrl) : null;
				return {
					id: project.id,
					title: project.title,
					description: project.description,
					categoryId: project.categoryId,
					featured: project.featured,
					imageUrl: project.imageUrl,
					active: project.active,
					projectUrl: project.projectUrl,
					projectText: project.projectText,
					projectIcon: project.projectIcon,
					repoUrl: project.repoUrl,
					repoText: project.repoText,
					repoIcon: project.repoIcon,
					logoUrl: project.logoUrl,
					logoBgColor: project.logoBgColor,
					logoBorder: project.logoBorder,
					showRepoStats: project.showRepoStats,
					repoStats,
					displayOrder: project.displayOrder,
					createdAt: project.createdAt,
					updatedAt: project.updatedAt,
					tags: projectTagsList
				};
			})
		);

		res.json({
			success: true,
			data: {
				category: {
					id: category.id,
					name: category.name,
					parentId: category.parentId,
					displayOrder: category.displayOrder,
					createdAt: category.createdAt
				},
				parent,
				subcategories: subcategories.map((c) => ({
					id: c.id,
					name: c.name,
					displayOrder: c.displayOrder
				})),
				projects: projectsWithTags
			}
		});
	} catch (error) {
		logger.error('Error fetching projects by category:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch projects'
		});
	}
});

/**
 * Get all project categories (public endpoint)
 */
router.get('/categories', generalLimiter, async (req, res) => {
	try {
		const categories = await db
			.select()
			.from(projectCategories)
			.orderBy(asc(projectCategories.displayOrder), asc(projectCategories.name));

		res.json({
			success: true,
			data: categories
		});
	} catch (error) {
		logger.error('Error fetching project categories:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch project categories'
		});
	}
});

/**
 * Get all project categories (authenticated users only)
 */
router.get('/admin/categories/all', requireSession, async (req, res) => {
	try {
		const categories = await db
			.select()
			.from(projectCategories)
			.orderBy(asc(projectCategories.displayOrder), asc(projectCategories.name));

		res.json({
			success: true,
			data: categories
		});
	} catch (error) {
		logger.error('Error fetching project categories:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch project categories'
		});
	}
});

/**
 * Create a new project category or subcategory (authenticated users only)
 * Body: { name, parentId? } - parentId makes it a subcategory of that main category.
 */
router.post('/admin/categories', requireSession, async (req, res) => {
	try {
		const { name, parentId } = req.body;

		if (!name || !name.trim()) {
			return res.status(400).json({
				success: false,
				error: 'Category name is required'
			});
		}

		if (name.trim().length > MAX_CATEGORY_NAME_LENGTH) {
			return res.status(400).json({
				success: false,
				error: `Category name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer`
			});
		}

		const parent: string | null = parentId ?? null;
		if (parent !== null) {
			const parentError = await validateParentCategory(parent);
			if (parentError) {
				return res.status(400).json({ success: false, error: parentError });
			}
		}

		const [existingCategory] = await db
			.select()
			.from(projectCategories)
			.where(and(eq(projectCategories.name, name.trim()), siblingsOf(parent)))
			.limit(1);

		if (existingCategory) {
			return res.status(400).json({
				success: false,
				error: 'A category with this name already exists'
			});
		}

		const [newCategory] = await db
			.insert(projectCategories)
			.values({
				name: name.trim(),
				parentId: parent,
				displayOrder: await nextCategoryOrder(parent)
			})
			.returning();

		res.json({
			success: true,
			data: newCategory
		});
	} catch (error) {
		if (isUniqueViolation(error)) {
			return res.status(400).json({
				success: false,
				error: 'A category with this name already exists'
			});
		}
		logger.error('Error creating project category:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create project category'
		});
	}
});

/**
 * Update category display order (authenticated users only)
 * All categories in one request must share the same parent (reorder within one list).
 * NOTE: This must be defined BEFORE /admin/categories/:id to avoid route conflicts
 */
router.put('/admin/categories/order', requireSession, async (req, res) => {
	try {
		const { categoryOrders } = req.body;

		if (
			!Array.isArray(categoryOrders) ||
			!categoryOrders.every(
				(o) => o && isUUID(o.id) && Number.isInteger(o.displayOrder) && o.displayOrder >= 0
			)
		) {
			return res.status(400).json({
				success: false,
				error: 'categoryOrders must be an array of { id, displayOrder } with valid values'
			});
		}

		if (categoryOrders.length > 0) {
			const ids: string[] = categoryOrders.map((o) => o.id);
			const rows = await db
				.select({ id: projectCategories.id, parentId: projectCategories.parentId })
				.from(projectCategories)
				.where(inArray(projectCategories.id, ids));

			if (rows.length !== new Set(ids).size || new Set(rows.map((r) => r.parentId)).size > 1) {
				return res.status(400).json({
					success: false,
					error: 'Categories must all exist and share the same parent'
				});
			}

			await db.transaction(async (tx) => {
				for (const { id, displayOrder } of categoryOrders) {
					await tx
						.update(projectCategories)
						.set({ displayOrder })
						.where(eq(projectCategories.id, id));
				}
			});
		}

		res.json({
			success: true,
			message: 'Category order updated successfully'
		});
	} catch (error) {
		logger.error('Error updating category order:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update category order'
		});
	}
});

/**
 * Update a project category (authenticated users only)
 * Body: { name, displayOrder?, parentId? } - parentId (a main category id, or null) moves it;
 * omit it to leave the parent unchanged.
 */
router.put('/admin/categories/:id', requireSession, async (req, res) => {
	try {
		const { id } = req.params;
		const { name } = req.body;

		if (!name || !name.trim()) {
			return res.status(400).json({
				success: false,
				error: 'Category name is required'
			});
		}

		if (name.trim().length > MAX_CATEGORY_NAME_LENGTH) {
			return res.status(400).json({
				success: false,
				error: `Category name must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer`
			});
		}

		const [existingCategory] = await db
			.select()
			.from(projectCategories)
			.where(eq(projectCategories.id, id))
			.limit(1);

		if (!existingCategory) {
			return res.status(404).json({
				success: false,
				error: 'Category not found'
			});
		}

		const targetParent: string | null =
			req.body.parentId === undefined ? existingCategory.parentId : (req.body.parentId ?? null);
		const moved = targetParent !== existingCategory.parentId;

		if (moved && targetParent !== null) {
			const parentError = await validateParentCategory(targetParent, id);
			if (parentError) {
				return res.status(400).json({ success: false, error: parentError });
			}
		}

		const [conflictingCategory] = await db
			.select()
			.from(projectCategories)
			.where(
				and(
					eq(projectCategories.name, name.trim()),
					siblingsOf(targetParent),
					ne(projectCategories.id, id)
				)
			)
			.limit(1);

		if (conflictingCategory) {
			return res.status(400).json({
				success: false,
				error: 'A category with this name already exists'
			});
		}

		const { displayOrder } = req.body;
		const updateData: Partial<typeof projectCategories.$inferInsert> = { name: name.trim() };

		if (displayOrder !== undefined) {
			if (!Number.isInteger(displayOrder) || displayOrder < 0) {
				return res.status(400).json({
					success: false,
					error: 'displayOrder must be a non-negative integer'
				});
			}
			updateData.displayOrder = displayOrder;
		}

		if (moved) {
			updateData.parentId = targetParent;
			if (displayOrder === undefined) {
				updateData.displayOrder = await nextCategoryOrder(targetParent);
			}
		}

		const [updatedCategory] = await db
			.update(projectCategories)
			.set(updateData)
			.where(eq(projectCategories.id, id))
			.returning();

		res.json({
			success: true,
			data: updatedCategory
		});
	} catch (error) {
		if (isUniqueViolation(error)) {
			return res.status(400).json({
				success: false,
				error: 'A category with this name already exists'
			});
		}
		logger.error('Error updating project category:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update project category'
		});
	}
});

/**
 * Delete a project category (authenticated users only)
 */
router.delete('/admin/categories/:id', requireSession, async (req, res) => {
	try {
		const { id } = req.params;

		const [subcategory] = await db
			.select({ id: projectCategories.id })
			.from(projectCategories)
			.where(eq(projectCategories.parentId, id))
			.limit(1);

		if (subcategory) {
			return res.status(400).json({
				success: false,
				error: 'Cannot delete a category that has subcategories'
			});
		}

		// Check if category is used by any projects
		const [projectUsingCategory] = await db
			.select()
			.from(projects)
			.where(eq(projects.categoryId, id))
			.limit(1);

		if (projectUsingCategory) {
			return res.status(400).json({
				success: false,
				error: 'Cannot delete category that is in use by projects'
			});
		}

		const [deletedCategory] = await db
			.delete(projectCategories)
			.where(eq(projectCategories.id, id))
			.returning();

		if (!deletedCategory) {
			return res.status(404).json({
				success: false,
				error: 'Category not found'
			});
		}

		res.json({
			success: true,
			data: deletedCategory
		});
	} catch (error) {
		logger.error('Error deleting project category:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete project category'
		});
	}
});

/**
 * Get all project tags (authenticated users only)
 * Query params:
 *   - grouped: boolean - if true, returns tags grouped by category
 *   - categoryId: string - filter tags by category ID
 */
router.get('/admin/tags/all', requireSession, async (req, res) => {
	try {
		const grouped = req.query.grouped === 'true';
		const categoryIdFilter = req.query.categoryId as string | undefined;

		const whereConditions = [];
		if (categoryIdFilter) {
			whereConditions.push(eq(tags.categoryId, categoryIdFilter));
		}

		const allTags = await db
			.select({
				id: tags.id,
				title: tags.title,
				color: tags.color,
				categoryId: tags.categoryId,
				createdAt: tags.createdAt,
				category: {
					id: projectCategories.id,
					name: projectCategories.name,
					displayOrder: projectCategories.displayOrder,
					createdAt: projectCategories.createdAt
				}
			})
			.from(tags)
			.leftJoin(projectCategories, eq(tags.categoryId, projectCategories.id))
			.where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
			.orderBy(asc(projectCategories.displayOrder), asc(projectCategories.name), asc(tags.title));

		if (grouped) {
			// Group tags by category
			const tagsByCategory = allTags.reduce(
				(acc, tag) => {
					const categoryId = tag.categoryId || 'uncategorized';

					if (!acc[categoryId]) {
						acc[categoryId] = {
							category: tag.category || null,
							tags: []
						};
					}
					acc[categoryId].tags.push({
						id: tag.id,
						title: tag.title,
						color: tag.color,
						categoryId: tag.categoryId,
						createdAt: tag.createdAt,
						category: tag.category
					});
					return acc;
				},
				{} as Record<
					string,
					{
						category: Pick<
							typeof projectCategories.$inferSelect,
							'id' | 'name' | 'displayOrder' | 'createdAt'
						> | null;
						tags: any[];
					}
				>
			);

			res.json({
				success: true,
				data: Object.values(tagsByCategory)
			});
		} else {
			res.json({
				success: true,
				data: allTags.map((tag) => ({
					id: tag.id,
					title: tag.title,
					color: tag.color,
					categoryId: tag.categoryId,
					createdAt: tag.createdAt,
					category: tag.category
				}))
			});
		}
	} catch (error) {
		logger.error('Error fetching project tags:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch project tags'
		});
	}
});

/**
 * Create a new project tag (authenticated users only)
 */
router.post('/admin/tags', requireSession, async (req, res) => {
	try {
		const { title, color, categoryId } = req.body;

		if (!title || !title.trim()) {
			return res.status(400).json({
				success: false,
				error: 'Tag title is required'
			});
		}
		if (!color || !color.trim()) {
			return res.status(400).json({
				success: false,
				error: 'Tag color is required'
			});
		}

		// Validate color format (hex code)
		const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
		if (!hexColorRegex.test(color.trim())) {
			return res.status(400).json({
				success: false,
				error: 'Color must be a valid hex code (e.g., #FF5733)'
			});
		}

		// Validate category
		if (categoryId) {
			const [category] = await db
				.select()
				.from(projectCategories)
				.where(eq(projectCategories.id, categoryId))
				.limit(1);

			if (!category) {
				return res.status(400).json({
					success: false,
					error: 'Category not found'
				});
			}

			if (category.parentId) {
				return res.status(400).json({
					success: false,
					error: 'Tags can only belong to main categories'
				});
			}
		}

		const [existingTag] = await db.select().from(tags).where(eq(tags.title, title.trim())).limit(1);

		if (existingTag) {
			return res.status(400).json({
				success: false,
				error: 'A tag with this title already exists'
			});
		}

		const [newTag] = await db
			.insert(tags)
			.values({
				title: title.trim(),
				color: color.trim(),
				categoryId: categoryId || null
			})
			.returning();

		res.json({
			success: true,
			data: newTag
		});
	} catch (error) {
		logger.error('Error creating project tag:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to create project tag'
		});
	}
});

/**
 * Update a project tag (authenticated users only)
 */
router.put('/admin/tags/:id', requireSession, async (req, res) => {
	try {
		const { id } = req.params;
		const { title, color, categoryId } = req.body;

		const [existingTag] = await db.select().from(tags).where(eq(tags.id, id)).limit(1);

		if (!existingTag) {
			return res.status(404).json({
				success: false,
				error: 'Tag not found'
			});
		}

		const updateData: any = {};

		if (title !== undefined) {
			if (!title.trim()) {
				return res.status(400).json({
					success: false,
					error: 'Tag title cannot be empty'
				});
			}

			// Check for duplicate title
			const [conflictingTag] = await db
				.select()
				.from(tags)
				.where(and(eq(tags.title, title.trim()), sql`${tags.id} != ${id}`))
				.limit(1);

			if (conflictingTag) {
				return res.status(400).json({
					success: false,
					error: 'A tag with this title already exists'
				});
			}

			updateData.title = title.trim();
		}

		if (color !== undefined) {
			if (!color.trim()) {
				return res.status(400).json({
					success: false,
					error: 'Tag color cannot be empty'
				});
			}

			// Validate color format (hex code)
			const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
			if (!hexColorRegex.test(color.trim())) {
				return res.status(400).json({
					success: false,
					error: 'Color must be a valid hex code (e.g., #FF5733)'
				});
			}

			updateData.color = color.trim();
		}

		if (categoryId !== undefined) {
			if (categoryId === null || categoryId === '') {
				updateData.categoryId = null;
			} else {
				// Validate category
				const [category] = await db
					.select()
					.from(projectCategories)
					.where(eq(projectCategories.id, categoryId))
					.limit(1);

				if (!category) {
					return res.status(400).json({
						success: false,
						error: 'Category not found'
					});
				}

				if (category.parentId) {
					return res.status(400).json({
						success: false,
						error: 'Tags can only belong to main categories'
					});
				}

				updateData.categoryId = categoryId;
			}
		}

		const [updatedTag] = await db.update(tags).set(updateData).where(eq(tags.id, id)).returning();

		res.json({
			success: true,
			data: updatedTag
		});
	} catch (error) {
		logger.error('Error updating project tag:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update project tag'
		});
	}
});

/**
 * Get projects using a specific tag (authenticated users only)
 */
router.get('/admin/tags/:id/projects', requireSession, async (req, res) => {
	try {
		const { id } = req.params;

		const projectsUsingTag = await db
			.select({
				id: projects.id,
				title: projects.title
			})
			.from(projectTags)
			.innerJoin(projects, eq(projectTags.projectId, projects.id))
			.where(eq(projectTags.tagId, id))
			.orderBy(asc(projects.title));

		res.json({
			success: true,
			data: projectsUsingTag
		});
	} catch (error) {
		logger.error('Error fetching projects using tag:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch projects using tag'
		});
	}
});

router.delete('/admin/tags/:id', requireSession, async (req, res) => {
	try {
		const { id } = req.params;
		await db.delete(projectTags).where(eq(projectTags.tagId, id));

		const [deletedTag] = await db.delete(tags).where(eq(tags.id, id)).returning();

		if (!deletedTag) {
			return res.status(404).json({
				success: false,
				error: 'Tag not found'
			});
		}

		res.json({
			success: true,
			data: deletedTag
		});
	} catch (error) {
		logger.error('Error deleting project tag:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to delete project tag'
		});
	}
});

export default router;
