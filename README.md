# Dane.gg

A modern full-stack web application built with SvelteKit frontend and Express backend, using PostgreSQL with Drizzle ORM.

## Architecture

- **Frontend**: SvelteKit with Node.js adapter for custom server integration
- **Backend**: Express.js with PostgreSQL and Drizzle ORM
- **Database**: PostgreSQL running in Docker
- **Database Management**: Adminer for database visualization

## Prerequisites

- [Bun](https://bun.sh) package manager
- [Docker](https://docker.com) and Docker Compose
- Node.js (for compatibility)

## Quick Start

1. **Clone and setup the project:**
   ```bash
   git clone <your-repo>
   cd danegg
   bun run setup
   ```

2. **Start the database:**
   ```bash
   bun run db:up
   ```

3. **Set up the database schema:**
   ```bash
   bun run db:push
   ```

4. **Start the development servers:**
   ```bash
   bun run dev
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3000/api/*
   - Database Admin: http://localhost:8080 (Adminer)

## Available Scripts

### Development
- `bun run dev` - Start both frontend and backend in development mode
- `bun run frontend:dev` - Start only the frontend
- `bun run backend:dev` - Start only the backend

### Building
- `bun run build` - Build both frontend and backend
- `bun run start` - Start the production server

### Database
- `bun run db:up` - Start PostgreSQL and Adminer containers
- `bun run db:down` - Stop database containers
- `bun run db:generate` - Generate database migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio

## Project Structure

```
danegg/
├── frontend/              # SvelteKit application
├── backend/               # Express API server
│   ├── src/
│   │   ├── db/           # Database schema and connection
│   │   └── index.ts      # Main server file
│   └── package.json
├── server.js              # Custom server combining both
├── docker-compose.dev.yml # Database setup
└── package.json           # Root package management
```

## API Endpoints

- `GET /api/health` - Health check with uptime and timestamp

## Database Schema

The application includes example `users` and `posts` tables. You can modify the schema in `backend/src/db/schema.ts` and run `bun run db:push` to apply changes.

## Environment Variables

Copy `.env.example.dev` to `.env` for local development (or `.env.example.prod` for Docker production — see `docker-compose.yml`):

```bash
cp .env.example.dev .env
```

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)

## Development Workflow

1. Make changes to the frontend in `frontend/src/`
2. Make changes to the backend in `backend/src/`
3. Database changes go in `backend/src/db/schema.ts`
4. Run `bun run db:push` after schema changes
5. Both servers auto-reload during development

## Production Deployment

The custom server in `server.js` combines both SvelteKit and ElysiaJS, making it easy to deploy as a single container. Build the project and run the server:

```bash
bun run build
bun run start
```
