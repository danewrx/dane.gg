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

## Overview

<details>
<summary><h5>Public Site</h5></summary>
<br>

| | |
| --- | --- |
| ![Blog](docs/screenshots/public-blog.png) Blog | ![Blog post](docs/screenshots/public-blog-post.png) Blog post |
| ![Projects](docs/screenshots/public-projects.png) Projects | ![About](docs/screenshots/public-about.png) About |
| ![Contact](docs/screenshots/public-contact.png) Contact | |
</details>

<details>
<summary><h5>Admin Dashboard</h5></summary>
<br>

| | |
| --- | --- |
| ![Login](docs/screenshots/admin-login.png) Login | ![Blog list](docs/screenshots/admin-blog-list.png) Blog list |
| ![Blog editor](docs/screenshots/admin-blog-editor.png) Blog editor | ![Projects](docs/screenshots/admin-projects.png) Projects |
| ![Project editor](docs/screenshots/admin-project-editor.png) Project editor | ![Themes](docs/screenshots/admin-themes.png) Themes |

</details>

## Development

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

Third-party integrations are optional. See the [integration guide](docs/third-party-integrations.md) for their credentials and settings.

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

### Checks and maintenance

See [apps](apps/README.md) for type checks, unit tests, and database commands, and
[testing](testing/README.md) for browser tests.

## Repository guide

| Directory | Contents |
| --- | --- |
| [apps/](apps/README.md) | Frontend, backend, and application development commands |
| [packages/](packages/README.md) | Utilities shared by the applications |
| [testing/](testing/README.md) | Playwright browser tests |
| [docs/](docs/README.md) | Authentication, themes, and integration guides |

## Technologies

- **Frontend:** <img alt="SvelteKit" src="https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&amp;labelColor=595959&amp;logo=svelte&amp;logoColor=white" height="18"> <img alt="Svelte 5" src="https://img.shields.io/badge/Svelte%205-FF3E00?style=flat&amp;labelColor=595959&amp;logo=svelte&amp;logoColor=white" height="18"> <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&amp;labelColor=595959&amp;logo=typescript&amp;logoColor=white" height="18"> <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=flat&amp;labelColor=595959&amp;logo=vite&amp;logoColor=white" height="18">
- **Backend:** <img alt="Bun" src="https://img.shields.io/badge/Bun-14151A?style=flat&amp;labelColor=595959&amp;logo=bun&amp;logoColor=white" height="18"> <img alt="Express" src="https://img.shields.io/badge/Express-000000?style=flat&amp;labelColor=595959&amp;logo=express&amp;logoColor=white" height="18"> <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&amp;labelColor=595959&amp;logo=typescript&amp;logoColor=white" height="18">
- **Database:** <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&amp;labelColor=595959&amp;logo=postgresql&amp;logoColor=white" height="18"> <img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle%20ORM-455B20?style=flat&amp;labelColor=595959&amp;logo=drizzle&amp;logoColor=white" height="18">
- **Real-time:** <img alt="WebSocket (ws)" src="https://img.shields.io/badge/WebSocket%20%28ws%29-E06800?style=flat&amp;labelColor=595959" height="18">
- **Authentication:** <img alt="Sessions" src="https://img.shields.io/badge/Sessions-4051B5?style=flat&amp;labelColor=595959" height="18"> <img alt="API keys" src="https://img.shields.io/badge/API%20keys-555555?style=flat&amp;labelColor=595959" height="18"> <img alt="TOTP / 2FA" src="https://img.shields.io/badge/TOTP%20%2F%202FA-00875A?style=flat&amp;labelColor=595959" height="18">
- **Testing:** <img alt="Playwright" src="https://img.shields.io/badge/Playwright-2EAD33?style=flat&amp;labelColor=595959" height="18"> <img alt="Vitest" src="https://img.shields.io/badge/Vitest-526B1E?style=flat&amp;labelColor=595959&amp;logo=vitest&amp;logoColor=white" height="18">
- **Containers:** <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?style=flat&amp;labelColor=595959&amp;logo=docker&amp;logoColor=white" height="18">
