# dane.gg — Express API (build context: repo root)
#   docker build -f apps/backend/Dockerfile -t danegg-backend .

FROM oven/bun:1 AS builder

WORKDIR /build

COPY apps/backend/package.json apps/backend/bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22-alpine

RUN apk add --no-cache tini && npm install -g tsx

# Mirrors the repo's apps/backend + packages/shared layout so the @repo/shared
# path mapping in package.json/tsconfig.json (relative to apps/backend) resolves
# identically here and in local dev — do not flatten this without updating both.
WORKDIR /repo/apps/backend

COPY --from=builder /build/node_modules node_modules/
COPY apps/backend/src        src/
COPY apps/backend/package.json ./
COPY apps/backend/tsconfig.json ./
COPY apps/backend/static     static/
COPY apps/backend/drizzle    drizzle/
COPY apps/backend/drizzle.config.ts ./

# Monorepo helpers imported as @repo/shared (see apps/backend/tsconfig paths)
COPY packages/shared        ../../packages/shared
RUN mkdir -p node_modules/@repo && ln -s ../../../../packages/shared node_modules/@repo/shared

VOLUME ["/repo/apps/backend/static/uploads"]

COPY apps/backend/docker-entrypoint.sh /repo/apps/backend/entrypoint.sh
RUN chmod +x /repo/apps/backend/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
ENV BACKEND_PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

ENTRYPOINT ["tini", "--"]
CMD ["/repo/apps/backend/entrypoint.sh"]
