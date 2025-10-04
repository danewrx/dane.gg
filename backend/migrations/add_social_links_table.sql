-- Add social_links table
CREATE TABLE IF NOT EXISTS website.social_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    icon_type VARCHAR(20) NOT NULL DEFAULT 'lucide',
    icon_name VARCHAR(100),
    icon_text VARCHAR(50),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for display order
CREATE INDEX IF NOT EXISTS idx_social_links_display_order ON website.social_links(display_order);

-- Create index for active status
CREATE INDEX IF NOT EXISTS idx_social_links_is_active ON website.social_links(is_active);
