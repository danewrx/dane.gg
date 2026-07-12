import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import { StatsService } from '../services/statsService';

const router = Router();

const MAX_PATH_LENGTH = 512;
const MAX_QUERY_LENGTH = 1024;
const MAX_RESPONSE_TIME_MS = 300_000;

export function isValidStatusCode(v: unknown): v is number {
	return typeof v === 'number' && Number.isInteger(v) && v >= 100 && v <= 599;
}

export function isNonNegativeNumber(v: unknown): v is number {
	return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

export function isUUID(v: unknown): v is string {
	return (
		typeof v === 'string' &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
	);
}

/**
 * Pick the client-supplied ID (from localStorage/sessionStorage) when it's a
 * valid UUID, otherwise the server-generated fallback. This is what keeps a
 * visitor's identity stable across page views instead of minting a new one
 * per request.
 */
export function resolveTrackingId(clientId: unknown, fallbackId: string): string {
	return isUUID(clientId) ? clientId : fallbackId;
}

/** Clean a page path; returns null if it isn't a usable, absolute path. */
export function cleanTrackingPath(path: unknown): string | null {
	if (typeof path !== 'string' || path.length === 0) return null;
	const cleaned = path.replace(/[\x00-\x1F\x7F]/g, '').slice(0, MAX_PATH_LENGTH);
	return cleaned.startsWith('/') ? cleaned : null;
}

export function cleanTrackingQuery(query: unknown): string | undefined {
	if (typeof query !== 'string') return undefined;
	return query.replace(/[\x00-\x1F\x7F]/g, '').slice(0, MAX_QUERY_LENGTH);
}

export function normalizeStatusCode(v: unknown): number {
	return isValidStatusCode(v) ? v : 200;
}

export function normalizeResponseTime(v: unknown): number {
	return isNonNegativeNumber(v) ? Math.min(v, MAX_RESPONSE_TIME_MS) : 0;
}

export function normalizeMethod(v: unknown): string {
	return typeof v === 'string' ? v.toUpperCase().slice(0, 7) : 'GET';
}

/**
 * POST /api/track
 * Track a page view
 */
router.post('/', async (req: Request, res: Response) => {
	try {
		const { path, method, query, statusCode, responseTime, contentLength, visitorId, sessionId } =
			req.body;

		const cleanPath = cleanTrackingPath(path);
		if (!cleanPath) {
			return res.status(400).json({ error: 'Bad request', message: 'Path is required' });
		}

		const visitorData = await StatsService.extractVisitorData(req);

		// Persistent visitor ID (localStorage) + per-tab session ID (sessionStorage)
		// are supplied by the client so the same person keeps one identity across
		// page views and return visits. Validated as UUIDs to reject garbage/spoofed
		// values; fall back to the server-generated ID when absent or malformed.
		await StatsService.trackVisitor({
			...visitorData,
			visitorId: resolveTrackingId(visitorId, visitorData.visitorId),
			sessionId: resolveTrackingId(sessionId, visitorData.sessionId),
			method: normalizeMethod(method),
			path: cleanPath,
			query: cleanTrackingQuery(query),
			statusCode: normalizeStatusCode(statusCode),
			responseTime: normalizeResponseTime(responseTime),
			contentLength: isNonNegativeNumber(contentLength) ? contentLength : undefined
		});

		res.json({ success: true, message: 'Page view tracked successfully' });
	} catch (error) {
		logger.error('Error tracking page view:', error);
		res.status(500).json({ error: 'Internal server error', message: 'Failed to track page view' });
	}
});

export default router;
