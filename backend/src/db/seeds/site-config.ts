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
			key: 'default_web_neko_type',
			value: 'white',
			description: 'Default Web Neko skin for new visitors (folder name on webneko.net, or none)',
			dataType: 'string'
		},
		{
			key: 'enforced_web_neko_type',
			value: 'white',
			description:
				'Web Neko skin when enforce_web_neko is true (separate from default_web_neko_type)',
			dataType: 'string'
		},
		{
			key: 'enforce_web_neko',
			value: 'false',
			description:
				'When true, all visitors use enforced_web_neko_type; local choices are ignored until disabled',
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
