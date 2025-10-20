CREATE TABLE IF NOT EXISTS "website"."visitor_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" varchar(36) NOT NULL,
	"session_id" varchar(36) NOT NULL,
	"method" varchar(10) NOT NULL,
	"path" varchar(500) NOT NULL,
	"query" text,
	"status_code" integer NOT NULL,
	"response_time" integer NOT NULL,
	"content_length" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"country" varchar(100),
	"browser" varchar(50),
	"os" varchar(50),
	"device" varchar(50),
	"screen_resolution" varchar(20),
	"language" varchar(10),
	"referrer" text,
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "website"."website_stats" CASCADE;