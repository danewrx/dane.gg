#!/usr/bin/env bun
/**
 * CLI script to create an admin user
 * Usage: bun run createAdmin.ts [username] [password]
 */

import { config } from 'dotenv';
import { createDefaultAdmin, hasAnyUsers, getAdminUserCount } from '../utils/createDefaultAdmin';
import { db } from '../db';
import { users } from '../db/schema';
import { hashPassword } from '../utils/password';
import { eq } from 'drizzle-orm';

// Load environment variables
config({ path: '../../.env' });

async function createAdminUser(username: string, password: string) {
  try {
    console.log(`🔍 Checking if user '${username}' already exists...`);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser.length > 0) {
      console.log(`❌ User '${username}' already exists!`);
      return;
    }

    console.log(`👤 Creating admin user '${username}'...`);

    // Create the admin user
    const newAdmin = {
      username,
      passwordHash: await hashPassword(password),
      isAdmin: true,
      totpEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [createdUser] = await db
      .insert(users)
      .values(newAdmin)
      .returning();

    if (createdUser) {
      console.log('✅ Admin user created successfully!');
      console.log(`📋 User Details:`);
      console.log(`   Username: ${createdUser.username}`);
      console.log(`   Admin: ${createdUser.isAdmin ? 'Yes' : 'No'}`);
      console.log(`   ID: ${createdUser.id}`);
    } else {
      throw new Error('Failed to create admin user');
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const username = args[0] || 'admin';
  const password = args[1] || 'admin';

  console.log('🔧 Admin User Creation Script');
  console.log('=============================');
  console.log('');

  // Show current database status
  const hasUsers = await hasAnyUsers();
  const adminCount = await getAdminUserCount();

  console.log(`📊 Database Status:`);
  console.log(`   Has users: ${hasUsers ? 'Yes' : 'No'}`);
  console.log(`   Admin count: ${adminCount}`);
  console.log('');

  if (adminCount > 0) {
    console.log('⚠️  Admin users already exist in the database.');
    console.log('   This script will create an additional admin user.');
    console.log('');
  }

  await createAdminUser(username, password);
  
  console.log('');
  console.log('🎉 Script completed successfully!');
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
