-- Default Web Neko skin for visitors without a local preference
INSERT INTO website.site_config (key, value, description, data_type, is_active)
VALUES (
  'default_web_neko_type',
  'white',
  'Default Web Neko skin for new visitors (webneko.net folder id, or none)',
  'string',
  true
)
ON CONFLICT (key) DO NOTHING;
