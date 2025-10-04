ALTER TABLE "website"."social_links" ALTER COLUMN "icon_type" SET DEFAULT 'coreui-brand';--> statement-breakpoint
ALTER TABLE "website"."social_links" ADD COLUMN "svg_url" varchar(500);