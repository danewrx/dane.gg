import fs from 'node:fs';
import path from 'node:path';
import { getOgBranding, renderOgPng } from '../services/ogImage';

// Writes static fallback card for pages without a preview image
const output = path.resolve(process.cwd(), '../frontend/static/assets/og-default.png');
const branding = await getOgBranding();
fs.writeFileSync(
	output,
	await renderOgPng({
		title: 'Dane Buchanan',
		meta: 'software engineer & freelance designer',
		pill: 'dane.gg',
		coverDataUri: branding.background,
		logoDataUri: branding.logo
	})
);
console.log('Wrote', output);
process.exit(0);
