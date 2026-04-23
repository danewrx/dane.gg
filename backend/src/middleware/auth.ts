import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { db } from '../db';
import { users, apiKeys } from '../db/schema';
import { eq } from 'drizzle-orm';
import { apiKeyValidationLimiter } from './rateLimiting';
import crypto from 'crypto';

/** HTTP paths a `chat`-scoped API key may access (GET/HEAD/OPTIONS only). */
const CHAT_SCOPED_PATH_PREFIXES = ['/api/chat', '/api/emojis', '/api/chat-notification-sounds'];

function requestPathname(req: Request): string {
	try {
		return new URL(req.originalUrl || req.url || '/', 'http://localhost').pathname;
	} catch {
		return (req.baseUrl || '') + (req.path || '') || '/';
	}
}

/**
 * Restrict what API keys may do over HTTP. Session/JWT users are unaffected.
 * Call after `req.user` is set from an API key.
 */
export function enforceApiKeyHttpScope(req: Request, res: Response, next: NextFunction): void {
	if (!req.user?.isApiKey || !req.user.apiKeyPermissions) {
		next();
		return;
	}

	const perm = req.user.apiKeyPermissions;
	if (perm === 'full') {
		next();
		return;
	}

	const method = req.method.toUpperCase();
	const path = requestPathname(req);
	const safeReadMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';

	const forbidden = (message: string) => {
		res.status(403).json({
			error: 'Forbidden',
			message
		});
	};

	switch (perm) {
		case 'read':
			if (!safeReadMethod) {
				forbidden('Read-only API keys may only use GET, HEAD, or OPTIONS');
				return;
			}
			if (path.startsWith('/webhooks')) {
				forbidden('Read-only API keys cannot access /webhooks routes');
				return;
			}
			next();
			return;

		case 'chat':
			if (!safeReadMethod) {
				forbidden('Chat API keys may only use GET, HEAD, or OPTIONS on the HTTP API');
				return;
			}
			if (path.startsWith('/webhooks')) {
				forbidden('Chat API keys cannot access /webhooks routes');
				return;
			}
			if (
				!CHAT_SCOPED_PATH_PREFIXES.some(
					(prefix) => path === prefix || path.startsWith(prefix + '/')
				)
			) {
				forbidden(
					'Chat API keys may only access /api/chat, /api/emojis, and /api/chat-notification-sounds'
				);
				return;
			}
			next();
			return;

		case 'webhooks':
			if (!path.startsWith('/webhooks')) {
				forbidden('Webhooks API keys may only call paths under /webhooks');
				return;
			}
			if (method !== 'POST' && method !== 'OPTIONS') {
				forbidden('Webhooks API keys may only use POST (or OPTIONS) on /webhooks routes');
				return;
			}
			next();
			return;

		default:
			forbidden('Unknown API key permission scope');
	}
}

function continueAfterSessionOrApiKey(req: Request, res: Response, next: NextFunction): void {
	if (req.user?.isApiKey) {
		enforceApiKeyHttpScope(req, res, next);
		return;
	}
	next();
}

/**
 * Hash an API key using SHA-256
 */
function hashApiKey(key: string): string {
	return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Constant-time comparison of two hash strings
 */
function constantTimeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}
	try {
		return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
	} catch {
		return false;
	}
}

/**
 * Validate an API key and return user-like object if valid
 */
async function validateApiKey(
	key: string
): Promise<{
	id: string;
	username: string;
	isAdmin: boolean;
	isApiKey: true;
	apiKeyPermissions: string;
} | null> {
	try {
		// Extract prefix from key
		const prefix = key.substring(0, 11); // dk_ + 8 chars
		const keyHash = hashApiKey(key);

		// Find the API key in the database
		const [result] = await Promise.all([
			db
				.select({
					id: apiKeys.id,
					name: apiKeys.name,
					keyHash: apiKeys.keyHash,
					isActive: apiKeys.isActive,
					expiresAt: apiKeys.expiresAt,
					permissions: apiKeys.permissions
				})
				.from(apiKeys)
				.where(eq(apiKeys.keyPrefix, prefix))
				.limit(1),
			new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 10)))
		]);

		const storedHash = result.length > 0 ? result[0].keyHash : '0'.repeat(64);

		if (!constantTimeCompare(keyHash, storedHash)) {
			return null;
		}

		if (result.length === 0) {
			return null;
		}

		const apiKey = result[0];

		if (!apiKey.isActive) {
			return null;
		}

		if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
			return null;
		}

		// Update last used timestamp
		db.update(apiKeys)
			.set({ lastUsedAt: new Date() })
			.where(eq(apiKeys.id, apiKey.id))
			.catch((err) => logger.error('Failed to update API key last used:', err));

		// Return a user-like object
		return {
			id: apiKey.id,
			username: `api:${apiKey.name}`,
			isAdmin: apiKey.permissions === 'full',
			isApiKey: true,
			apiKeyPermissions: apiKey.permissions
		};
	} catch (error) {
		logger.error('Error validating API key:', error);
		return null;
	}
}

/**
 * Middleware to authenticate JWT tokens
 * Checks for Authorization header with Bearer token
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
	try {
		const authHeader = req.headers.authorization;
		const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

		if (!token) {
			return res.status(401).json({
				error: 'Access denied',
				message: 'No token provided'
			});
		}

		const decoded = verifyAccessToken(token);
		if (!decoded) {
			return res.status(403).json({
				error: 'Access denied',
				message: 'Invalid or expired token'
			});
		}

		// Verify user still exists in database
		const user = await db
			.select({
				id: users.id,
				username: users.username,
				isAdmin: users.isAdmin
			})
			.from(users)
			.where(eq(users.id, decoded.userId))
			.limit(1);

		if (user.length === 0) {
			return res.status(403).json({
				error: 'Access denied',
				message: 'User no longer exists'
			});
		}

		req.user = {
			...user[0],
			isAdmin: user[0].isAdmin ?? false
		};
		next();
	} catch (error) {
		logger.error('Auth middleware error:', error);
		return res.status(500).json({
			error: 'Internal server error',
			message: 'Authentication failed'
		});
	}
}

/**
 * Middleware to check if user is admin
 * Must be used after authenticateToken
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
	if (!req.user) {
		return res.status(401).json({
			error: 'Access denied',
			message: 'Authentication required'
		});
	}

	if (!req.user.isAdmin) {
		return res.status(403).json({
			error: 'Access denied',
			message: 'Admin privileges required'
		});
	}

	next();
}

/**
 * After requireAuth / requireSession: allow site admins (session) or API keys with `full` or `webhooks` permission.
 * Keys scoped to `webhooks` only cannot use other routes; use this on webhook HTTP endpoints.
 */
export function requireWebhookAccess(req: Request, res: Response, next: NextFunction) {
	if (!req.user) {
		return res.status(401).json({
			error: 'Access denied',
			message: 'Authentication required'
		});
	}

	if (req.user.isApiKey) {
		const p = req.user.apiKeyPermissions;
		if (p === 'full' || p === 'webhooks') {
			return next();
		}
		return res.status(403).json({
			error: 'Access denied',
			message: 'API key must have Full Access or Webhooks Only permission for this endpoint'
		});
	}

	if (req.user.isAdmin) {
		return next();
	}

	return res.status(403).json({
		error: 'Access denied',
		message: 'Admin privileges required'
	});
}

/**
 * Middleware to check session-based authentication
 * Checks for session user data first, then API key
 */
export async function requireSession(req: Request, res: Response, next: NextFunction) {
	// Check session
	if (req.session?.user) {
		req.user = req.session.user;
		continueAfterSessionOrApiKey(req, res, next);
		return;
	}

	// Fall back to API key auth
	const authHeader = req.headers.authorization;
	const xApiKey = req.headers['x-api-key'];

	let apiKey: string | undefined;

	if (authHeader?.startsWith('Bearer dk_')) {
		apiKey = authHeader.substring(7);
	} else if (xApiKey && typeof xApiKey === 'string' && xApiKey.startsWith('dk_')) {
		apiKey = xApiKey;
	}

	if (apiKey) {
		return new Promise<void>((resolve) => {
			apiKeyValidationLimiter(req, res, async () => {
				if (res.headersSent) {
					return resolve(); // Rate limit exceeded
				}

				const user = await validateApiKey(apiKey);
				if (user) {
					req.user = user;
					enforceApiKeyHttpScope(req, res, next);
					return resolve();
				}
				res.status(403).json({
					error: 'Access denied',
					message: 'Invalid or expired API key'
				});
				resolve();
			});
		});
	}

	return res.status(401).json({
		error: 'Access denied',
		message: 'Authentication required (session or API key)'
	});
}

/**
 * Middleware to authenticate via API key
 * Check for Authorization: Bearer or X-Api-Key header
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
	try {
		// Check for API key in auth header
		const authHeader = req.headers.authorization;
		let apiKey: string | undefined;

		if (authHeader?.startsWith('Bearer dk_')) {
			apiKey = authHeader.substring(7); // Remove 'Bearer '
		} else if (req.headers['x-api-key'] && typeof req.headers['x-api-key'] === 'string') {
			apiKey = req.headers['x-api-key'];
		}

		if (!apiKey) {
			return res.status(401).json({
				error: 'Access denied',
				message: 'API key required. Provide via Authorization: Bearer dk_... or X-Api-Key header.'
			});
		}

		return new Promise<void>((resolve) => {
			apiKeyValidationLimiter(req, res, async () => {
				if (res.headersSent) {
					return resolve(); // Rate limit exceeded
				}

				const user = await validateApiKey(apiKey!);
				if (!user) {
					res.status(403).json({
						error: 'Access denied',
						message: 'Invalid or expired API key'
					});
					return resolve();
				}

				req.user = user;
				enforceApiKeyHttpScope(req, res, next);
				resolve();
			});
		});
	} catch (error) {
		logger.error('API key auth error:', error);
		return res.status(500).json({
			error: 'Internal server error',
			message: 'Authentication failed'
		});
	}
}

/**
 * Middleware that accepts either session OR API key authentication
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
	// Check for API key first
	const authHeader = req.headers.authorization;
	const xApiKey = req.headers['x-api-key'];

	if (
		authHeader?.startsWith('Bearer dk_') ||
		(xApiKey && typeof xApiKey === 'string' && xApiKey.startsWith('dk_'))
	) {
		// Use API key auth
		return apiKeyAuth(req, res, next);
	}

	// Fall back to session auth
	if (req.session?.user) {
		req.user = req.session.user;
		continueAfterSessionOrApiKey(req, res, next);
		return;
	}

	return res.status(401).json({
		error: 'Access denied',
		message: 'Authentication required (session or API key)'
	});
}

/**
 * Export the validateApiKey function for use in WebSocket auth
 */
export { validateApiKey, hashApiKey };

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't fail if missing
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const authHeader = req.headers.authorization;
		const token = authHeader && authHeader.split(' ')[1];

		if (token) {
			const decoded = verifyAccessToken(token);
			if (decoded) {
				const user = await db
					.select({
						id: users.id,
						username: users.username,
						isAdmin: users.isAdmin
					})
					.from(users)
					.where(eq(users.id, decoded.userId))
					.limit(1);

				if (user.length > 0) {
					req.user = {
						...user[0],
						isAdmin: user[0].isAdmin ?? false
					};
				}
			}
		}
	} catch (error) {
		logger.error('Optional auth error:', error);
	}

	next();
}
