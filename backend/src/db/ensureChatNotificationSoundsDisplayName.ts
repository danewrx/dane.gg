import { sql } from 'drizzle-orm';
import { db } from './index';

export async function ensureChatNotificationSoundsDisplayName(): Promise<void> {
	try {
		await db.execute(sql`
			ALTER TABLE website.chat_notification_sounds
			ADD COLUMN IF NOT EXISTS display_name varchar(120) NOT NULL DEFAULT '';
		`);
		await db.execute(sql`
			UPDATE website.chat_notification_sounds
			SET display_name = name
			WHERE display_name = '';
		`);
		await db.execute(sql`
			UPDATE website.chat_notification_sounds
			SET display_name = 'Default'
			WHERE name = 'default';
		`);
	} catch (error) {
		console.error('❌ Could not ensure chat_notification_sounds.display_name:', error);
		console.error(
			'   Apply manually: backend/drizzle/0031_chat_notification_sound_display_name.sql'
		);
	}
}
