ALTER TABLE "website"."themes" ADD COLUMN IF NOT EXISTS "shell_border_width" varchar(10) DEFAULT '2px' NOT NULL;
ALTER TABLE "website"."themes" ADD COLUMN IF NOT EXISTS "widget_border_width" varchar(10) DEFAULT '2px' NOT NULL;
ALTER TABLE "website"."themes" ADD COLUMN IF NOT EXISTS "shell_shadow" varchar(20) DEFAULT 'medium' NOT NULL;
ALTER TABLE "website"."themes" ADD COLUMN IF NOT EXISTS "content_max_width" varchar(12) DEFAULT '900px' NOT NULL;
ALTER TABLE "website"."themes" ADD COLUMN IF NOT EXISTS "scanlines_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "website"."themes" ADD COLUMN IF NOT EXISTS "scanlines_opacity" varchar(10) DEFAULT '1' NOT NULL;
ALTER TABLE "website"."themes" ADD COLUMN IF NOT EXISTS "body_line_height" varchar(10) DEFAULT '1.65' NOT NULL;
