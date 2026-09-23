-- Create the website schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS website;

-- Grant usage on schema to the database user
GRANT USAGE ON SCHEMA website TO dane_gg;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA website 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dane_gg;

-- Set default permissions for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA website 
GRANT USAGE, SELECT ON SEQUENCES TO dane_gg;
