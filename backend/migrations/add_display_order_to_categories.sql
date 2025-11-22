-- Add display_order column to project_categories table
ALTER TABLE project_categories
ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Update existing categories to have sequential display_order values
UPDATE project_categories
SET display_order = subquery.row_number
FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_number
    FROM project_categories
) AS subquery
WHERE project_categories.id = subquery.id;

