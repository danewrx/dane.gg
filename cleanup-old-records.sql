-- Cleanup script to keep only the last 30 records for each table
-- Run this in your PostgreSQL database

-- Clean up Discord status records (keep last 30)
WITH ranked_discord AS (
  SELECT id, 
         ROW_NUMBER() OVER (ORDER BY last_update DESC) as rn
  FROM website.discord_status
)
DELETE FROM website.discord_status 
WHERE id IN (
  SELECT id FROM ranked_discord WHERE rn > 30
);

-- Clean up tweet records (keep last 30)
WITH ranked_tweets AS (
  SELECT id, 
         ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM website.tweets
)
DELETE FROM website.tweets 
WHERE id IN (
  SELECT id FROM ranked_tweets WHERE rn > 30
);

-- Show remaining record counts
SELECT 'Discord Status' as table_name, COUNT(*) as record_count FROM website.discord_status
UNION ALL
SELECT 'Tweets' as table_name, COUNT(*) as record_count FROM website.tweets;
