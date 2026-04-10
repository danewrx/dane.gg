import { db } from '../db';
import { users } from '../db/schema';
import { hashPassword } from './password';
import { eq } from 'drizzle-orm';

/**
 * Creates a default admin user if no admin users exist in the database
 * This should be called on application startup
 */
export async function createDefaultAdmin(): Promise<void> {
	try {
		console.log('🔍 Checking for existing admin users...');

		// Check if any admin users exist
		const existingAdmins = await db.select().from(users).where(eq(users.isAdmin, true)).limit(1);

		if (existingAdmins.length > 0) {
			console.log('✅ Admin users already exist, skipping default admin creation');
			return;
		}

		console.log('⚠️  No admin users found, creating default admin...');

		// Check if any users exist at all
		const allUsers = await db.select().from(users).limit(1);

		if (allUsers.length > 0) {
			console.log('ℹ️  Regular users exist but no admins, creating admin user...');
		}

		// Create default admin user
		const defaultAdmin = {
			username: 'admin',
			passwordHash: await hashPassword('admin'), // Hash the password
			isAdmin: true,
			totpEnabled: false,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		// Insert the default admin user
		const [newAdmin] = await db.insert(users).values(defaultAdmin).returning();

		if (newAdmin) {
			console.log('🎉 Default admin user created successfully!');
			console.log('📋 Admin Credentials:');
			console.log('   Username: admin');
			console.log('   Password: admin');
			console.log('   ⚠️  IMPORTANT: Change the default password after first login!');
		} else {
			throw new Error('Failed to create default admin user');
		}
	} catch (error) {
		console.error('❌ Error creating default admin user:', error);
		throw error;
	}
}

/**
 * Checks if the database has any users at all
 * Useful for determining if this is a fresh installation
 */
export async function hasAnyUsers(): Promise<boolean> {
	try {
		const userCount = await db.select().from(users).limit(1);

		return userCount.length > 0;
	} catch (error) {
		console.error('Error checking for existing users:', error);
		return false;
	}
}

/**
 * Gets the count of admin users in the database
 */
export async function getAdminUserCount(): Promise<number> {
	try {
		const admins = await db.select().from(users).where(eq(users.isAdmin, true));

		return admins.length;
	} catch (error) {
		console.error('Error counting admin users:', error);
		return 0;
	}
}
