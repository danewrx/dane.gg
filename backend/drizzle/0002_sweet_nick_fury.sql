CREATE TABLE IF NOT EXISTS "website"."uptime_kuma_monitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monitor_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(500),
	"type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"group" varchar(255),
	"uptime" integer,
	"avg_response_time" integer,
	"last_check" timestamp with time zone,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uptime_kuma_monitors_monitor_id_unique" UNIQUE("monitor_id")
);
