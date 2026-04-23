# dane.gg — SvelteKit + proxy to API (build context: repo root)
#   docker build -f frontend/Dockerfile -t danegg-frontend .

FROM oven/bun:1 AS builder

WORKDIR /build

COPY frontend/package.json frontend/bun.lock ./frontend/
RUN cd frontend && bun install --frozen-lockfile

COPY frontend/ ./frontend/
COPY .env.example.prod ./frontend/.env
RUN cd frontend && bun run prepare && bun run build

FROM node:22-alpine

RUN apk add --no-cache tini

WORKDIR /app

COPY --from=builder /build/frontend/build       build/
COPY --from=builder /build/frontend/package.json ./
COPY --from=builder /build/frontend/node_modules node_modules/
COPY frontend/server-split.mjs ./server-split.mjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

ENTRYPOINT ["tini", "--"]
CMD ["node", "server-split.mjs"]
