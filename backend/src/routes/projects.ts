import { Router, Request, Response } from 'express';
import { db } from '../db';
import { projects, projectCategories, tags, projectTags } from '../db/schema';
import { eq, desc, and, sql, asc, inArray } from 'drizzle-orm';
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
        projectIcon: projects.projectIcon,
        repoUrl: projects.repoUrl,
        repoText: projects.repoText,
        repoIcon: projects.repoIcon,
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
          tags: projectTagsList
        };
      })
    );

    // Group projects by category
    const projectsByCategory = projectsWithTags.reduce((acc, project) => {
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
        projectIcon: project.projectIcon,
        repoUrl: project.repoUrl,
        repoText: project.repoText,
        repoIcon: project.repoIcon,
        displayOrder: project.displayOrder,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        tags: project.tags
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
        projectIcon: projects.projectIcon,
        repoUrl: projects.repoUrl,
        repoText: projects.repoText,
        repoIcon: projects.repoIcon,
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
          tags: projectTagsList
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithTags
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
        projectIcon: projects.projectIcon,
        repoUrl: projects.repoUrl,
        repoText: projects.repoText,
        repoIcon: projects.repoIcon,
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
      projectIcon,
      repoUrl,
      repoText,
      repoIcon,
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
        projectIcon: projectIcon || null,
        repoUrl: repoUrl || null,
        repoText: repoText || 'View Repository',
        repoIcon: repoIcon || null,
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
      const existingTags = await db
        .select()
        .from(tags)
        .where(inArray(tags.id, tagIds));

      if (existingTags.length !== tagIds.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more tag IDs are invalid'
        });
      }

      await db.insert(projectTags).values(
        tagIds.map(tagId => ({
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
      projectIcon,
      repoUrl,
      repoText,
      repoIcon,
      displayOrder,
      featured,
      createdAt,
      tagIds
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
    if (projectIcon !== undefined) updateData.projectIcon = projectIcon || null;
    if (repoUrl !== undefined) updateData.repoUrl = repoUrl || null;
    if (repoText !== undefined) updateData.repoText = repoText || 'View Repository';
    if (repoIcon !== undefined) updateData.repoIcon = repoIcon || null;
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
        projectIcon: projects.projectIcon,
        repoUrl: projects.repoUrl,
        repoText: projects.repoText,
        repoIcon: projects.repoIcon,
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
        const existingTags = await db
          .select()
          .from(tags)
          .where(inArray(tags.id, tagIds));

        if (existingTags.length !== tagIds.length) {
          return res.status(400).json({
            success: false,
            error: 'One or more tag IDs are invalid'
          });
        }

        await db.insert(projectTags).values(
          tagIds.map(tagId => ({
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
      .orderBy(asc(projectCategories.displayOrder), asc(projectCategories.name));

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
      .orderBy(asc(projectCategories.displayOrder), asc(projectCategories.name));

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

    const [maxOrderResult] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${projectCategories.displayOrder}), 0)` })
      .from(projectCategories);
    
    const newDisplayOrder = (maxOrderResult?.maxOrder || 0) + 1;

    const [newCategory] = await db
      .insert(projectCategories)
      .values({ 
        name: name.trim(),
        displayOrder: newDisplayOrder
      })
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
 * Update category display order (authenticated users only)
 * NOTE: This must be defined BEFORE /admin/categories/:id to avoid route conflicts
 */
router.put('/admin/categories/order', requireSession, async (req, res) => {
  try {
    const { categoryOrders } = req.body;

    if (!Array.isArray(categoryOrders)) {
      return res.status(400).json({
        success: false,
        error: 'categoryOrders must be an array'
      });
    }

    await Promise.all(
      categoryOrders.map(({ id, displayOrder }: { id: string; displayOrder: number }) =>
        db
          .update(projectCategories)
          .set({ displayOrder: parseInt(displayOrder.toString(), 10) })
          .where(eq(projectCategories.id, id))
      )
    );

    res.json({
      success: true,
      message: 'Category order updated successfully'
    });
  } catch (error) {
    console.error('Error updating category order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category order'
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

    const { displayOrder } = req.body;
    const updateData: any = { name: name.trim() };
    
    if (displayOrder !== undefined) {
      updateData.displayOrder = parseInt(displayOrder, 10);
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
      const tagsByCategory = allTags.reduce((acc, tag) => {
        const categoryName = tag.category?.name || 'Uncategorized';
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
      }, {} as Record<string, { category: typeof projectCategories.$inferSelect | null; tags: any[] }>);

      res.json({
        success: true,
        data: Object.values(tagsByCategory)
      });
    } else {
      res.json({
        success: true,
        data: allTags.map(tag => ({
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
    console.error('Error fetching project tags:', error);
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
    }

    const [existingTag] = await db
      .select()
      .from(tags)
      .where(eq(tags.title, title.trim()))
      .limit(1);

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
    console.error('Error creating project tag:', error);
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

    const [existingTag] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

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

        updateData.categoryId = categoryId;
      }
    }

    const [updatedTag] = await db
      .update(tags)
      .set(updateData)
      .where(eq(tags.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedTag
    });
  } catch (error) {
    console.error('Error updating project tag:', error);
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
    console.error('Error fetching projects using tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects using tag'
    });
  }
});

router.delete('/admin/tags/:id', requireSession, async (req, res) => {
  try {
    const { id } = req.params;
    await db
      .delete(projectTags)
      .where(eq(projectTags.tagId, id));

    const [deletedTag] = await db
      .delete(tags)
      .where(eq(tags.id, id))
      .returning();

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
    console.error('Error deleting project tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project tag'
    });
  }
});

export default router;

