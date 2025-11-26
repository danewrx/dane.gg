CREATE TABLE IF NOT EXISTS "website"."chat_moderation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(20) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "website"."messages" ADD COLUMN "visitor_id" varchar(36);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website"."chat_moderation_rules" ADD CONSTRAINT "chat_moderation_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "website"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
