ALTER TABLE "website"."projects" ADD COLUMN "logo_url" varchar(255);--> statement-breakpoint
ALTER TABLE "website"."projects" ADD COLUMN "logo_bg_color" varchar(50);--> statement-breakpoint
ALTER TABLE "website"."projects" ADD COLUMN "logo_border" boolean DEFAULT false;