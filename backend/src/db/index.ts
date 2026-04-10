import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import * as schema from './schema';

// Load environment variables from root .env file
config({ path: '../../.env' });

const connectionString =
	process.env.DATABASE_URL || 'postgresql://dane_gg:daneGGPassword!@localhost:5432/dane.gg';

// Create the connection
const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export * from './schema';
