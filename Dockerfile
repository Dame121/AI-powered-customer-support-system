# syntax=docker/dockerfile:1

# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY turbo.json turbo.json

RUN npm install

# ── Stage 2: Generate Prisma client ──────────────────────────────────────────
FROM deps AS prisma
COPY apps/backend/prisma apps/backend/prisma
RUN npx --workspace=apps/backend prisma generate

# ── Stage 3: Build backend ───────────────────────────────────────────────────
FROM prisma AS build-backend
COPY apps/backend apps/backend
RUN npm run build --workspace=apps/backend

# ── Stage 4: Build frontend ─────────────────────────────────────────────────
FROM deps AS build-frontend
COPY apps/frontend apps/frontend
# The frontend imports types from backend, so we need the backend source too
COPY apps/backend apps/backend
RUN npx --workspace=apps/backend prisma generate
RUN npm run build --workspace=apps/frontend

# ── Stage 5: Production image (backend serves API + static frontend) ─────────
FROM node:20-alpine AS final
WORKDIR /app

# Copy root package files & install production deps only
COPY package.json package-lock.json* ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY turbo.json turbo.json
RUN npm install --omit=dev

# Copy Prisma schema & generated client
COPY apps/backend/prisma apps/backend/prisma
COPY --from=prisma /app/node_modules/.prisma node_modules/.prisma
COPY --from=prisma /app/node_modules/@prisma node_modules/@prisma

# Copy built backend
COPY --from=build-backend /app/apps/backend/dist apps/backend/dist

# Copy built frontend (static files)
COPY --from=build-frontend /app/apps/frontend/dist apps/frontend/dist

EXPOSE 3000

# Run migrations then start the backend server
CMD ["sh", "-c", "npx --workspace=apps/backend prisma migrate deploy && node apps/backend/dist/index.js"]
