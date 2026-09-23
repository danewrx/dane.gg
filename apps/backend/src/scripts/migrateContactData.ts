/**
 * Migration script to move contact page data from site_config to dedicated tables
 *
 * Run this script after applying the Drizzle migration that creates the new tables:
 * npx tsx src/scripts/migrateContactData.ts
 */

import { logger } from '../utils/logger';
import { db } from '../db';
import { siteConfig, contactEmails, contactPageSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

interface OldContactEmail {
	id: string;
	description: string;
	email: string;
	displayOrder: number;
	isActive: boolean;
}

async function migrateContactData() {
	logger.info('Starting contact data migration...\n');

	try {
		logger.info('Migrating contact emails...');
		const emailsConfig = await db
			.select()
			.from(siteConfig)
			.where(eq(siteConfig.key, 'contact_emails'))
			.limit(1);

		if (emailsConfig.length > 0 && emailsConfig[0].value) {
			try {
				const emails: OldContactEmail[] = JSON.parse(emailsConfig[0].value);

				for (const email of emails) {
					const existing = await db
						.select()
						.from(contactEmails)
						.where(eq(contactEmails.id, email.id))
						.limit(1);

					if (existing.length === 0) {
						await db.insert(contactEmails).values({
							id: email.id,
							description: email.description,
							email: email.email,
							displayOrder: email.displayOrder || 0,
							isActive: email.isActive ?? true
						});
						logger.info(`Migrated email: ${email.email}`);
					} else {
						logger.info(`Email already exists: ${email.email}`);
					}
				}
				logger.info(`Migrated ${emails.length} contact emails\n`);
			} catch (e) {
				logger.error('Error parsing contact_emails JSON:', e);
			}
		} else {
			logger.info('No contact_emails found in site_config\n');
		}

		// 2. Migrate contact_emails_header
		logger.info('Migrating emails header...');
		const emailsHeaderConfig = await db
			.select()
			.from(siteConfig)
			.where(eq(siteConfig.key, 'contact_emails_header'))
			.limit(1);

		if (emailsHeaderConfig.length > 0 && emailsHeaderConfig[0].value) {
			await migrateSettingToContactPage('emails_header', emailsHeaderConfig[0].value);
			logger.info(`Migrated emails header\n`);
		} else {
			logger.info('No contact_emails_header found in site_config\n');
		}

		// 3. Migrate contact_social_links
		logger.info('Migrating social links selection...');
		const socialLinksConfig = await db
			.select()
			.from(siteConfig)
			.where(eq(siteConfig.key, 'contact_social_links'))
			.limit(1);

		if (socialLinksConfig.length > 0 && socialLinksConfig[0].value) {
			await migrateSettingToContactPage('social_links', socialLinksConfig[0].value);
			logger.info(`Migrated social links selection\n`);
		} else {
			logger.info('No contact_social_links found in site_config\n');
		}

		// 4. Migrate contact_social_header
		logger.info('Migrating social header...');
		const socialHeaderConfig = await db
			.select()
			.from(siteConfig)
			.where(eq(siteConfig.key, 'contact_social_header'))
			.limit(1);

		if (socialHeaderConfig.length > 0 && socialHeaderConfig[0].value) {
			await migrateSettingToContactPage('social_header', socialHeaderConfig[0].value);
			logger.info(`Migrated social header\n`);
		} else {
			logger.info('No contact_social_header found in site_config\n');
		}

		// 5. Migrate contact_tagline
		logger.info('Migrating contact tagline...');
		const taglineConfig = await db
			.select()
			.from(siteConfig)
			.where(eq(siteConfig.key, 'contact_tagline'))
			.limit(1);

		if (taglineConfig.length > 0 && taglineConfig[0].value) {
			await migrateSettingToContactPage('tagline', taglineConfig[0].value);
			logger.info(`Migrated contact tagline\n`);
		} else {
			logger.info('No contact_tagline found in site_config\n');
		}

		logger.info('Migration complete!\n');
		logger.info('Next steps:');
		logger.info('   1. Verify the data in the new tables');
		logger.info('   2. Test the contact page and admin pages');
		logger.info('   3. Once confirmed working, you can optionally delete the old keys from site_config:\n');
		logger.info('      - contact_emails');
		logger.info('      - contact_emails_header');
		logger.info('      - contact_social_links');
		logger.info('      - contact_social_header');
		logger.info('      - contact_tagline\n');
	} catch (error) {
		logger.error('Migration failed:', error);
		process.exit(1);
	}
}

async function migrateSettingToContactPage(key: string, value: string) {
	// Check if already migrated
	const existing = await db
		.select()
		.from(contactPageSettings)
		.where(eq(contactPageSettings.key, key))
		.limit(1);

	if (existing.length === 0) {
		await db.insert(contactPageSettings).values({
			key,
			value
		});
	} else {
		// Update if already exists
		await db
			.update(contactPageSettings)
			.set({ value, updatedAt: new Date() })
			.where(eq(contactPageSettings.key, key));
	}
}

// Run the migration
migrateContactData()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		logger.error('Migration error:', error);
		process.exit(1);
	});
