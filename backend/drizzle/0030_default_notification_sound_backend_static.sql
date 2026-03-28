-- Default clip now lives under backend static (see static/chat-sounds/default-notification.mp3)
UPDATE "website"."chat_notification_sounds"
SET "sound_url" = '/chat-sounds/default-notification.mp3'
WHERE "id" = 'a0000000-0000-4000-8000-000000000001'::uuid
   OR "name" = 'default';
