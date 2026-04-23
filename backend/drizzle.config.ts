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

export default {
	schema: './src/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL || 'postgresql://dane_gg:daneGGPassword!@localhost:5432/dane.gg'
	},
	verbose: true,
	strict: true,
	schemaFilter: ['website']
} satisfies Config;
