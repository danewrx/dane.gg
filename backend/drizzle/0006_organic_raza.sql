CREATE TABLE IF NOT EXISTS "website"."social_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"url" varchar(500) NOT NULL,
	"icon_type" varchar(20) DEFAULT 'lucide' NOT NULL,
	"icon_name" varchar(100),
	"icon_text" varchar(50),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
