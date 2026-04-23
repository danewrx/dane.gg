# dane.gg — Express API (build context: repo root)
#   docker build -f backend/Dockerfile -t danegg-backend .

FROM oven/bun:1 AS builder

WORKDIR /build

COPY backend/package.json backend/bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22-alpine

RUN apk add --no-cache tini && npm install -g tsx

WORKDIR /app

COPY --from=builder /build/node_modules node_modules/
COPY backend/src        src/
COPY backend/package.json ./
COPY backend/static     static/
COPY backend/drizzle    drizzle/
COPY backend/drizzle.config.ts ./

VOLUME ["/app/static/uploads"]

COPY docker/backend-entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
ENV BACKEND_PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

ENTRYPOINT ["tini", "--"]
CMD ["/app/entrypoint.sh"]
