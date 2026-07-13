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
├── modules/          # feature routers: auth, orgs, projects, issues, comments (Stage 2-3)
└── lib/              # shared helpers (jwt, password, http errors)
```

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
