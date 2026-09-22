# dane.gg — SvelteKit + proxy to API (build context: repo root)
#   docker build -f apps/frontend/Dockerfile -t danegg-frontend .

FROM oven/bun:1 AS builder

# Mirrors the repo's apps/frontend + packages/shared layout so the @repo/shared
# alias in svelte.config.js (relative to apps/frontend) resolves identically
# here and in local dev — do not flatten this without updating both.
WORKDIR /build

COPY apps/frontend/package.json apps/frontend/bun.lock ./apps/frontend/
RUN cd apps/frontend && bun install --frozen-lockfile

COPY apps/frontend/ ./apps/frontend/
COPY packages/shared/ ./packages/shared/
COPY .env.example.prod ./apps/frontend/.env
RUN cd apps/frontend && bun run prepare && bun run build

FROM node:22-alpine

RUN apk add --no-cache tini

WORKDIR /app

COPY --from=builder /build/apps/frontend/build       build/
COPY --from=builder /build/apps/frontend/package.json ./
COPY --from=builder /build/apps/frontend/node_modules node_modules/
COPY apps/frontend/server-split.mjs ./server-split.mjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

ENTRYPOINT ["tini", "--"]
CMD ["node", "server-split.mjs"]
