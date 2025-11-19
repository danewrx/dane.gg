import { Router, Request, Response } from 'express';
import { db } from '../db';
import { projects, projectCategories } from '../db/schema';
import { eq, desc, and, sql, asc } from 'drizzle-orm';
import { requireSession } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiting';

const router = Router();

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
        repoUrl: projects.repoUrl,
        repoText: projects.repoText,
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
      .where(and(...whereConditions))
      .orderBy(asc(projects.displayOrder), desc(projects.createdAt));

    // Group projects by category
    const projectsByCategory = allProjects.reduce((acc, project) => {
      const categoryName = project.category.name;
      if (!acc[categoryName]) {
        acc[categoryName] = {
          category: project.category,
          projects: []
        };
      }
      acc[categoryName].projects.push({
        id: project.id,
        title: project.title,
        description: project.description,
        featured: project.featured,
        imageUrl: project.imageUrl,
        active: project.active,
        projectUrl: project.projectUrl,
        projectText: project.projectText,
        repoUrl: project.repoUrl,
        repoText: project.repoText,
        displayOrder: project.displayOrder,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      });
      return acc;
    }, {} as Record<string, { category: typeof projectCategories.$inferSelect; projects: any[] }>);

    res.json({
      success: true,
      data: Object.values(projectsByCategory)
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
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
        repoUrl: projects.repoUrl,
        repoText: projects.repoText,
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
      .orderBy(asc(projects.displayOrder), desc(projects.createdAt));

    res.json({
      success: true,
      data: allProjects
    });
  } catch (error) {
    console.error('Error fetching all projects:', error);
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
        repoUrl: projects.repoUrl,
        repoText: projects.repoText,
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

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
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
      repoUrl,
      repoText,
      displayOrder,
      featured
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
    const validStates = ['Active', 'Complete', 'Abandoned', 'Archived'];
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
        repoUrl: repoUrl || null,
        repoText: repoText || 'View Repository',
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
        repoUrl: projects.repoUrl,
        repoText: projects.repoText,
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

    res.json({
      success: true,
      data: projectWithCategory
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
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
      repoUrl,
      repoText,
      displayOrder,
      featured,
      createdAt
    } = req.body;

    const [existingProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

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
    const validStates = ['Active', 'Complete', 'Abandoned', 'Archived'];
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
    if (repoUrl !== undefined) updateData.repoUrl = repoUrl || null;
    if (repoText !== undefined) updateData.repoText = repoText || 'View Repository';
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (featured !== undefined) updateData.featured = featured;
    if (createdAt !== undefined) updateData.createdAt = new Date(createdAt);

    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
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
        repoUrl: projects.repoUrl,
        repoText: projects.repoText,
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

    res.json({
      success: true,
      data: projectWithCategory
    });
  } catch (error) {
    console.error('Error updating project:', error);
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

    const [deletedProject] = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();

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
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
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
      .orderBy(projectCategories.name);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching project categories:', error);
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
      .orderBy(projectCategories.name);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching project categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project categories'
    });
  }
});

/**
 * Create a new project category (authenticated users only)
 */
router.post('/admin/categories', requireSession, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    const [existingCategory] = await db
      .select()
      .from(projectCategories)
      .where(eq(projectCategories.name, name.trim()))
      .limit(1);

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'A category with this name already exists'
      });
    }

    const [newCategory] = await db
      .insert(projectCategories)
      .values({ name: name.trim() })
      .returning();

    res.json({
      success: true,
      data: newCategory
    });
  } catch (error) {
    console.error('Error creating project category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project category'
    });
  }
});

/**
 * Update a project category (authenticated users only)
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

    const [conflictingCategory] = await db
      .select()
      .from(projectCategories)
      .where(and(eq(projectCategories.name, name.trim()), sql`${projectCategories.id} != ${id}`))
      .limit(1);

    if (conflictingCategory) {
      return res.status(400).json({
        success: false,
        error: 'A category with this name already exists'
      });
    }

    const [updatedCategory] = await db
      .update(projectCategories)
      .set({ name: name.trim() })
      .where(eq(projectCategories.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    console.error('Error updating project category:', error);
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
    console.error('Error deleting project category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project category'
    });
  }
});

export default router;

