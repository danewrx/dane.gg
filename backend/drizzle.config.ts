import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

for (const p of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')]) {
	if (existsSync(p)) {
		config({ path: p });
		break;
	}
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error(
		'DATABASE_URL must be set for drizzle-kit (see .env.example.dev in the repo root).'
	);
}

export default {
	schema: './src/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: databaseUrl
	},
	verbose: true,
	strict: true,
	schemaFilter: ['website']
} satisfies Config;
