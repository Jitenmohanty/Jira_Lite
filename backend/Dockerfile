# syntax=docker/dockerfile:1

# Debian "slim" (glibc) rather than Alpine (musl): the local embedding model
# (@huggingface/transformers → onnxruntime-node, sharp) ships glibc prebuilt
# binaries but no musl ones, so Alpine would fail to load them at runtime.

# ---------- builder: install all deps and compile TypeScript ----------
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- deps: production-only node_modules ----------
FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# ---------- runner: non-root ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY package.json ./

USER node
EXPOSE 4000

# Node-based healthcheck (slim images have no wget/curl).
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Apply migrations (compiled — no tsx needed), then start the API.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
