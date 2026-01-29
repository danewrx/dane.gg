import { Router } from 'express';
import { db } from '../db';
import { skillCategories, skills } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET all skill categories with their skills (public)
router.get('/', async (req, res) => {
  try {
    const categories = await db.query.skillCategories.findMany({
      with: {
        skills: {
          orderBy: [asc(skills.displayOrder)]
        }
      },
      orderBy: [asc(skillCategories.displayOrder)]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills'
    });
  }
});

// GET all skill categories (admin)
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const categories = await db.query.skillCategories.findMany({
      orderBy: [asc(skillCategories.displayOrder)]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching skill categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skill categories'
    });
  }
});

// POST create a new skill category
router.post('/categories', requireAuth, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    const allCategories = await db.select().from(skillCategories);
    const maxOrder = allCategories.reduce((max, cat) => 
      Math.max(max, cat.displayOrder), -1);

    const [newCategory] = await db.insert(skillCategories).values({
      name,
      color: color || '#6366f1',
      displayOrder: maxOrder + 1
    }).returning();

    res.status(201).json({
      success: true,
      data: newCategory
    });
  } catch (error: any) {
    console.error('Error creating skill category:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'A category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create skill category'
    });
  }
});

// Update category order (bulk)
router.put('/categories/order', requireAuth, async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        error: 'Categories array is required'
      });
    }

    // Update category display order
    for (const cat of categories) {
      await db.update(skillCategories)
        .set({ 
          displayOrder: cat.displayOrder,
          updatedAt: new Date()
        })
        .where(eq(skillCategories.id, cat.id));
    }

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

// PUT update a skill category
router.put('/categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, displayOrder } = req.body;

    const updateData: Record<string, any> = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    const [updatedCategory] = await db.update(skillCategories)
      .set(updateData)
      .where(eq(skillCategories.id, id))
      .returning();

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: updatedCategory
    });
  } catch (error: any) {
    console.error('Error updating skill category:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'A category with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update skill category'
    });
  }
});

// DELETE a skill category
router.delete('/categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [deletedCategory] = await db.delete(skillCategories)
      .where(eq(skillCategories.id, id))
      .returning();

    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting skill category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete skill category'
    });
  }
});

// GET all skills for a category
router.get('/categories/:categoryId/skills', requireAuth, async (req, res) => {
  try {
    const { categoryId } = req.params;

    const categorySkills = await db.select()
      .from(skills)
      .where(eq(skills.categoryId, categoryId))
      .orderBy(asc(skills.displayOrder));

    res.json({
      success: true,
      data: categorySkills
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills'
    });
  }
});

// POST create a new skill
router.post('/skills', requireAuth, async (req, res) => {
  try {
    const { name, level, categoryId } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Skill name and category ID are required'
      });
    }

    // Verify category exists
    const category = await db.select()
      .from(skillCategories)
      .where(eq(skillCategories.id, categoryId))
      .limit(1);

    if (category.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Get max display order for this category
    const categorySkills = await db.select()
      .from(skills)
      .where(eq(skills.categoryId, categoryId));
    
    const maxOrder = categorySkills.reduce((max, skill) => 
      Math.max(max, skill.displayOrder), -1);

    const [newSkill] = await db.insert(skills).values({
      name,
      level: Math.min(100, Math.max(0, level || 50)),
      categoryId,
      displayOrder: maxOrder + 1
    }).returning();

    res.status(201).json({
      success: true,
      data: newSkill
    });
  } catch (error) {
    console.error('Error creating skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create skill'
    });
  }
});

// PUT update a skill
router.put('/skills/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, level, categoryId, displayOrder } = req.body;

    const updateData: Record<string, any> = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (level !== undefined) updateData.level = Math.min(100, Math.max(0, level));
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    const [updatedSkill] = await db.update(skills)
      .set(updateData)
      .where(eq(skills.id, id))
      .returning();

    if (!updatedSkill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      });
    }

    res.json({
      success: true,
      data: updatedSkill
    });
  } catch (error) {
    console.error('Error updating skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update skill'
    });
  }
});

// DELETE a skill
router.delete('/skills/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [deletedSkill] = await db.delete(skills)
      .where(eq(skills.id, id))
      .returning();

    if (!deletedSkill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      });
    }

    res.json({
      success: true,
      message: 'Skill deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete skill'
    });
  }
});

// PUT update skills order within a category (bulk)
router.put('/skills/order', requireAuth, async (req, res) => {
  try {
    const { skills: skillsToUpdate } = req.body;

    if (!Array.isArray(skillsToUpdate)) {
      return res.status(400).json({
        success: false,
        error: 'Skills array is required'
      });
    }

    // Update each skill's display order
    for (const skill of skillsToUpdate) {
      await db.update(skills)
        .set({ 
          displayOrder: skill.displayOrder,
          updatedAt: new Date()
        })
        .where(eq(skills.id, skill.id));
    }

    res.json({
      success: true,
      message: 'Skills order updated successfully'
    });
  } catch (error) {
    console.error('Error updating skills order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update skills order'
    });
  }
});

export default router;
