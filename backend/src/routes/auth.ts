import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt';
import { authenticateToken, requireSession } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { 
  authLimiter, 
  passwordChangeLimiter, 
  tokenRefreshLimiter,
  loginSlowDown,
  bruteForceProtection 
} from '../middleware/rateLimiting';
import { adminSessions } from '../services/adminSessions';

const router = Router();

// Login route with rate limiting and brute force protection
router.post('/login', authLimiter, loginSlowDown, bruteForceProtection, async (req: Request, res: Response) => {
  try {
    const { username, password, rememberMe } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Username and password are required'
      });
    }

    // Find user by username
    const user = await db.select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      themePreference: users.themePreference,
      accentColor: users.accentColor,
      totpEnabled: users.totpEnabled
    }).from(users).where(eq(users.username, username)).limit(1);

    if (user.length === 0) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    const userData = user[0];

    // Verify password
    const isValidPassword = await verifyPassword(password, userData.passwordHash);
    if (!isValidPassword) {
      // Track failed attempt for brute force protection
      (req as any).trackFailedAttempt();
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    // Reset failed attempts on successful login
    (req as any).resetFailedAttempts();

    // Check if TOTP is enabled for this user
    if (userData.totpEnabled) {
      const { totpCode, backupCode } = req.body;
      
      // If no TOTP code provided, request it
      if (!totpCode && !backupCode) {
        return res.status(202).json({
          requiresTOTP: true,
          message: 'Two-factor authentication required',
          username: userData.username
        });
      }

      // Verify TOTP code or backup code
      const { TotpService } = await import('../services/totpService.js');
      let totpValid = false;

      if (totpCode) {
        totpValid = await TotpService.verifyTotpForUser(userData.id, totpCode);
      } else if (backupCode) {
        totpValid = await TotpService.verifyBackupCode(userData.id, backupCode);
      }

      if (!totpValid) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid two-factor authentication code'
        });
      }
    }

    // Generate tokens
    const tokens = generateTokenPair({
      id: userData.id,
      username: userData.username,
      isAdmin: userData.isAdmin || false
    });

    // Set session data
    if (req.session) {
      req.session.user = {
        id: userData.id,
        username: userData.username,
        isAdmin: userData.isAdmin || false,
        themePreference: userData.themePreference || 'system',
        accentColor: userData.accentColor || '#3b82f6'
      };
      
      // Register admin session for WebSocket auth
      if (userData.isAdmin && req.sessionID) {
        adminSessions.register(req.sessionID, userData.id, userData.username);
      }
    }

    // Set session cookie options based on remember me
    if (req.session) {
      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      } else {
        req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
      }
    }

    // Set secure HTTP-only cookies for tokens
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: userData.id,
        username: userData.username,
        isAdmin: userData.isAdmin || false,
        themePreference: userData.themePreference || 'system',
        accentColor: userData.accentColor || '#3b82f6'
      },
      expiresIn: tokens.expiresIn
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed'
    });
  }
});

// Logout route
router.post('/logout', (req: Request, res: Response) => {
  try {
    // Remove admin session for WebSocket auth
    if (req.sessionID) {
      adminSessions.remove(req.sessionID);
    }
    
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Logout failed'
        });
      }

      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      res.clearCookie('connect.sid'); // Session cookie

      res.json({
        success: true,
        message: 'Logout successful'
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Logout failed'
    });
  }
});

// Refresh token route with rate limiting
router.post('/refresh', tokenRefreshLimiter, async (req: Request, res: Response) => {
  try {
    // Get refresh token from cookies
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({
        error: 'Authentication failed',
        message: 'Invalid or expired refresh token'
      });
    }

    // Get user data
    const user = await db.select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
      themePreference: users.themePreference,
      accentColor: users.accentColor
    }).from(users).where(eq(users.id, decoded.userId)).limit(1);

    if (user.length === 0) {
      return res.status(403).json({
        error: 'Authentication failed',
        message: 'User no longer exists'
      });
    }

    // Generate new tokens
    const tokens = generateTokenPair({
      id: user[0].id,
      username: user[0].username,
      isAdmin: user[0].isAdmin || false
    });

    // Update session
    if (req.session) {
      req.session.user = {
        id: user[0].id,
        username: user[0].username,
        isAdmin: user[0].isAdmin || false,
        themePreference: user[0].themePreference || 'system',
        accentColor: user[0].accentColor || '#3b82f6'
      };
    }

    // Set new cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Token refresh failed'
    });
  }
});

// Verify user route (check if user is authenticated)
router.get('/verify', authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user,
    message: 'User is authenticated'
  });
});

// Get current user from session
router.get('/me', async (req: Request, res: Response) => {
  if (req.session && req.session.user) {
    try {
      // Get user with theme preference from database
      const user = await db.select({
        id: users.id,
        username: users.username,
        isAdmin: users.isAdmin,
        themePreference: users.themePreference,
        accentColor: users.accentColor
      }).from(users).where(eq(users.id, req.session.user.id)).limit(1);

      if (user.length > 0) {
        const userData = user[0];
        res.json({
          success: true,
          user: userData,
          message: 'User session found'
        });
      } else {
        res.status(401).json({
          error: 'Not authenticated',
          message: 'User not found'
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.json({
        success: true,
        user: req.session.user,
        message: 'User session found'
      });
    }
  } else {
    res.status(401).json({
      error: 'Not authenticated',
      message: 'No active session'
    });
  }
});

// Change password route with rate limiting (requires authentication)
router.post('/change-password', passwordChangeLimiter, authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Current password and new password are required'
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: passwordValidation.message
      });
    }

    // Get current user with password hash
    const user = await db.select({
      id: users.id,
      passwordHash: users.passwordHash
    }).from(users).where(eq(users.id, req.user!.id)).limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    // Verify current password
    const isValidCurrentPassword = await verifyPassword(currentPassword, user[0].passwordHash);
    if (!isValidCurrentPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password in database
    await db.update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, req.user!.id));

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Password change failed'
    });
  }
});

// Update username
router.post('/update-username', requireSession, async (req: Request, res: Response) => {
  try {
    const { newUsername, currentPassword } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!newUsername || typeof newUsername !== 'string') {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'New username is required'
      });
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Current password is required'
      });
    }

    // Validate username format (alphanumeric, underscore, hyphen)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(newUsername)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens'
      });
    }

    // Get current user data
    const currentUser = await db.select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (currentUser.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    const user = currentUser[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect'
      });
    }

    // Check if username is the same
    if (newUsername === user.username) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'New username must be different from current username'
      });
    }

    // Check if username already exists
    const existingUser = await db.select({
      id: users.id
    }).from(users).where(eq(users.username, newUsername)).limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        error: 'Username taken',
        message: 'Username is already taken'
      });
    }

    // Update username
    await db.update(users)
      .set({ username: newUsername })
      .where(eq(users.id, userId));

    // Update session user data
    if (req.session && req.session.user) {
      req.session.user.username = newUsername;
    }

    res.json({
      success: true,
      message: 'Username updated successfully',
      user: {
        id: user.id,
        username: newUsername,
        isAdmin: req.user!.isAdmin || false
      }
    });

  } catch (error) {
    console.error('Update username error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Username update failed'
    });
  }
});

// Check username availability
router.post('/check-username', requireSession, async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    const currentUserId = req.user!.id;

    // Validate input
    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Username is required'
      });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.json({
        available: false,
        reason: 'invalid_format',
        message: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens'
      });
    }

    // Check if username is the same as current user's username
    const currentUser = await db.select({
      username: users.username
    }).from(users).where(eq(users.id, currentUserId)).limit(1);

    if (currentUser.length > 0 && currentUser[0].username === username) {
      return res.json({
        available: false,
        reason: 'current_username',
        message: 'This is your current username'
      });
    }

    // Check if username already exists
    const existingUser = await db.select({
      id: users.id
    }).from(users).where(eq(users.username, username)).limit(1);

    if (existingUser.length > 0) {
      return res.json({
        available: false,
        reason: 'taken',
        message: 'Username is already taken'
      });
    }

    // Username is available
    res.json({
      available: true,
      message: 'Username is available'
    });

  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Username check failed'
    });
  }
});

export default router;
