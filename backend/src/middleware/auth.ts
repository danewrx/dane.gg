import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        isAdmin: boolean;
      };
    }
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
    const user = await db.select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin
    }).from(users).where(eq(users.id, decoded.userId)).limit(1);

    if (user.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'User no longer exists' 
      });
    }

    // Add user info to request
    req.user = user[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
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
 * Middleware to check session-based authentication
 * Checks for session user data
 */
export function requireSession(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      error: 'Access denied', 
      message: 'Session required' 
    });
  }

  // Add user info to request from session
  req.user = req.session.user;
  next();
}

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
        // Verify user still exists
        const user = await db.select({
          id: users.id,
          username: users.username,
          isAdmin: users.isAdmin
        }).from(users).where(eq(users.id, decoded.userId)).limit(1);

        if (user.length > 0) {
          req.user = user[0];
        }
      }
    }
  } catch (error) {
    console.error('Optional auth error:', error);
    // Don't fail, just continue without user
  }

  next();
}
