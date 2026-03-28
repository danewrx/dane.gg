-- Built-in notification clip; reserved name "default"; id must match backend/src/constants/chatNotificationSounds.ts
INSERT INTO "website"."chat_notification_sounds" ("id", "name", "sound_url", "created_by")
SELECT 'a0000000-0000-4000-8000-000000000001'::uuid, 'default', '/assets/sounds/notification.mp3', NULL
WHERE NOT EXISTS (
	SELECT 1 FROM "website"."chat_notification_sounds" WHERE "name" = 'default'
);
