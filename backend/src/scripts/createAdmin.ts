#!/usr/bin/env bun
/**
 * CLI script to create an admin user
 * Usage: bun run createAdmin.ts [username] [password]
 */

import { logger } from '../utils/logger';
import { config } from 'dotenv';
import { hasAnyUsers, getAdminUserCount } from '../utils/createDefaultAdmin';
import { db } from '../db';
import { users } from '../db/schema';
import { hashPassword } from '../utils/password';
import { eq } from 'drizzle-orm';

// Load environment variables
config({ path: '../../.env' });

async function createAdminUser(username: string, password: string) {
	try {
		logger.info(`Checking if user '${username}' already exists...`);

		// Check if user already exists
		const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);

		if (existingUser.length > 0) {
			logger.info(`User '${username}' already exists!`);
			return;
		}

		logger.info(`Creating admin user '${username}'...`);

		// Create the admin user
		const newAdmin = {
			username,
			passwordHash: await hashPassword(password),
			isAdmin: true,
			totpEnabled: false,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		const [createdUser] = await db.insert(users).values(newAdmin).returning();

		if (createdUser) {
			logger.info('Admin user created successfully!');
			logger.info(`User Details:`);
			logger.info(`   Username: ${createdUser.username}`);
			logger.info(`   Admin: ${createdUser.isAdmin ? 'Yes' : 'No'}`);
			logger.info(`   ID: ${createdUser.id}`);
		} else {
			throw new Error('Failed to create admin user');
		}
	} catch (error) {
		logger.error('Error creating admin user:', error);
		process.exit(1);
	}
}

async function main() {
	const args = process.argv.slice(2);
	const username = args[0] || 'admin';
	const password = args[1] || 'admin';

	logger.info('🔧 Admin User Creation Script');
	logger.info('=============================');
	logger.info('');

	// Show current database status
	const hasUsers = await hasAnyUsers();
	const adminCount = await getAdminUserCount();

	logger.info(`Database Status:`);
	logger.info(`   Has users: ${hasUsers ? 'Yes' : 'No'}`);
	logger.info(`   Admin count: ${adminCount}`);
	logger.info('');

	if (adminCount > 0) {
		logger.info('Admin users already exist in the database.');
		logger.info('   This script will create an additional admin user.');
		logger.info('');
	}

	await createAdminUser(username, password);

	logger.info('');
	logger.info('Script completed successfully!');
}

// Run the script
main().catch((error) => {
	logger.error('Script failed:', error);
	process.exit(1);
});
