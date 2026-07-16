# Tracer — Backend (`backend/`)

Node.js + Express 5 + TypeScript + PostgreSQL (Drizzle ORM). This is the API for the Tracer
issue tracker. It talks to the frontend **only over HTTP** — no shared code across the boundary.

## Stack

- **Runtime:** Node.js, Express 5, TypeScript (CommonJS output, `nodenext` resolution).
- **DB:** PostgreSQL via **Drizzle ORM** + `node-postgres` (`pg`). Migrations via `drizzle-kit`.
- **Validation:** Zod 4 on every request body/query.
- **Auth:** JWT stored in an **HTTP-only cookie**; passwords hashed with bcrypt.
- **Dev:** `tsx watch` for hot reload; `vitest` for tests; ESLint (flat config) + Prettier.

## Commands

```bash
npm run dev         # start API with hot reload (tsx watch)
npm run build       # tsc -> dist/
npm start           # run compiled dist/index.js
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run format      # prettier --write
npm run db:generate # drizzle-kit generate (create migration from schema)
npm run db:migrate  # apply migrations
npm run db:seed     # seed dev data
npm test            # vitest run
```

## Layout

```
src/
├── index.ts          # server bootstrap (listen + graceful shutdown)
├── app.ts            # express app factory (importable by tests, no port)
├── config/env.ts     # Zod-validated environment config
├── db/               # drizzle schema, client, migrate + seed (Stage 1)
├── middleware/       # requireAuth, requireRole, error handler (Stage 2)
├── modules/          # feature routers: auth, orgs, projects, issues, comments, ai, api-keys, webhooks
│   ├── ai/           # "Ask Tracer": local embeddings, pgvector retrieval, Gemini agent + guardrails
│   ├── api-keys/     # scoped bearer keys for programmatic access
│   └── webhooks/     # outbound HMAC-signed event delivery + delivery log
├── queues/           # BullMQ queues (email, scheduler, embedding, ai, webhook) + cron registration
├── workers/          # queue consumers (email, scheduler, embedding, ai, webhook) — run via `npm run worker`
└── lib/              # shared helpers (jwt, password, csrf, api-key, ssrf, webhook-signature)
```

## AI assistant ("Ask Tracer")

- Gated on `GEMINI_API_KEY` (free — aistudio.google.com/apikey); semantic search uses a **local** embedding model (no key).
- Requires **pgvector** (`issue_embeddings.embedding`); the migration runs `CREATE EXTENSION vector`.
  Local/CI Postgres must be a pgvector image (`pgvector/pgvector:pg16`); Neon/Render supply it.
- Tenant isolation is enforced in code — AI tools are always bound to the org id from the
  authenticated membership, never from model output.
- The AI queue auto-pauses/resumes on Gemini `429`/`503` via `worker.rateLimit()` — do not
  replace this with a fail-fast; dropped questions are the failure mode to avoid.

## Developer platform (API keys + webhooks)

- API keys authenticate via `Authorization: Bearer trc_…` in `requireAuth`; only the SHA-256 hash
  is stored. A key is **org-pinned** — `requireRole` rejects use against any other org. Bearer
  requests bypass CSRF by design (no ambient cookie).
- **Webhook URLs are an SSRF sink.** Never fetch one without `assertPublicUrl` (lib/ssrf.ts). It
  runs at create AND delivery time (DNS-rebinding). Do not weaken it; the dev-only
  `WEBHOOK_ALLOW_LOOPBACK` flag is force-disabled in prod.
- Webhook deliveries are HMAC-SHA256 signed (`X-Tracer-Signature`), delivered via the `webhook`
  queue with retries, and never follow redirects.

## Conventions

- **Type everything.** No `any` without a justifying comment.
- Every mutating action writes an `activity` row (Stage 3+).
- RBAC is enforced in middleware (`requireRole`), never trusted from the client.
- Errors go through the central error-handling middleware and return a consistent JSON shape:
  `{ error: { code, message, details? } }`.
- Config comes from `src/config/env.ts` — never read `process.env` directly elsewhere.

## Environment

Copy `.env.example` to `.env`. `DATABASE_URL` points at the Postgres instance
(`docker-compose up db` provides one locally).
