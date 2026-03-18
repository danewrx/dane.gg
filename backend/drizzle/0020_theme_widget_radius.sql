ALTER TABLE "website"."themes" ADD COLUMN IF NOT EXISTS "widget_border_radius" varchar(20) DEFAULT '8px';
UPDATE "website"."themes" SET "widget_border_radius" = "border_radius";
