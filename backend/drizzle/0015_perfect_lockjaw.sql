ALTER TABLE "website"."certifications" ADD COLUMN "end_date" varchar(50);--> statement-breakpoint
ALTER TABLE "website"."certifications" ADD COLUMN "is_present" boolean DEFAULT false;