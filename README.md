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

Manage posts, projects, themes, and site settings through the admin dashboard.

<p align="center">
  <img src="docs/screenshots/public-home.png" alt="Public site homepage" width="49%" />
  <img src="docs/screenshots/admin-stats.png" alt="Admin dashboard" width="49%" />
</p>
<p align="center">
  <sub>Public site (left) · Admin dashboard (right)</sub>
</p>

<h3 align="center">Public site screenshots</h3>

<details>
<summary>View screenshots</summary>
<br>

| | |
| --- | --- |
| ![Blog](docs/screenshots/public-blog.png) Blog | ![Blog post](docs/screenshots/public-blog-post.png) Blog post |
| ![Projects](docs/screenshots/public-projects.png) Projects | ![About](docs/screenshots/public-about.png) About |
| ![Contact](docs/screenshots/public-contact.png) Contact | |

</details>

<h3 align="center">Admin dashboard screenshots</h3>

<details>
<summary>View screenshots</summary>
<br>

| | |
| --- | --- |
| ![Login](docs/screenshots/admin-login.png) Login | ![Blog list](docs/screenshots/admin-blog-list.png) Blog list |
| ![Blog editor](docs/screenshots/admin-blog-editor.png) Blog editor | ![Projects](docs/screenshots/admin-projects.png) Projects |
| ![Project editor](docs/screenshots/admin-project-editor.png) Project editor | ![Themes](docs/screenshots/admin-themes.png) Themes |

</details>

## Technologies

- **Frontend & admin:** <img alt="SvelteKit" src="https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&amp;labelColor=595959&amp;logo=svelte&amp;logoColor=white" height="18"> <img alt="Svelte 5" src="https://img.shields.io/badge/Svelte%205-FF3E00?style=flat&amp;labelColor=595959&amp;logo=svelte&amp;logoColor=white" height="18"> <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&amp;labelColor=595959&amp;logo=typescript&amp;logoColor=white" height="18"> <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=flat&amp;labelColor=595959&amp;logo=vite&amp;logoColor=white" height="18">
- **Backend:** <img alt="Bun" src="https://img.shields.io/badge/Bun-14151A?style=flat&amp;labelColor=595959&amp;logo=bun&amp;logoColor=white" height="18"> <img alt="Express" src="https://img.shields.io/badge/Express-000000?style=flat&amp;labelColor=595959&amp;logo=express&amp;logoColor=white" height="18"> <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&amp;labelColor=595959&amp;logo=typescript&amp;logoColor=white" height="18">
- **Database:** <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&amp;labelColor=595959&amp;logo=postgresql&amp;logoColor=white" height="18"> <img alt="Drizzle ORM" src="https://img.shields.io/badge/Drizzle%20ORM-455B20?style=flat&amp;labelColor=595959&amp;logo=drizzle&amp;logoColor=white" height="18">
- **Real-time:** <img alt="WebSocket (ws)" src="https://img.shields.io/badge/WebSocket%20%28ws%29-E06800?style=flat&amp;labelColor=595959" height="18">
- **Authentication:** <img alt="Sessions" src="https://img.shields.io/badge/Sessions-4051B5?style=flat&amp;labelColor=595959" height="18"> <img alt="API keys" src="https://img.shields.io/badge/API%20keys-555555?style=flat&amp;labelColor=595959" height="18"> <img alt="TOTP / 2FA" src="https://img.shields.io/badge/TOTP%20%2F%202FA-00875A?style=flat&amp;labelColor=595959" height="18">
- **Testing:** <img alt="Playwright" src="https://img.shields.io/badge/Playwright-2EAD33?style=flat&amp;labelColor=595959" height="18"> <img alt="Vitest" src="https://img.shields.io/badge/Vitest-526B1E?style=flat&amp;labelColor=595959&amp;logo=vitest&amp;logoColor=white" height="18">
- **Containers:** <img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?style=flat&amp;labelColor=595959&amp;logo=docker&amp;logoColor=white" height="18">

## Development

Install [Bun](https://bun.sh) and Docker, then follow the
[setup guide](docs/getting-started.md) to install dependencies and configure your database
and environment. Once configured, start both applications from the repository root:

```bash
bun run dev
```

The frontend runs at `http://localhost:5173` and the API at `http://localhost:3001`.
For a container deployment, use the [Docker instructions](docs/getting-started.md#option-b--fully-dockerized-closer-to-production).

## Repository guide

| Directory | Contents |
| --- | --- |
| [apps/](apps/README.md) | Frontend, backend, and application development commands |
| [packages/](packages/README.md) | Utilities shared by the applications |
| [testing/](testing/README.md) | Playwright browser tests |
| [docs/](docs/README.md) | Setup, authentication, themes, and integration guides |
