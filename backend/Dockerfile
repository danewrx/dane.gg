# dane.gg — Express API (build context: repo root)
#   docker build -f backend/Dockerfile -t danegg-backend .

FROM oven/bun:1 AS builder

WORKDIR /build

COPY backend/package.json backend/bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22-alpine

RUN apk add --no-cache tini && npm install -g tsx

WORKDIR /repo/backend

COPY --from=builder /build/node_modules node_modules/
COPY backend/src        src/
COPY backend/package.json ./
COPY backend/tsconfig.json ./
COPY backend/static     static/
COPY backend/drizzle    drizzle/
COPY backend/drizzle.config.ts ./

# Monorepo helpers imported as @repo/shared (see backend/tsconfig paths)
COPY shared             ../shared
RUN mkdir -p node_modules/@repo && ln -s ../../shared node_modules/@repo/shared

VOLUME ["/repo/backend/static/uploads"]

COPY docker/backend-entrypoint.sh /repo/backend/entrypoint.sh
RUN chmod +x /repo/backend/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
ENV BACKEND_PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

ENTRYPOINT ["tini", "--"]
CMD ["/repo/backend/entrypoint.sh"]
