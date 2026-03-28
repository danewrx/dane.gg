CREATE TABLE IF NOT EXISTS "website"."chat_notification_sounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"sound_url" varchar(500) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chat_notification_sounds_name_unique" UNIQUE("name"),
	CONSTRAINT "chat_notification_sounds_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "website"."users"("id") ON DELETE set null ON UPDATE no action
);
