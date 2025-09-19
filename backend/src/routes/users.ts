import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, validatePasswordStrength } from '../utils/password';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { adminLimiter, userCreationLimiter } from '../middleware/rateLimiting';

const router = Router();

// Get all users (admin only) with rate limiting
router.get('/', adminLimiter, authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      totpEnabled: users.totpEnabled
    }).from(users).orderBy(users.createdAt);

    res.json({
      success: true,
      users: allUsers,
      count: allUsers.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch users'
    });
  }
});

// Get user by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await db.select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      totpEnabled: users.totpEnabled
    }).from(users).where(eq(users.id, id)).limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({
      success: true,
      user: user[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user'
    });
  }
});

// Create new user (admin only) with rate limiting
router.post('/', userCreationLimiter, authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { username, password, isAdmin = false } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Username and password are required'
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: passwordValidation.message
      });
    }

    // Check if username already exists
    const existingUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Username already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await db.insert(users).values({
      username,
      passwordHash,
      isAdmin
    }).returning({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser[0]
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create user'
    });
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, isAdmin, totpEnabled } = req.body;

    // Check if user exists
    const existingUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    // Check if username is being changed and if it already exists
    if (username) {
      const usernameExists = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (usernameExists.length > 0 && usernameExists[0].id !== id) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Username already exists'
        });
      }
    }

    // Update user
    const updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
    if (totpEnabled !== undefined) updateData.totpEnabled = totpEnabled;

    const updatedUser = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
        totpEnabled: users.totpEnabled
      });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user!.id) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Cannot delete your own account'
      });
    }

    // Check if user exists
    const existingUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    // Delete user
    await db.delete(users).where(eq(users.id, id));

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete user'
    });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'New password is required'
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        message: passwordValidation.message
      });
    }

    // Check if user exists
    const existingUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.id, id));

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to reset password'
    });
  }
});

export default router;
