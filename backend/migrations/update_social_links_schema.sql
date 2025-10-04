-- Update social_links table to match new schema
-- Add svg_url column if it doesn't exist
ALTER TABLE website.social_links 
ADD COLUMN IF NOT EXISTS svg_url VARCHAR(500);

-- Update icon_type default value and constraint
ALTER TABLE website.social_links 
ALTER COLUMN icon_type SET DEFAULT 'coreui-brand';

-- Update any existing records with old icon_type values
UPDATE website.social_links 
SET icon_type = 'coreui-brand' 
WHERE icon_type = 'lucide';

UPDATE website.social_links 
SET icon_type = 'coreui-brand' 
WHERE icon_type = 'brand';

UPDATE website.social_links 
SET icon_type = 'custom-text' 
WHERE icon_type = 'text';
