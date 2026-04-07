INSERT INTO website.site_config (key, value, description, data_type, is_active)
VALUES (
  'enforce_web_neko',
  'false',
  'When true, all visitors use enforced_web_neko_type; local choices are ignored until disabled',
  'boolean',
  true
)
ON CONFLICT (key) DO NOTHING;
