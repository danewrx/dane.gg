CREATE TABLE IF NOT EXISTS "website"."adverts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) DEFAULT '' NOT NULL,
	"description" text,
	"image_url" varchar(500) NOT NULL,
	"link_url" varchar(500) DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
