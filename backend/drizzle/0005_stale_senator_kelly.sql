CREATE TABLE IF NOT EXISTS "website"."discord_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" integer NOT NULL,
	"last_update" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "website"."tweets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tweet_id" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"author_name" varchar(100) NOT NULL,
	"author_username" varchar(50) NOT NULL,
	"author_profile_image" varchar(500),
	"author_profile_url" varchar(500),
	"tweet_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tweets_tweet_id_unique" UNIQUE("tweet_id")
);
