# Frontend

The frontend uses SvelteKit, Svelte 5, and TypeScript for the public website and content
management dashboard. Production builds use the Node adapter.

Follow the [project setup guide](../README.md#development) first. Run these commands
from `frontend/`:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start Vite with hot reload, on port 5173 by default |
| `bun run check` | Check Svelte and TypeScript files |
| `bun run test` | Run unit tests with Vitest |
| `bun run lint` | Check formatting and lint rules |
| `bun run build` | Create a production build |

The development server proxies API, WebSocket, upload, and webhook requests to the
backend on port 3001. Use `bun run dev` at the repository root to start both servers.

## Source layout

- `src/routes/(site)/`: public pages.
- `src/routes/(admin)/`: login, logout, and dashboard pages.
- `src/lib/`: components, services, stores, and utilities; see the [library guide](src/lib/README.md).
- `src/hooks.server.ts`: server-side route authentication and page initialization.
- `src/hooks.client.ts`: browser authentication checks and public/admin presentation changes.

See the [theme guide](../docs/theme-system.md) for public-site styling and customization.
