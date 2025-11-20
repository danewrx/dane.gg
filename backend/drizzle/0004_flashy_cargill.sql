ALTER TABLE "website"."projects" ADD COLUMN "active" varchar(20) DEFAULT 'Active' NOT NULL;--> statement-breakpoint
ALTER TABLE "website"."projects" ADD COLUMN "published" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "website"."tags" ADD COLUMN "category_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website"."tags" ADD CONSTRAINT "tags_category_id_project_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "website"."project_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
