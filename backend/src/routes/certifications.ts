import { Router } from 'express';
import { db } from '../db';
import { certifications } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET all certifications (public)
router.get('/', async (req, res) => {
  try {
    const certs = await db.select()
      .from(certifications)
      .orderBy(asc(certifications.displayOrder));

    res.json({
      success: true,
      data: certs
    });
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch certifications'
    });
  }
});

// GET all certifications (admin)
router.get('/all', requireAuth, async (req, res) => {
  try {
    const certs = await db.select()
      .from(certifications)
      .orderBy(asc(certifications.displayOrder));

    res.json({
      success: true,
      data: certs
    });
  } catch (error) {
    console.error('Error fetching certifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch certifications'
    });
  }
});

// POST create new certification
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, earned, endDate, isPresent, status, imageUrl, isExternal } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Certification title is required'
      });
    }

    if (!earned) {
      return res.status(400).json({
        success: false,
        error: 'Start date (earned) is required'
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image is required'
      });
    }

    // Auto-set status
    let finalStatus = status;
    if (!finalStatus) {
      if (isPresent) {
        finalStatus = 'Active';
      } else if (endDate) {
        finalStatus = 'Expired';
      } else {
        finalStatus = 'Active';
      }
    }

    const allCerts = await db.select().from(certifications);
    const maxOrder = allCerts.reduce((max, cert) => 
      Math.max(max, cert.displayOrder), -1);

    const [newCert] = await db.insert(certifications).values({
      title,
      earned: earned || null,
      endDate: endDate || null,
      isPresent: isPresent || false,
      status: finalStatus,
      imageUrl: imageUrl || null,
      isExternal: isExternal || false,
      displayOrder: maxOrder + 1
    }).returning();

    res.status(201).json({
      success: true,
      data: newCert
    });
  } catch (error) {
    console.error('Error creating certification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create certification'
    });
  }
});

// PUT update certification
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, earned, endDate, isPresent, status, imageUrl, isExternal, displayOrder, autoSetStatus } = req.body;

    const updateData: Record<string, any> = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (earned !== undefined) updateData.earned = earned;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (isPresent !== undefined) updateData.isPresent = isPresent;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isExternal !== undefined) updateData.isExternal = isExternal;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    // Auto-set status (autoSetStatus flag = true)
    if (autoSetStatus) {
      if (isPresent) {
        updateData.status = 'Active';
      } else if (endDate) {
        updateData.status = 'Expired';
      } else {
        updateData.status = 'Active';
      }
    } else if (status !== undefined) {
      updateData.status = status;
    }

    const [updatedCert] = await db.update(certifications)
      .set(updateData)
      .where(eq(certifications.id, id))
      .returning();

    if (!updatedCert) {
      return res.status(404).json({
        success: false,
        error: 'Certification not found'
      });
    }

    res.json({
      success: true,
      data: updatedCert
    });
  } catch (error) {
    console.error('Error updating certification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update certification'
    });
  }
});

// DELETE certification
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [deletedCert] = await db.delete(certifications)
      .where(eq(certifications.id, id))
      .returning();

    if (!deletedCert) {
      return res.status(404).json({
        success: false,
        error: 'Certification not found'
      });
    }

    res.json({
      success: true,
      message: 'Certification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting certification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete certification'
    });
  }
});

// PUT update certifications order (bulk)
router.put('/order', requireAuth, async (req, res) => {
  try {
    const { certifications: certsToUpdate } = req.body;

    if (!Array.isArray(certsToUpdate)) {
      return res.status(400).json({
        success: false,
        error: 'Certifications array is required'
      });
    }

    for (const cert of certsToUpdate) {
      await db.update(certifications)
        .set({ 
          displayOrder: cert.displayOrder,
          updatedAt: new Date()
        })
        .where(eq(certifications.id, cert.id));
    }

    res.json({
      success: true,
      message: 'Certifications order updated successfully'
    });
  } catch (error) {
    console.error('Error updating certifications order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update certifications order'
    });
  }
});

export default router;
