# Tracer

> **⚠️ Work in progress.** Building in stages — see commit history.

**Tracer** is a multi-tenant issue tracker in the spirit of Linear / Jira: organizations,
projects, and issues on a drag-and-drop Kanban board, with role-based access control and an
activity feed. It's a portfolio project demonstrating relational data modeling, RBAC,
optimistic UI, and clean full-stack architecture.

## Stack

| Layer     | Technology                                                                     |
| --------- | ------------------------------------------------------------------------------ |
| Frontend  | Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, TanStack Query, RHF + Zod |
| Backend   | Node.js, Express 5, TypeScript, Zod, JWT (HTTP-only cookie), bcrypt             |
| Database  | PostgreSQL via **Drizzle ORM** + migrations                                    |
| Infra     | Docker Compose (Postgres + both apps)                                          |

## Repository layout

```
tracer/
├── frontend/     # Next.js app   — see frontend/CLAUDE.md
├── backend/      # Express API   — see backend/CLAUDE.md
├── README.md
└── .gitignore
```

A single Git repository holds both apps. Each is its own npm project with its own
`package.json`; they communicate only over HTTP.

## Getting started

```bash
# 1. Backend
cd backend
cp .env.example .env
npm install
npm run dev            # http://localhost:4000  (GET /health -> {"status":"ok"})

# 2. Frontend
cd ../frontend
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```

> Postgres, migrations, seed data, and a full Docker Compose setup arrive in later stages.

## Domain model

`users`, `organizations`, `memberships` (RBAC: owner / admin / member), `projects`, `issues`
(per-project sequential number like `TRC-14`), `comments`, and `activity`. Full schema, ER
diagram, and engineering-decision notes will live here as the build progresses.

## Roadmap

- [x] Stage 0 — Scaffold & tooling
- [ ] Stage 1 — Database & schema
- [ ] Stage 2 — Auth (JWT cookie, RBAC middleware)
- [ ] Stage 3 — Core API (orgs, projects, issues, comments, activity)
- [ ] Stage 4 — Frontend foundation (auth pages, app shell)
- [ ] Stage 5 — The board (Kanban + drag-and-drop + optimistic updates)
- [ ] Stage 6 — Issue detail & comments
- [ ] Stage 7 — Activity feed & members/settings
- [ ] Stage 8 — Polish, docs, deploy-readiness
