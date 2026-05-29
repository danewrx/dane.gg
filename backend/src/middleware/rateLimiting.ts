import { logger } from '../utils/logger';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { NotificationService } from '../services/notificationService';

// Store for tracking failed login attempts per IP
const failedAttempts = new Map<
	string,
	{ count: number; lastAttempt: number; lockedUntil?: number }
>();

// Clean up old entries every hour
setInterval(
	() => {
		const now = Date.now();
		for (const [ip, data] of failedAttempts.entries()) {
			if (now - data.lastAttempt > 24 * 60 * 60 * 1000) {
				// 24 hours
				failedAttempts.delete(ip);
			}
		}
	},
	60 * 60 * 1000
); // Run every hour

const DEFAULT_LOGIN_LOCKOUT_MINUTES = 15;
const MIN_LOGIN_LOCKOUT_MINUTES = 1;
const MAX_LOGIN_LOCKOUT_MINUTES = 24 * 60; // 24 hours

const DEFAULT_LOGIN_MAX_FAILED_ATTEMPTS = 5;
const MIN_LOGIN_MAX_FAILED_ATTEMPTS = 1;
const MAX_LOGIN_MAX_FAILED_ATTEMPTS = 50;

export function getLoginMaxFailedAttempts(): number {
	const raw = process.env.ADMIN_LOGIN_MAX_FAILED_ATTEMPTS?.trim();
	if (!raw) return DEFAULT_LOGIN_MAX_FAILED_ATTEMPTS;

	const parsed = Number.parseInt(raw, 10);
	if (
		!Number.isFinite(parsed) ||
		parsed < MIN_LOGIN_MAX_FAILED_ATTEMPTS ||
		parsed > MAX_LOGIN_MAX_FAILED_ATTEMPTS
	) {
		logger.warn(
			`Invalid ADMIN_LOGIN_MAX_FAILED_ATTEMPTS="${raw}" (expected ${MIN_LOGIN_MAX_FAILED_ATTEMPTS}-${MAX_LOGIN_MAX_FAILED_ATTEMPTS}), using ${DEFAULT_LOGIN_MAX_FAILED_ATTEMPTS}`
		);
		return DEFAULT_LOGIN_MAX_FAILED_ATTEMPTS;
	}

	return parsed;
}

export function getClientIp(req: {
	ip?: string;
	socket?: { remoteAddress?: string };
	connection?: { remoteAddress?: string };
}): string {
	return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

/** Minutes an IP stays locked out after too many failed admin logins (`ADMIN_LOGIN_LOCKOUT_MINUTES`). */
export function getLoginLockoutMinutes(): number {
	const raw = process.env.ADMIN_LOGIN_LOCKOUT_MINUTES?.trim();
	if (!raw) return DEFAULT_LOGIN_LOCKOUT_MINUTES;

	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed < MIN_LOGIN_LOCKOUT_MINUTES || parsed > MAX_LOGIN_LOCKOUT_MINUTES) {
		logger.warn(
			`Invalid ADMIN_LOGIN_LOCKOUT_MINUTES="${raw}" (expected ${MIN_LOGIN_LOCKOUT_MINUTES}-${MAX_LOGIN_LOCKOUT_MINUTES}), using ${DEFAULT_LOGIN_LOCKOUT_MINUTES}`
		);
		return DEFAULT_LOGIN_LOCKOUT_MINUTES;
	}

	return parsed;
}

export function getLoginLockoutWindowMs(): number {
	return getLoginLockoutMinutes() * 60 * 1000;
}

function loginLockoutRetryLabel(minutes = getLoginLockoutMinutes()): string {
	return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

const loginLockoutWindowMs = getLoginLockoutWindowMs();
const loginLockoutMinutesConfigured = getLoginLockoutMinutes();
const loginLockoutRetryAfter = loginLockoutRetryLabel(loginLockoutMinutesConfigured);

/**
 * General API rate limiting
 * 1000 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1000,
	message: {
		error: 'Too many requests',
		message: 'Too many requests from this IP, please try again later',
		retryAfter: '15 minutes'
	},
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		res.status(429).json({
			error: 'Too many requests',
			message: 'Too many requests from this IP, please try again later',
			retryAfter: '15 minutes'
		});
	}
});

const loginMaxFailedAttempts = getLoginMaxFailedAttempts();

/**
 * Strict rate limiting for authentication endpoints.
 * Cap is above lockout threshold so the Nth failed attempt still reaches the handler.
 */
export const authLimiter = rateLimit({
	windowMs: loginLockoutWindowMs,
	max: loginMaxFailedAttempts + 15,
	message: {
		error: 'Too many authentication attempts',
		message: `Too many login attempts from this IP, please try again after ${loginLockoutRetryAfter}`,
		retryAfter: loginLockoutRetryAfter
	},
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		res.status(429).json({
			error: 'Too many authentication attempts',
			message: `Too many login attempts from this IP, please try again after ${loginLockoutRetryAfter}`,
			retryAfter: loginLockoutRetryAfter
		});
	}
});

/**
 * Password change rate limiting
 * 20 attempts per hour per IP
 */
export const passwordChangeLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 20,
	message: {
		error: 'Too many password change attempts',
		message: 'Too many password change attempts from this IP, please try again later',
		retryAfter: '1 hour'
	},
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		res.status(429).json({
			error: 'Too many password change attempts',
			message: 'Too many password change attempts from this IP, please try again later',
			retryAfter: '1 hour'
		});
	}
});

/**
 * User creation rate limiting (admin only)
 * 100 users per hour per IP
 */
export const userCreationLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 100,
	message: {
		error: 'Too many user creation attempts',
		message: 'Too many user creation attempts from this IP, please try again later',
		retryAfter: '1 hour'
	},
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		res.status(429).json({
			error: 'Too many user creation attempts',
			message: 'Too many user creation attempts from this IP, please try again later',
			retryAfter: '1 hour'
		});
	}
});

/**
 * Progressive delay for failed login attempts (window matches ADMIN_LOGIN_LOCKOUT_MINUTES)
 */
export const loginSlowDown = slowDown({
	windowMs: loginLockoutWindowMs,
	delayAfter: 2, // Allow 2 requests per window, then...
	delayMs: () => 500, // Add 500ms delay per request after delayAfter
	maxDelayMs: 20000, // Maximum delay of 20 seconds
	skipSuccessfulRequests: true, // Don't count successful requests
	skipFailedRequests: false // Count failed requests
});

/**
 * Custom brute force protection for login attempts
 * Tracks failed attempts per IP and locks out after too many failures
 */
export function bruteForceProtection(req: any, res: any, next: any) {
	const ip = getClientIp(req);
	const now = Date.now();
	const maxFailedAttempts = getLoginMaxFailedAttempts();

	// Check if IP is currently locked out
	const attempts = failedAttempts.get(ip);
	if (attempts?.lockedUntil && now < attempts.lockedUntil) {
		const lockTimeRemaining = Math.ceil((attempts.lockedUntil - now) / 1000 / 60);
		return res.status(423).json({
			error: 'Account temporarily locked',
			message: `Too many failed login attempts. Try again in ${lockTimeRemaining} minutes`,
			retryAfter: `${lockTimeRemaining} minutes`
		});
	}

	// Track failed attempts
	req.trackFailedAttempt = (context?: { username?: string }) => {
		const prev = failedAttempts.get(ip);
		const wasLocked = prev?.lockedUntil != null && now < prev.lockedUntil;
		const currentAttempts = prev
			? { ...prev }
			: { count: 0, lastAttempt: 0 };

		currentAttempts.count += 1;
		currentAttempts.lastAttempt = now;

		if (currentAttempts.count >= maxFailedAttempts) {
			const lockoutMinutes = getLoginLockoutMinutes();
			const enteringLockout = !wasLocked;
			currentAttempts.lockedUntil = now + lockoutMinutes * 60 * 1000;
			logger.warn(`IP ${ip} locked out due to ${currentAttempts.count} failed login attempts`);
			if (enteringLockout) {
				NotificationService.notifyAdminLoginLockout(
					ip,
					currentAttempts.count,
					lockoutMinutes,
					context?.username
				);
			}
		} else {
			NotificationService.notifyAdminLoginFailed(
				ip,
				currentAttempts.count,
				maxFailedAttempts,
				context?.username
			);
		}

		failedAttempts.set(ip, currentAttempts);
	};

	// Reset attempts on successful login
	req.resetFailedAttempts = () => {
		failedAttempts.delete(ip);
	};

	next();
}

/**
 * Account lockout protection
 * Prevents login attempts for locked accounts
 */
export function accountLockoutProtection(req: any, res: any, next: any) {
	// TODO: integrate with user table to check if account is locked
	next();
}

/**
 * Rate limiting for token refresh
 * 100 refresh attempts per hour per IP
 */
export const tokenRefreshLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 100,
	message: {
		error: 'Too many token refresh attempts',
		message: 'Too many token refresh attempts from this IP, please try again later',
		retryAfter: '1 hour'
	},
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		res.status(429).json({
			error: 'Too many token refresh attempts',
			message: 'Too many token refresh attempts from this IP, please try again later',
			retryAfter: '1 hour'
		});
	}
});

/**
 * Admin operations rate limiting
 * 500 admin operations per hour per IP
 */
export const adminLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 500,
	message: {
		error: 'Too many admin operations',
		message: 'Too many admin operations from this IP, please try again later',
		retryAfter: '1 hour'
	},
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		res.status(429).json({
			error: 'Too many admin operations',
			message: 'Too many admin operations from this IP, please try again later',
			retryAfter: '1 hour'
		});
	}
});

/**
 * API key validation rate limiting
 * 100 attempts per 15 minutes per IP
 */
export const apiKeyValidationLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100,
	message: {
		error: 'Too many API key validation attempts',
		message: 'Too many API key validation attempts from this IP, please try again after 15 minutes',
		retryAfter: '15 minutes'
	},
	standardHeaders: true,
	legacyHeaders: false,
	handler: (req, res) => {
		res.status(429).json({
			error: 'Too many API key validation attempts',
			message:
				'Too many API key validation attempts from this IP, please try again after 15 minutes',
			retryAfter: '15 minutes'
		});
	}
});
