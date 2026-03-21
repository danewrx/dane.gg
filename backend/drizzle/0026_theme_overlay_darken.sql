ALTER TABLE "website"."themes" ADD COLUMN IF NOT EXISTS "overlay_darken_opacity" varchar(10) DEFAULT '0' NOT NULL;--> statement-breakpoint
UPDATE "website"."themes"
SET "overlay_darken_opacity" = TRIM(BOTH FROM (regexp_match("background_overlay", ',\s*([0-9.]+)\s*\)\s*$'))[1])
WHERE "background_overlay" IS NOT NULL
  AND (regexp_match("background_overlay", ',\s*([0-9.]+)\s*\)\s*$'))[1] IS NOT NULL;
