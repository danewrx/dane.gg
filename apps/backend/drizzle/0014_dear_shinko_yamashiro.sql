ALTER TABLE "website"."project_categories" DROP CONSTRAINT "project_categories_name_unique";--> statement-breakpoint
ALTER TABLE "website"."project_categories" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website"."project_categories" ADD CONSTRAINT "project_categories_parent_id_project_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "website"."project_categories"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_categories_top_level_name_unique" ON "website"."project_categories" USING btree ("name") WHERE "website"."project_categories"."parent_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_categories_parent_name_unique" ON "website"."project_categories" USING btree ("parent_id","name");