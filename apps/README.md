# Applications

This directory contains the two applications that run the website.

| Directory | Purpose |
| --- | --- |
| [frontend](#frontend) | SvelteKit and Svelte 5 public website and content management dashboard |
| [backend](#backend) | Express API, authentication, PostgreSQL access, WebSocket chat, and integrations |

Each application has its own dependencies, scripts, and Dockerfile. Install dependencies
in both application directories as described in the [setup guide](../docs/getting-started.md).

From the repository root, `bun run dev` starts both applications. Use
`bun run frontend:dev` or `bun run backend:dev` to run one application.
Reusable code consumed by both applications belongs in [packages](../packages/README.md).

## Frontend

The frontend uses SvelteKit, Svelte 5, and TypeScript to render the public website and
content management dashboard. Production builds use the Node adapter.

### Contents

Paths below are relative to `apps/frontend/`.

| Path | Contents |
| --- | --- |
| `src/routes/(site)/` | Public pages such as the blog, projects, about, and contact |
| `src/routes/(admin)/` | Login, logout, and dashboard pages |
| `src/lib/` | Reusable components, services, stores, and utilities |
| `src/hooks.server.ts` | Server-side authentication checks and page initialization |
| `src/hooks.client.ts` | Browser authentication checks and public/admin presentation changes |
| `src/app.html`, `src/app.css` | HTML shell and global styles |
| `static/` | Assets served directly, including theme images, fonts, and browser scripts |
| `vite.config.ts` | Development proxy and unit-test configuration |
| `svelte.config.js` | SvelteKit adapter and compiler configuration |
| `Dockerfile`, `server-split.mjs` | Container build and production server setup |

### Development

Follow the [root setup guide](../docs/getting-started.md) first. Run these commands from
`apps/frontend/`:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start Vite with hot reload, on port 5173 by default |
| `bun run check` | Check Svelte and TypeScript files |
| `bun run test` | Run unit tests with Vitest |
| `bun run lint` | Check formatting and lint rules |
| `bun run build` | Create a production build |

The development server proxies API, WebSocket, upload, and webhook requests to the backend
on port 3001. Use `bun run dev` from the repository root to start both applications.
Unit tests live alongside their source; browser tests live in [testing](../testing/README.md).
See the [theme guide](../docs/theme-system.md) for public-site customization.

### Frontend library organization

`$lib` resolves to `apps/frontend/src/lib/`. Its `admin/` directory contains dashboard
components, services, and state; `site/` contains public-site code; `shared/` contains code
used by both areas; and `server/` contains server-only helpers.

Use explicit imports such as `$lib/admin/services/auth` or `$lib/site/stores/theme`.
Keep server-only imports out of browser components and modules. Public-site themes and
visitor preferences are separate from dashboard appearance settings.

## Backend

The backend runs Express 5 on Bun and stores application data in PostgreSQL using Drizzle
ORM. It serves the HTTP API, session authentication, WebSocket chat, uploads, and scheduled
integrations. Its default development port is 3001.

### Contents

Paths below are relative to `apps/backend/`.

| Path | Contents |
| --- | --- |
| `src/index.ts` | Server setup, middleware, route registration, and WebSocket initialization |
| `src/routes/` | HTTP endpoints grouped by resource |
| `src/middleware/` | Authentication, permissions, and rate limiting |
| `src/services/` | Application logic, chat, and third-party integrations |
| `src/db/` | Drizzle schema, database setup, and seed data |
| `src/validation/` | Request validation |
| `src/scripts/` | Database and account maintenance commands |
| `src/constants/`, `src/types/`, `src/utils/` | Constants, type definitions, and reusable helpers |
| `drizzle/` | SQL migrations and migration metadata |
| `static/` | Files served by the backend, including uploaded assets |
| `Dockerfile`, `docker-entrypoint.sh` | Container build and startup configuration |

### Development

Follow the [root setup guide](../docs/getting-started.md) to configure the environment and
database. Run these commands from `apps/backend/`:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the API with file watching |
| `bun run typecheck` | Check TypeScript types |
| `bun run test` | Run backend unit tests |
| `bun run lint` | Check formatting and lint rules |
| `bun run db:generate` | Generate a migration from schema changes |
| `bun run db:migrate` | Apply database migrations |
| `bun run db:studio` | Browse the database with Drizzle Studio |

Tests live alongside the source as `*.test.ts` files. See the
[authentication guide](../docs/auth-model.md) before adding protected routes, and the
[integration guide](../docs/third-party-integrations.md) for service configuration.
