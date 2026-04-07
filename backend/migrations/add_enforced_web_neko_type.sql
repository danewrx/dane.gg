INSERT INTO website.site_config (key, value, description, data_type, is_active)
VALUES (
  'enforced_web_neko_type',
  'white',
  'Web Neko skin when enforce_web_neko is true (separate from default_web_neko_type)',
  'string',
  true
)
ON CONFLICT (key) DO NOTHING;
