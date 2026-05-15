import { logger } from '../utils/logger';
import { Router } from 'express';
import { SocialLinksService } from '../services/socialLinksService';
import { requireSession } from '../middleware/auth';
import {
	validateCreateSocialLinkBody,
	validateUpdateSocialLinkIconFields
} from '../validation/socialLinkPayload';

const router = Router();

// Get all active social links (public)
router.get('/', async (req, res) => {
	try {
		const links = await SocialLinksService.getAll();

		res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
		res.json({
			success: true,
			data: links
		});
	} catch (error) {
		logger.error('Social Links API Error:', error);
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
		logger.error('Social Links Admin API Error:', error);
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
		logger.error('Social Links API Error:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to fetch social link'
		});
	}
});

// Create a new social link
router.post('/', requireSession, async (req, res) => {
	try {
		const validated = validateCreateSocialLinkBody(req.body);
		if ('error' in validated) {
			return res.status(400).json({
				success: false,
				error: validated.error
			});
		}

		const link = await SocialLinksService.create({
			name: validated.name,
			url: validated.url,
			iconType: validated.iconType,
			iconName: validated.iconName,
			iconText: validated.iconText,
			svgUrl: validated.svgUrl,
			svgInline: validated.svgInline,
			displayOrder: validated.displayOrder,
			isActive: validated.isActive
		});

		res.status(201).json({
			success: true,
			data: link
		});
	} catch (error) {
		logger.error('Social Links API Error:', error);
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
		const { name, url, iconType, iconName, iconText, displayOrder, isActive } = req.body;

		// Check if link exists
		const existingLink = await SocialLinksService.getById(id);
		if (!existingLink) {
			return res.status(404).json({
				success: false,
				error: 'Social link not found'
			});
		}

		const iconFields = validateUpdateSocialLinkIconFields(req.body);
		if ('error' in iconFields) {
			return res.status(400).json({
				success: false,
				error: iconFields.error
			});
		}

		const { svgUrlResolved, svgInlineStored } = iconFields;

		const link = await SocialLinksService.update(id, {
			name,
			url,
			iconType,
			iconName: iconType === 'coreui-brand' || iconType === 'lucide' ? iconName : null,
			iconText: iconType === 'custom-text' ? iconText : null,
			svgUrl: svgUrlResolved === undefined ? undefined : svgUrlResolved,
			displayOrder,
			isActive,
			...(svgInlineStored === undefined ? {} : { svgInline: svgInlineStored })
		});

		res.json({
			success: true,
			data: link
		});
	} catch (error) {
		logger.error('Social Links API Error:', error);
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
		logger.error('Social Links API Error:', error);
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
		logger.error('Social Links API Error:', error);
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
		logger.error('Social Links API Error:', error);
		res.status(500).json({
			success: false,
			error: 'Failed to update display order'
		});
	}
});

export default router;
