import { Router } from 'express';
import { SocialLinksService } from '../services/socialLinksService';
import { requireSession } from '../middleware/auth';

const router = Router();

// Get all active social links (public)
router.get('/', async (req, res) => {
  try {
    const links = await SocialLinksService.getAll();

    res.json({
      success: true,
      data: links
    });
  } catch (error) {
    console.error('❌ Social Links API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch social links'
    });
  }
});

// Get all social links for admin
router.get('/admin', requireSession, async (req, res) => {
  try {
    const links = await SocialLinksService.getAllForAdmin();

    res.json({
      success: true,
      data: links
    });
  } catch (error) {
    console.error('❌ Social Links Admin API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch social links for admin'
    });
  }
});

// Get single social link by ID
router.get('/:id', requireSession, async (req, res) => {
  try {
    const { id } = req.params;
    const link = await SocialLinksService.getById(id);

    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Social link not found'
      });
    }

    res.json({
      success: true,
      data: link
    });
  } catch (error) {
    console.error('❌ Social Links API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch social link'
    });
  }
});

// Create a new social link
router.post('/', requireSession, async (req, res) => {
  try {
    const { name, url, iconType, iconName, iconText, svgUrl, displayOrder, isActive } = req.body;

    // Validation
    if (!name || !url) {
      return res.status(400).json({
        success: false,
        error: 'Name and URL are required'
      });
    }

    if (!iconType || !['coreui-brand', 'lucide', 'svg-url', 'custom-text'].includes(iconType)) {
      return res.status(400).json({
        success: false,
        error: 'Valid icon type is required (coreui-brand, lucide, svg-url, or custom-text)'
      });
    }

    if (iconType === 'custom-text' && !iconText) {
      return res.status(400).json({
        success: false,
        error: 'Icon text is required when icon type is custom-text'
      });
    }

    if ((iconType === 'coreui-brand' || iconType === 'lucide') && !iconName) {
      return res.status(400).json({
        success: false,
        error: 'Icon name is required when icon type is coreui-brand or lucide'
      });
    }

    if (iconType === 'svg-url' && !req.body.svgUrl) {
      return res.status(400).json({
        success: false,
        error: 'SVG URL is required when icon type is svg-url'
      });
    }

    const link = await SocialLinksService.create({
      name,
      url,
      iconType,
      iconName: (iconType === 'coreui-brand' || iconType === 'lucide') ? iconName : null,
      iconText: iconType === 'custom-text' ? iconText : null,
      svgUrl: iconType === 'svg-url' ? svgUrl : null,
      displayOrder: displayOrder || 0,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      data: link
    });
  } catch (error) {
    console.error('❌ Social Links API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create social link'
    });
  }
});

// Update a social link
router.put('/:id', requireSession, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, iconType, iconName, iconText, svgUrl, displayOrder, isActive } = req.body;

    // Check if link exists
    const existingLink = await SocialLinksService.getById(id);
    if (!existingLink) {
      return res.status(404).json({
        success: false,
        error: 'Social link not found'
      });
    }

    // Validation
    if (iconType && !['coreui-brand', 'lucide', 'svg-url', 'custom-text'].includes(iconType)) {
      return res.status(400).json({
        success: false,
        error: 'Valid icon type is required (coreui-brand, lucide, svg-url, or custom-text)'
      });
    }

    if (iconType === 'custom-text' && !iconText) {
      return res.status(400).json({
        success: false,
        error: 'Icon text is required when icon type is custom-text'
      });
    }

    if ((iconType === 'coreui-brand' || iconType === 'lucide') && !iconName) {
      return res.status(400).json({
        success: false,
        error: 'Icon name is required when icon type is coreui-brand or lucide'
      });
    }

    if (iconType === 'svg-url' && !svgUrl) {
      return res.status(400).json({
        success: false,
        error: 'SVG URL is required when icon type is svg-url'
      });
    }

    const link = await SocialLinksService.update(id, {
      name,
      url,
      iconType,
      iconName: (iconType === 'coreui-brand' || iconType === 'lucide') ? iconName : null,
      iconText: iconType === 'custom-text' ? iconText : null,
      svgUrl: iconType === 'svg-url' ? svgUrl : null,
      displayOrder,
      isActive
    });

    res.json({
      success: true,
      data: link
    });
  } catch (error) {
    console.error('❌ Social Links API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update social link'
    });
  }
});

// Delete a social link
router.delete('/:id', requireSession, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SocialLinksService.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Social link not found'
      });
    }

    res.json({
      success: true,
      message: 'Social link deleted successfully'
    });
  } catch (error) {
    console.error('❌ Social Links API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete social link'
    });
  }
});

// Toggle active status
router.patch('/:id/toggle', requireSession, async (req, res) => {
  try {
    const { id } = req.params;
    const link = await SocialLinksService.toggleActive(id);

    res.json({
      success: true,
      data: link
    });
  } catch (error) {
    console.error('❌ Social Links API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle social link status'
    });
  }
});

// Update display order
router.patch('/reorder', requireSession, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'Updates array is required'
      });
    }

    await SocialLinksService.updateDisplayOrder(updates);

    res.json({
      success: true,
      message: 'Display order updated successfully'
    });
  } catch (error) {
    console.error('❌ Social Links API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update display order'
    });
  }
});

export default router;
