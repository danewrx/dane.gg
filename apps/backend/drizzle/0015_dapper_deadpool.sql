CREATE TABLE IF NOT EXISTS "website"."button_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(100) DEFAULT '' NOT NULL,
	"link_url" varchar(500) NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
