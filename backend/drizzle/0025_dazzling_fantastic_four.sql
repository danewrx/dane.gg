ALTER TABLE "website"."themes" ADD COLUMN "scanlines_opacity" varchar(10) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "website"."themes" ADD COLUMN "overlay_vignette_opacity" varchar(10) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "website"."themes" ADD COLUMN "overlay_grid_opacity" varchar(10) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "website"."themes" ADD COLUMN "overlay_grain_opacity" varchar(10) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "website"."themes" ADD COLUMN "overlay_glare_opacity" varchar(10) DEFAULT '0' NOT NULL;