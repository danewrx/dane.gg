ALTER TABLE "website"."chat_notification_sounds" ADD COLUMN IF NOT EXISTS "display_name" varchar(120) NOT NULL DEFAULT '';
UPDATE "website"."chat_notification_sounds" SET "display_name" = "name" WHERE "display_name" = '';
UPDATE "website"."chat_notification_sounds" SET "display_name" = 'Default' WHERE "name" = 'default';
