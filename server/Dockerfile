# Syntax Stories API — build from repo root:
#   docker build -f server/Dockerfile -t syntax-stories-api .
#
# Requires webapp/packages/shared (monorepo file: dependency).

FROM node:22-bookworm-slim AS builder

WORKDIR /repo

# Shared package (built before server compile)
COPY webapp/packages/shared/package.json webapp/packages/shared/package-lock.json* webapp/packages/shared/tsconfig.json ./webapp/packages/shared/
COPY webapp/packages/shared/src ./webapp/packages/shared/src

RUN cd webapp/packages/shared && \
    if [ -f package-lock.json ]; then npm ci; else npm install; fi && \
    npm run build

# Server dependencies + TypeScript build
COPY server/package.json server/package-lock.json ./server/
COPY server/scripts/install-shared-package.cjs ./server/scripts/
COPY server/tsconfig.json server/tsconfig.build.json ./server/
COPY server/src ./server/src

WORKDIR /repo/server

ENV NPM_CONFIG_PRODUCTION=false

RUN npm ci && npm run build && npm prune --omit=dev

# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=7373

# sharp + TLS roots
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates tini && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --system syntax && \
    useradd --system --gid syntax --home-dir /app/server syntax && \
    mkdir -p uploads && \
    chown -R syntax:syntax /app

COPY --from=builder --chown=syntax:syntax /repo/server/dist ./dist
COPY --from=builder --chown=syntax:syntax /repo/server/node_modules ./node_modules
COPY --from=builder --chown=syntax:syntax /repo/server/package.json ./package.json
COPY --from=builder --chown=syntax:syntax /repo/webapp/packages/shared /app/webapp/packages/shared

COPY --chown=syntax:syntax server/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

USER syntax

EXPOSE 7373

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||7373)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "./scripts/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
