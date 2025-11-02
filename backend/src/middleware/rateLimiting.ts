import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// Store for tracking failed login attempts per IP
const failedAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of failedAttempts.entries()) {
    if (now - data.lastAttempt > 24 * 60 * 60 * 1000) { // 24 hours
      failedAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Run every hour

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

/**
 * Strict rate limiting for authentication endpoints
 * 5 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
      retryAfter: '15 minutes'
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
 * Progressive delay for failed login attempts
 * Slows down responses after multiple failures
 */
export const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per 15 minutes, then...
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
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Check if IP is currently locked out
  const attempts = failedAttempts.get(ip);
  if (attempts && attempts.lockedUntil && now < attempts.lockedUntil) {
    const lockTimeRemaining = Math.ceil((attempts.lockedUntil - now) / 1000 / 60);
    return res.status(423).json({
      error: 'Account temporarily locked',
      message: `Too many failed login attempts. Try again in ${lockTimeRemaining} minutes`,
      retryAfter: `${lockTimeRemaining} minutes`
    });
  }

  // Track failed attempts
  req.trackFailedAttempt = () => {
    const currentAttempts = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    currentAttempts.count += 1;
    currentAttempts.lastAttempt = now;
    
    // Lock out after 5 failed attempts
    if (currentAttempts.count >= 5) {
      currentAttempts.lockedUntil = now + (15 * 60 * 1000); // 15 minutes
      console.warn(`IP ${ip} locked out due to ${currentAttempts.count} failed login attempts`);
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
  // This would integrate with your user table to check if account is locked
  // For now, we'll just pass through - you can add account lockout logic here
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
