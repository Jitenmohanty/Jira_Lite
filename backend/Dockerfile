# syntax=docker/dockerfile:1

# ---------- builder: install all deps and compile TypeScript ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# npm install (not ci) so platform-specific optional deps resolve for Alpine.
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- deps: production-only node_modules ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# ---------- runner: slim image, non-root ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY package.json ./

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Apply migrations (compiled — no tsx needed), then start the API.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
