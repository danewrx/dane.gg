import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../services/statsService';

/**
 * Middleware to track request statistics
 * This should be used on all public routes that need tracking
 */
export async function trackStats(req: Request, res: Response, next: NextFunction) {
	const startTime = Date.now();

	// Skip tracking for certain paths (only track actual pages)
	const skipPaths = [
		'/api/',
		'/favicon.ico',
		'/robots.txt',
		'/assets/',
		'/static/',
		'/_app/',
		'/_svelte/',
		'/latest-tweet',
		'/nowplaying',
		'/discord-status',
		'/social-links',
		'/widgets/',
		'/webhooks/'
	];

	const shouldSkip = skipPaths.some((path) => req.path.startsWith(path));

	if (shouldSkip) {
		return next();
	}

	// Skip if API request
	if (req.path.startsWith('/api/')) {
		return next();
	}

	// Only track GET requests for actual pages
	if (req.method !== 'GET') {
		return next();
	}

	// Only track actual page routes
	const isPageRoute =
		!req.path.includes('/api/') &&
		!req.path.includes('/latest-tweet') &&
		!req.path.includes('/nowplaying') &&
		!req.path.includes('/discord-status') &&
		!req.path.includes('/social-links') &&
		!req.path.includes('/widgets/') &&
		!req.path.includes('/webhooks/') &&
		!req.path.includes('/favicon') &&
		!req.path.includes('/robots') &&
		!req.path.includes('/assets/') &&
		!req.path.includes('/static/') &&
		!req.path.includes('/_app/') &&
		!req.path.includes('/_svelte/');

	if (!isPageRoute) {
		return next();
	}

	const visitorData = await StatsService.extractVisitorData(req);

	res.cookie('visitor_id', visitorData.visitorId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
	});

	res.cookie('session_id', visitorData.sessionId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 24 * 60 * 60 * 1000 // 1 day
	});

	// Override res.end to track response data
	const originalEnd = res.end;
	res.end = function (chunk?: any, encoding?: any, cb?: () => void) {
		const responseTime = Date.now() - startTime;

		StatsService.trackVisitor({
			...visitorData,
			method: req.method,
			path: req.path,
			query: req.url.includes('?') ? req.url.split('?')[1] : undefined,
			statusCode: res.statusCode,
			responseTime,
			contentLength: res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : undefined
		}).catch((error) => {
			logger.error('Error tracking visitor data:', error);
		});

		return originalEnd.call(this, chunk, encoding, cb);
	};

	next();
}
