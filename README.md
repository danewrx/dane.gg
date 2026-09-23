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

## Overview

<p align="center">
  <img src="docs/screenshots/public-home.png" alt="Public site homepage" width="49%" />
  <img src="docs/screenshots/admin-stats.png" alt="Admin dashboard" width="49%" />
</p>
<p align="center">
  <sub>Public site (left) · Admin dashboard (right)</sub>
</p>

<details>
<summary><big><strong>Public Site</strong></big></summary>
<br>

- Blog posts with tags, an RSS feed, and individual post pages.
- Project portfolio with categories, featured projects, and repository links.
- About and contact pages with skills, certifications, and social links.
- Visitor-selectable themes, fonts, weather effects, and a cursor-following cat.
- Live chat with optional Discord integration and custom emojis.
- Widgets for Discord presence, music, tweets, GitHub contributions, and service status.

| | |
| --- | --- |
| ![Blog](docs/screenshots/public-blog.png) Blog | ![Blog post](docs/screenshots/public-blog-post.png) Blog post |
| ![Projects](docs/screenshots/public-projects.png) Projects | ![About](docs/screenshots/public-about.png) About |
| ![Contact](docs/screenshots/public-contact.png) Contact | |
</details>

<details>
<summary><big><strong>Admin Dashboard</strong></big></summary>
<br>

- Session-based login with optional two-factor authentication.
- Blog and project editors with Markdown previews, image uploads, and publishing controls.
- Theme and font management, including custom CSS, backgrounds, and visual effects.
- Configuration for site content, banners, adverts, and integrations.
- Visitor analytics with charts, page statistics, and traffic breakdowns.
- Chat moderation, account settings, user management, and scoped API keys.

| | |
| --- | --- |
| ![Login](docs/screenshots/admin-login.png) Login | ![Blog list](docs/screenshots/admin-blog-list.png) Blog list |
| ![Blog editor](docs/screenshots/admin-blog-editor.png) Blog editor | ![Projects](docs/screenshots/admin-projects.png) Projects |
| ![Project editor](docs/screenshots/admin-project-editor.png) Project editor | ![Themes](docs/screenshots/admin-themes.png) Themes |

</details>

## Directory structure

```text
dane.gg/
├── apps/
│   ├── frontend/            # SvelteKit public site and admin dashboard
│   └── backend/             # Express API, database access, and WebSocket chat
├── packages/
│   └── shared/              # Utilities shared by both applications
├── testing/                 # Playwright browser tests
├── docs/                    # Guides and screenshots
├── .env                     # Local configuration (not committed)
├── .env.example.dev         # Development environment template
├── .env.example.prod        # Production environment template
├── docker-compose.dev.yml   # Development PostgreSQL and Adminer
├── docker-compose.yml       # Full container stack
├── playwright.config.ts     # Browser-test configuration
├── server.ts                # Production frontend server
└── package.json             # Root commands
```

## Development

Install [Bun](https://bun.sh) and run commands from the repository root.

Set the values in the `.env` file:

```dotenv
DATABASE_URL=postgresql://dane_gg:daneGGPassword!@localhost:5432/dane.gg
SESSION_SECRET=replace-with-a-long-random-secret
PUBLIC_ORIGIN=http://localhost:5173
BACKEND_PORT=3001
COOKIE_SECURE=false
```

<details>
<summary><strong>Docker (recommended)</strong></summary>

Requires Docker with Compose. Start PostgreSQL and Adminer in containers:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Install dependencies, initialize the schema, create an admin account, and run the
frontend and backend locally with Bun and hot reload:

```bash
bun install
(cd apps/frontend && bun install)
(cd apps/backend && bun install)
bun run db:push
bun run create:admin your-username 'your-strong-password'
bun run dev
```

Adminer is available at `http://localhost:8080`.
Stop the database containers with `docker compose -f docker-compose.dev.yml down`.

</details>

<details>
<summary><strong>Local Development</strong></summary>

Use a running PostgreSQL instance, create a database and user for the app, and update
`DATABASE_URL` in `.env` to match. Docker is not required for this option.

Install dependencies, initialize the schema, create an admin account, and start the applications:

```bash
bun install
(cd apps/frontend && bun install)
(cd apps/backend && bun install)
bun run db:push
bun run create:admin your-username 'your-strong-password'
bun run dev
```

</details>

For either option, open `http://localhost:5173`; the API runs at `http://localhost:3001`.
To load optional demo data, run `bun run db:seed` before creating your admin account on a
fresh development database. Seeding clears existing data.

## Documentation

| Guide | Contents |
| --- | --- |
| [Documentation index](docs/README.md) | Overview of the available guides |
| [Applications](apps/README.md) | Frontend and backend structure, development commands, and checks |
| [Packages](packages/README.md) | Shared package organization |
| [Shared utilities](packages/shared/README.md) | Utilities used by both applications |
| [Browser tests](testing/README.md) | Playwright setup, test coverage, and commands |
| [Authentication and permissions](docs/auth-model.md) | Sessions, API keys, account roles, and route guards |
| [Theme system](docs/theme-system.md) | Theme selection, visual settings, custom CSS, and fonts |
| [Discord integration](docs/discord-integration.md) | Chat bridge protocol, presence webhooks, and emoji synchronization |
| [Third-party integrations](docs/third-party-integrations.md) | Twitter/X, Last.fm, GitHub, Uptime Kuma, and ntfy configuration |
| [Screenshots](docs/screenshots/README.md) | README images and capture guidelines |

## Technologies

- **Frontend:** <img alt="SvelteKit" src="https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&amp;labelColor=595959&amp;logo=svelte&amp;logoColor=white" height="18"> <img alt="Svelte 5" src="https://img.shields.io/badge/Svelte%205-FF3E00?style=flat&amp;labelColor=595959&amp;logo=svelte&amp;logoColor=white" height="18"> <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&amp;labelColor=595959&amp;logo=typescript&amp;logoColor=white" height="18"> <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=flat&amp;labelColor=595959&amp;logo=vite&amp;logoColor=white" height="18">
- **Backend:** <img alt="Bun" src="https://img.shields.io/badge/Bun-14151A?style=flat&amp;labelColor=595959&amp;logo=bun&amp;logoColor=white" height="18"> <img alt="Express" src="https://img.shields.io/badge/Express-000000?style=flat&amp;labelColor=595959&amp;logo=express&amp;logoColor=white" height="18"> <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&amp;labelColor=595959&amp;logo=typescript&amp;logoColor=white" height="18">
- **Database:** <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&amp;labelColor=595959&amp;logo=postgresql&amp;logoColor=white" height="18"> <img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle%20ORM-455B20?style=flat&amp;labelColor=595959&amp;logo=drizzle&amp;logoColor=white" height="18">
- **Real-time:** <img alt="WebSocket (WS)" src="https://img.shields.io/badge/WebSocket%20%28ws%29-E06800?style=flat&amp;labelColor=595959&amp;logo=socket&amp;logoColor=white" height="18">
- **Authentication:** <img alt="Sessions" src="https://img.shields.io/badge/Sessions-4051B5?style=flat&amp;labelColor=595959&amp;logo=jsonwebtokens&amp;logoColor=white" height="18"> <img alt="API keys" src="https://img.shields.io/badge/API%20keys-555555?style=flat&amp;labelColor=595959&amp;logo=keeweb&amp;logoColor=white" height="18"> <img alt="TOTP / 2FA" src="https://img.shields.io/badge/TOTP%20%2F%202FA-00875A?style=flat&amp;labelColor=595959&amp;logo=googleauthenticator&amp;logoColor=white" height="18">
- **Testing:** <img alt="Playwright" src="https://img.shields.io/badge/Playwright-2EAD33?style=flat&amp;labelColor=595959&amp;logo=codesandbox&amp;logoColor=white" height="18"> <img alt="Vitest" src="https://img.shields.io/badge/Vitest-526B1E?style=flat&amp;labelColor=595959&amp;logo=vitest&amp;logoColor=white" height="18">
- **Containers:** <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?style=flat&amp;labelColor=595959&amp;logo=docker&amp;logoColor=white" height="18"> <img alt="Podman" src="https://img.shields.io/badge/Podman-892CA0?style=flat&amp;labelColor=595959&amp;logo=podman&amp;logoColor=white" height="18">
