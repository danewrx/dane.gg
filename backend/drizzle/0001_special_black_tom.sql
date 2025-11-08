CREATE TABLE IF NOT EXISTS "website"."user_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"path" varchar(500) NOT NULL,
	"size" integer NOT NULL,
	"mimetype" varchar(100) NOT NULL,
	"is_external" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "website"."visitor_stats" ADD COLUMN "is_vpn" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "website"."user_uploads" ADD CONSTRAINT "user_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "website"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
