import { logger } from '../utils/logger';
import { Router } from 'express';
import { SocialLinksService } from '../services/socialLinksService';
import { requireSession } from '../middleware/auth';
import { sanitizeSvgInlineMarkup } from '../utils/sanitizeSvgInline';
import { validateSvgIconUrl } from '../utils/validateSvgIconUrl';

const router = Router();

const ICON_TYPES = ['coreui-brand', 'lucide', 'svg-url', 'svg-inline', 'custom-text'] as const;

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
		const { name, url, iconType, iconName, iconText, svgUrl, svgInline, displayOrder, isActive } =
			req.body;

		// Validation
		if (!name || !url) {
			return res.status(400).json({
				success: false,
				error: 'Name and URL are required'
			});
		}

		if (!iconType || !(ICON_TYPES as readonly string[]).includes(iconType)) {
			return res.status(400).json({
				success: false,
				error:
					'Valid icon type is required (coreui-brand, lucide, svg-url, svg-inline, or custom-text)'
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

		let svgUrlNormalized: string | null = null;
		if (iconType === 'svg-url') {
			const n = validateSvgIconUrl(String(svgUrl ?? ''));
			if (!n) {
				return res.status(400).json({
					success: false,
					error:
						'SVG URL must be a valid absolute http(s) URL (max 500 characters, no username/password in the URL)'
				});
			}
			svgUrlNormalized = n;
		}

		let svgInlineStored: string | null = null;
		if (iconType === 'svg-inline') {
			const safe = sanitizeSvgInlineMarkup(String(svgInline ?? ''));
			if (!safe) {
				return res.status(400).json({
					success: false,
					error:
						'Valid inline SVG markup is required when icon type is svg-inline (must start with <svg and pass safety checks)'
				});
			}
			svgInlineStored = safe;
		}

		const link = await SocialLinksService.create({
			name,
			url,
			iconType,
			iconName: iconType === 'coreui-brand' || iconType === 'lucide' ? iconName : null,
			iconText: iconType === 'custom-text' ? iconText : null,
			svgUrl: iconType === 'svg-url' ? svgUrlNormalized : null,
			svgInline: iconType === 'svg-inline' ? svgInlineStored : null,
			displayOrder: displayOrder || 0,
			isActive: isActive !== undefined ? isActive : true
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
		const { name, url, iconType, iconName, iconText, svgUrl, svgInline, displayOrder, isActive } =
			req.body;

		// Check if link exists
		const existingLink = await SocialLinksService.getById(id);
		if (!existingLink) {
			return res.status(404).json({
				success: false,
				error: 'Social link not found'
			});
		}

		// Validation
		if (iconType && !(ICON_TYPES as readonly string[]).includes(iconType)) {
			return res.status(400).json({
				success: false,
				error:
					'Valid icon type is required (coreui-brand, lucide, svg-url, svg-inline, or custom-text)'
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

		let svgUrlResolved: string | null | undefined = undefined;
		if (iconType === 'svg-url') {
			const n = validateSvgIconUrl(String(svgUrl ?? ''));
			if (!n) {
				return res.status(400).json({
					success: false,
					error:
						'SVG URL must be a valid absolute http(s) URL (max 500 characters, no username/password in the URL)'
				});
			}
			svgUrlResolved = n;
		} else if (iconType) {
			svgUrlResolved = null;
		}

		let svgInlineStored: string | null | undefined = undefined;
		if (iconType === 'svg-inline') {
			const safe = sanitizeSvgInlineMarkup(String(svgInline ?? ''));
			if (!safe) {
				return res.status(400).json({
					success: false,
					error:
						'Valid inline SVG markup is required when icon type is svg-inline (must start with <svg and pass safety checks)'
				});
			}
			svgInlineStored = safe;
		} else if (iconType) {
			svgInlineStored = null;
		}

		const link = await SocialLinksService.update(id, {
			name,
			url,
			iconType,
			iconName: iconType === 'coreui-brand' || iconType === 'lucide' ? iconName : null,
			iconText: iconType === 'custom-text' ? iconText : null,
			svgUrl: svgUrlResolved !== undefined ? svgUrlResolved : undefined,
			displayOrder,
			isActive,
			...(svgInlineStored !== undefined ? { svgInline: svgInlineStored } : {})
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
