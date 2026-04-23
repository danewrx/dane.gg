import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

for (const envPath of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')]) {
	if (existsSync(envPath)) {
		config({ path: envPath });
		break;
	}
}
