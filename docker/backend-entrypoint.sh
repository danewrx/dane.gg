#!/bin/sh
set -e

cd /repo/backend

if [ "${DB_MIGRATE:-true}" = "true" ]; then
	echo "[db] Running database migrations..."
	npx drizzle-kit migrate --config drizzle.config.ts 2>&1
	echo "[db] Migrations complete"
	echo ""
else
	echo "[db] Skipping DB migrations (DB_MIGRATE=false)"
	echo ""
fi

exec tsx --tsconfig tsconfig.json src/index.ts
