# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN npm install -g pnpm@10.34.5 \
 && mkdir -p /app /pnpm \
 && chown node:node /app /pnpm
WORKDIR /app
# Usuario sin privilegios (uid 1000): los archivos que genere en el volumen no quedan como root
USER node

# ---------- deps (todas las dependencias, cacheadas) ----------
FROM base AS deps
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store,uid=1000,gid=1000 \
    pnpm install --frozen-lockfile

# ---------- dev (hot-reload, el código entra por volumen) ----------
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "start:dev"]

# ---------- build ----------
FROM deps AS build
COPY --chown=node:node . .
RUN pnpm build

# ---------- prod-deps ----------
FROM base AS prod-deps
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store,uid=1000,gid=1000 \
    pnpm install --prod --frozen-lockfile

# ---------- prod ----------
FROM node:24-slim AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
