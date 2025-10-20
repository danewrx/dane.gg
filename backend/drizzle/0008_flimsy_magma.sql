CREATE TABLE IF NOT EXISTS "website"."request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method" varchar(10) NOT NULL,
	"path" varchar(500) NOT NULL,
	"query" text,
	"visitor_id" varchar(36),
	"session_id" varchar(36),
	"ip_address" varchar(45),
	"user_agent" text,
	"country_code" varchar(2),
	"referrer" text,
	"browser" varchar(50),
	"os" varchar(50),
	"device" varchar(20),
	"screen_resolution" varchar(20),
	"language" varchar(10),
	"status_code" integer,
	"response_time" integer,
	"content_length" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "website"."site_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" varchar(36) NOT NULL,
	"session_id" varchar(36) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"country_code" varchar(2),
	"referrer" text,
	"browser" varchar(50),
	"os" varchar(50),
	"device" varchar(20),
	"screen_resolution" varchar(20),
	"language" varchar(10),
	"visit_duration" integer,
	"pages_viewed" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "website"."unique_visitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" varchar(36) NOT NULL,
	"first_visit" timestamp with time zone DEFAULT now(),
	"last_visit" timestamp with time zone DEFAULT now(),
	"total_visits" integer DEFAULT 1,
	"country_code" varchar(2),
	"browser" varchar(50),
	"os" varchar(50),
	"device" varchar(20),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unique_visitors_visitor_id_unique" UNIQUE("visitor_id")
);
--> statement-breakpoint
ALTER TABLE "website"."page_views" ADD COLUMN "browser" varchar(50);--> statement-breakpoint
ALTER TABLE "website"."page_views" ADD COLUMN "os" varchar(50);--> statement-breakpoint
ALTER TABLE "website"."page_views" ADD COLUMN "device" varchar(20);--> statement-breakpoint
ALTER TABLE "website"."page_views" ADD COLUMN "screen_resolution" varchar(20);--> statement-breakpoint
ALTER TABLE "website"."page_views" ADD COLUMN "language" varchar(10);