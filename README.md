<p align="center">
<img src="https://files.catbox.moe/ncbsm2.svg" alt="dane.gg" />
</p>
<p align="center">
A personal portfolio and blog with a content management dashboard.
</p>

<p align="center">
<a href="https://dane.gg"><img src="https://img.shields.io/website-up-down-green-red/http/dane.gg.svg" alt="" /></a>
<a href="https://github.com/danewrx/dane.gg/blob/main/LICENSE"><img src="https://img.shields.io/github/license/danewrx/dane.gg.svg?cacheBust=2" alt="License" /></a>
</p>

<p align="center">
  <img src="docs/screenshots/public-home.png" alt="Public site homepage" width="49%" />
  <img src="docs/screenshots/admin-stats.png" alt="Admin dashboard" width="49%" />
</p>
<p align="center">
  <sub>Public site (left) · Admin dashboard (right)</sub>
</p>

<details>
<summary>Public site screenshots</summary>
<br>

| | |
| --- | --- |
| ![Blog](docs/screenshots/public-blog.png) Blog | ![Blog post](docs/screenshots/public-blog-post.png) Blog post |
| ![Projects](docs/screenshots/public-projects.png) Projects | ![About](docs/screenshots/public-about.png) About |
| ![Contact](docs/screenshots/public-contact.png) Contact | |

</details>

<details>
<summary>Admin dashboard screenshots</summary>
<br>

| | |
| --- | --- |
| ![Login](docs/screenshots/admin-login.png) Login | ![Blog list](docs/screenshots/admin-blog-list.png) Blog list |
| ![Blog editor](docs/screenshots/admin-blog-editor.png) Blog editor | ![Projects](docs/screenshots/admin-projects.png) Projects |
| ![Themes](docs/screenshots/admin-themes.png) Themes | |

</details>

## Project structure

```
dane.gg/
├── frontend/                # SvelteKit app with Svelte 5 — public site + admin dashboard UI
│   └── src/
│       ├── routes/
│       │   ├── (site)/      # Public pages: home, blog, projects, about, contact
│       │   └── (admin)/     # Admin dashboard: login, logout, admin/*
│       ├── lib/
│       │   ├── site/        # Components, stores, services used only on the public site
│       │   ├── admin/       # Components, stores, services used only in the admin dashboard
│       │   ├── shared/      # Code shared between site and admin
│       │   └── server/      # Server-only helpers (SSR, etc.)
│       ├── hooks.server.ts  # Session auth check + SSR placeholder injection
│       └── app.html / app.css
│
├── backend/                 # Express 5 API server (runs on Bun)
│   └── src/
│       ├── routes/          # One file per API resource (blog, themes, users, chat, ...)
│       ├── middleware/      # Auth guards, rate limiting, etc.
│       ├── services/        # Business logic (Discord, Twitter, GitHub, Last.fm, etc.)
│       ├── db/               # Drizzle schema, seeds, migration/setup helpers
│       ├── validation/      # Request validation schemas
│       ├── constants/ types/ utils/ scripts/
│       └── index.ts         # App entrypoint — Express setup, sessions, WebSocket
│
├── shared/                  # Utilities shared between frontend and backend (e.g. SVG sanitization)
├── e2e/                     # Playwright end-to-end tests
├── docker/                  # Container entrypoint scripts
├── docker-compose.yml       # Production-style stack: frontend + backend + Postgres
├── docker-compose.dev.yml   # Local dev DB only: Postgres + Adminer
├── server.ts                # Production entrypoint — serves the built SvelteKit app
└── package.json             # Root scripts that orchestrate frontend/backend/db commands
```

## Development

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

Third-party integrations are optional. See the [integration guide](docs/third-party-integrations.md) for their credentials and settings.

### Option A — Local dev (recommended day-to-day)

Frontend and backend run natively with Bun (hot reload); only Postgres runs in Docker.

```bash
bun install
(cd frontend && bun install)
(cd backend && bun install)
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

### Useful commands

| Command | What it does |
| --- | --- |
| `bun run backend:typecheck` | Type-check the backend |
| `bun run backend:lint` | Lint + format-check the backend |
| `cd frontend && bun run check` | Type-check the frontend (svelte-check) |
| `bun run test` | Run frontend + backend unit tests |
| `bun run test:e2e` | Run Playwright end-to-end tests (`test:e2e:ui` for the UI runner) |
| `bun run db:studio` | Open Drizzle Studio against your DB |
| `bun run db:generate` | Generate a new Drizzle migration from schema changes |
| `bun run db:migrate` | Apply database migrations |
| `bun run db:adminer` | Print the Adminer URL (started as part of `db:dev:up`) |

## Documentation

- [Authentication and permissions](docs/auth-model.md)
- [Theme configuration and customization](docs/theme-system.md)
- [Discord integration protocol](docs/discord-integration.md)
- [Third-party integrations](docs/third-party-integrations.md)
- [Backend development](backend/README.md)
- [Frontend development](frontend/README.md)
