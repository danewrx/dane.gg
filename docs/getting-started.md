# Getting started

Run the commands below from the repository root.


Prerequisites: [Bun](https://bun.sh) (latest) and Docker (or Podman — every `docker:*`/`db:dev:*` script has a `podman:*` equivalent).

### Environment variables

```bash
cp .env.example.dev .env
```

Set `SESSION_SECRET` to a random value. For the included development database, set:

```dotenv
DATABASE_URL=postgresql://dane_gg:daneGGPassword!@localhost:5432/dane.gg
PUBLIC_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
```

Third-party integrations are optional. See the [integration guide](third-party-integrations.md) for their credentials and settings.

### Option A — Local dev (recommended day-to-day)

Frontend and backend run natively with Bun (hot reload); only Postgres runs in Docker.

```bash
bun install
(cd apps/frontend && bun install)
(cd apps/backend && bun install)
bun run db:dev:up    # starts Postgres + Adminer (http://localhost:8080) via docker-compose.dev.yml
bun run db:push      # push the Drizzle schema to the DB
bun run db:seed      # seed default data (themes, tags, etc.)
bun run create:admin your-username 'your-strong-password'
bun run dev          # frontend (:5173) + backend (:3001) concurrently
```

Run `db:seed` only on a fresh development database: it clears existing seeded data.
Open the frontend URL printed by Vite; its default port is 5173.

Tear down the dev DB with `bun run db:dev:down` when you're done.

### Option B — Fully Dockerized (closer to production)

Frontend, backend, and Postgres all run in containers.

```bash
cp .env.example.prod .env
# Configure database credentials, SESSION_SECRET, and PUBLIC_ORIGIN before starting.
docker compose up -d --build # migrations run automatically
bun run docker:logs         # tail logs
bun run docker:down         # stop everything
```

For local HTTP testing, set `PUBLIC_ORIGIN=http://localhost:3000` and `COOKIE_SECURE=false`.
For an HTTPS deployment, use your public URL and `COOKIE_SECURE=true`.
Rebuild the containers after changing application code.

## Checks and maintenance

See [apps](../apps/README.md) for type checks, unit tests, and database commands, and
[testing](../testing/README.md) for browser tests.
