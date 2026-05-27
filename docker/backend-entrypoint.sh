#!/bin/sh
set -e

cd /repo/backend

if [ "${DB_MIGRATE:-true}" = "true" ]; then
	echo "[db] Running database migrations..."

	max_attempts="${DB_MIGRATE_MAX_ATTEMPTS:-30}"
	retry_delay="${DB_MIGRATE_RETRY_DELAY_SECONDS:-3}"
	attempt=1

	while true; do
		if npx drizzle-kit migrate --config drizzle.config.ts 2>&1; then
			break
		fi

		if [ "$attempt" -ge "$max_attempts" ]; then
			echo "[db] Migrations failed after ${attempt} attempts"
			exit 1
		fi

		echo "[db] Migration attempt ${attempt}/${max_attempts} failed, retrying in ${retry_delay}s..."
		attempt=$((attempt + 1))
		sleep "$retry_delay"
	done

	echo "[db] Migrations complete"
	echo ""
else
	echo "[db] Skipping DB migrations (DB_MIGRATE=false)"
	echo ""
fi

exec tsx --tsconfig tsconfig.json src/index.ts
