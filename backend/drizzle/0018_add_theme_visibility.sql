-- Add is_visible column to themes table
ALTER TABLE "website"."themes" ADD COLUMN "is_visible" boolean DEFAULT true;
