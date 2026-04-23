import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import { requireSession } from '../middleware/auth';

const router = Router();

// Rate limiting status endpoint (authenticated users only)
router.get('/rate-limits', requireSession, (req: Request, res: Response) => {
	try {
		// This would typically come from a database or cache
		// For now, we'll return the current rate limiting configuration
		const rateLimitStatus = {
			general: {
				windowMs: 15 * 60 * 1000, // 15 minutes
				max: 100,
				description: 'General API requests per IP'
			},
			auth: {
				windowMs: 15 * 60 * 1000, // 15 minutes
				max: 5,
				description: 'Authentication attempts per IP'
			},
			passwordChange: {
				windowMs: 60 * 60 * 1000, // 1 hour
				max: 3,
				description: 'Password change attempts per IP'
			},
			tokenRefresh: {
				windowMs: 60 * 60 * 1000, // 1 hour
				max: 10,
				description: 'Token refresh attempts per IP'
			},
			userCreation: {
				windowMs: 60 * 60 * 1000, // 1 hour
				max: 10,
				description: 'User creation attempts per IP'
			},
			admin: {
				windowMs: 60 * 60 * 1000, // 1 hour
				max: 50,
				description: 'Admin operations per IP'
			}
		};

		res.json({
			success: true,
			rateLimits: rateLimitStatus,
			message: 'Rate limiting configuration retrieved successfully'
		});
	} catch (error) {
		logger.error('Rate limit status error:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: 'Failed to retrieve rate limiting status'
		});
	}
});

// System health with rate limiting info
router.get('/health', (req: Request, res: Response) => {
	try {
		const health = {
			status: 'ok',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			rateLimiting: {
				enabled: true,
				middleware: ['express-rate-limit', 'express-slow-down', 'custom brute force protection']
			},
			security: {
				passwordHashing: 'bcrypt (12 rounds)',
				jwtTokens: 'enabled',
				sessionManagement: 'enabled',
				bruteForceProtection: 'enabled',
				rateLimiting: 'enabled'
			}
		};

		res.json(health);
	} catch (error) {
		logger.error('Health check error:', error);
		res.status(500).json({
			status: 'error',
			message: 'Health check failed'
		});
	}
});

export default router;
