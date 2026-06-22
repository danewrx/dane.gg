import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import { StatsService } from '../services/statsService';

const router = Router();

const MAX_PATH_LENGTH = 512;
const MAX_QUERY_LENGTH = 1024;

function isValidStatusCode(v: unknown): v is number {
	return typeof v === 'number' && Number.isInteger(v) && v >= 100 && v <= 599;
}

function isNonNegativeNumber(v: unknown): v is number {
	return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/**
 * POST /api/track
 * Track a page view
 */
router.post('/', async (req: Request, res: Response) => {
	try {
		const { path, method = 'GET', query, statusCode = 200, responseTime = 0, contentLength } =
			req.body;

		if (!path || typeof path !== 'string') {
			return res.status(400).json({ error: 'Bad request', message: 'Path is required' });
		}

		const cleanPath = path.replace(/[\x00-\x1F\x7F]/g, '').slice(0, MAX_PATH_LENGTH);
		if (!cleanPath.startsWith('/')) {
			return res.status(400).json({ error: 'Bad request', message: 'Invalid path' });
		}

		const cleanQuery =
			typeof query === 'string'
				? query.replace(/[\x00-\x1F\x7F]/g, '').slice(0, MAX_QUERY_LENGTH)
				: undefined;

		// Derive visitor/session IDs server-side from httpOnly cookies.
		const visitorData = await StatsService.extractVisitorData(req);

		await StatsService.trackVisitor({
			...visitorData,
			method: typeof method === 'string' ? method.toUpperCase().slice(0, 7) : 'GET',
			path: cleanPath,
			query: cleanQuery,
			statusCode: isValidStatusCode(statusCode) ? statusCode : 200,
			responseTime: isNonNegativeNumber(responseTime) ? Math.min(responseTime, 300_000) : 0,
			contentLength: isNonNegativeNumber(contentLength) ? contentLength : undefined
		});

		res.json({ success: true, message: 'Page view tracked successfully' });
	} catch (error) {
		logger.error('Error tracking page view:', error);
		res.status(500).json({ error: 'Internal server error', message: 'Failed to track page view' });
	}
});

export default router;
