CREATE TABLE IF NOT EXISTS "website"."certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"earned" varchar(50),
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"image_url" varchar(500),
	"is_external" boolean DEFAULT false,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
