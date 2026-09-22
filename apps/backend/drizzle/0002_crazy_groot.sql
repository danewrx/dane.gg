CREATE TABLE IF NOT EXISTS "website"."theme_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "theme_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "website"."themes" ADD COLUMN "category_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website"."themes" ADD CONSTRAINT "themes_category_id_theme_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "website"."theme_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
