# Backend

The backend runs Express 5 on Bun. It provides the HTTP API, session authentication,
WebSocket chat, scheduled integrations, and PostgreSQL access through Drizzle ORM.

Follow the [project setup guide](../README.md#development) to install dependencies,
configure `.env`, and start the database. Run these commands from `backend/`:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the API with file watching, on port 3001 by default |
| `bun run typecheck` | Check TypeScript types |
| `bun run test` | Run backend tests |
| `bun run lint` | Check formatting and lint rules |
| `bun run db:generate` | Generate a migration from schema changes |
| `bun run db:migrate` | Apply database migrations |
| `bun run db:studio` | Open the database browser |

## Source layout

- `src/routes/`: HTTP endpoints, grouped by resource.
- `src/middleware/`: authentication, permissions, and rate limiting.
- `src/services/`: application logic, chat, and integrations.
- `src/db/`: schema, seeds, and database initialization helpers.
- `drizzle/`: SQL migrations and migration metadata.
- `src/validation/` and `src/utils/`: validation and reusable helpers.

Use the [authentication guide](../docs/auth-model.md) when choosing route guards.
See the [Discord protocol](../docs/discord-integration.md) and
[integration setup](../docs/third-party-integrations.md) for external services.
