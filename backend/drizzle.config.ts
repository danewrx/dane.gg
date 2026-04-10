import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// Load environment variables from root .env file
config({ path: '../.env' });

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
