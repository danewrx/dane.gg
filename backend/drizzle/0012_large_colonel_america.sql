CREATE TABLE IF NOT EXISTS "website"."emojis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"is_custom" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "emojis_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website"."emojis" ADD CONSTRAINT "emojis_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "website"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
