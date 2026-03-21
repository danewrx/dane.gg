import { db } from '../index';
import { siteConfig } from '../schema';

export async function seedSiteConfig() {
  console.log('⚙️ Seeding site configuration...');
  await db.insert(siteConfig).values([
    {
      key: 'default_weather_type',
      value: 'none',
      description: 'Default weather effect type (none, rain, snow)',
      dataType: 'string'
    },
    {
      key: 'default_weather_speed',
      value: '1.0',
      description: 'Default weather effect speed multiplier',
      dataType: 'number'
    },
    {
      key: 'enforce_weather_effects',
      value: 'false',
      description: 'Whether to prevent users from changing weather effects',
      dataType: 'boolean'
    },
    {
      key: 'site_title',
      value: 'dane.gg - Software Engineer & Designer',
      description: 'Site title for SEO and display',
      dataType: 'string'
    },
    {
      key: 'site_description',
      value: "Hi, I'm Dane! I'm a software engineer & freelance designer from Manchester, UK.",
      description: 'Site description for SEO',
      dataType: 'string'
    },
    {
      key: 'site_theme_enforcement',
      value: JSON.stringify({ enforced: false, themeId: null }),
      description:
        'When enforced: all visitors use themeId; theme picker is disabled on the public site',
      dataType: 'json'
    }
  ]);
}
