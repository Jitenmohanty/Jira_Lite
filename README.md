# Tracer

**Tracer** is a multi-tenant issue tracker in the spirit of Linear / Jira: organizations,
projects, and issues on a drag-and-drop Kanban board, with role-based access control and an
activity feed. It's a portfolio project demonstrating relational data modeling, RBAC,
optimistic UI, and clean full-stack architecture.

![Kanban board](docs/screenshots/board.png)

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/issue-detail.png" alt="Issue detail panel" /></td>
    <td width="50%"><img src="docs/screenshots/list-view.png" alt="Sortable list view" /></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/activity.png" alt="Activity feed" /></td>
    <td width="50%"><img src="docs/screenshots/light-mode.png" alt="Light theme" /></td>
  </tr>
</table>

## Features

- **Kanban board** with smooth **drag-and-drop** between status columns and **optimistic
  updates** (the card moves instantly; the change reconciles with the server and rolls back on
  failure).
- **List view** with sortable columns, plus **filters** (status / priority / assignee).
- **Issue detail** panel with inline title/description editing, optimistic status / priority /
  assignee changes, and a comment thread. Keyboard shortcuts (`C` to create, `Esc` to close).
- **Multi-tenant** organizations with **RBAC** (`owner` > `admin` > `member`) enforced in
  backend middleware and mirrored in the UI.
- Per-project sequential issue identifiers (e.g. `TRC-14`) that stay **correct under concurrent
  inserts**.
- **Activity feed** of every mutation, grouped by day.
- Dark-mode-first design with a light theme, responsive down to mobile.

## Stack

| Layer     | Technology                                                                     |
| --------- | ------------------------------------------------------------------------------ |
| Frontend  | Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, TanStack Query, RHF + Zod, dnd-kit |
| Backend   | Node.js, Express 5, TypeScript, Zod, JWT (HTTP-only cookie), bcrypt             |
| Database  | PostgreSQL via **Drizzle ORM** + migrations                                    |
| Infra     | Docker Compose (Postgres + both apps)                                          |

## Repository layout

```
tracer/
├── frontend/     # Next.js app   — see frontend/CLAUDE.md
├── backend/      # Express API   — see backend/CLAUDE.md
├── docker-compose.yml
├── docs/screenshots/
└── README.md
```

A single Git repository holds both apps. Each is its own npm project with its own
`package.json`; they communicate only over HTTP.

## Quick start (Docker)

One command brings up Postgres, the API, and the web app:

```bash
docker compose up --build
# web → http://localhost:3000 · api → http://localhost:4000
# load demo data (once containers are up):
docker compose exec backend npm run db:seed
```

**Demo logins** (all password `password123`): `owner@tracer.dev`, `admin@tracer.dev`,
`member@tracer.dev`.

## Manual dev setup

```bash
# Postgres (or use your own and set DATABASE_URL)
docker run -d --name tracer-postgres -e POSTGRES_USER=tracer -e POSTGRES_PASSWORD=tracer \
  -e POSTGRES_DB=tracer -p 5432:5432 postgres:16-alpine

# Backend
cd backend && cp .env.example .env && npm install
npm run db:migrate && npm run db:seed
npm run dev            # http://localhost:4000  (GET /health -> {"status":"ok"})

# Frontend (new terminal)
cd frontend && cp .env.example .env.local && npm install
npm run dev            # http://localhost:3000
```

## Architecture

- **Two independent apps, HTTP only.** No shared code crosses the boundary; the frontend holds
  hand-maintained TypeScript types mirroring the API responses.
- **Auth**: `POST /auth/login` sets a JWT in an **HTTP-only cookie** (XSS-resistant). The
  frontend never sees the token — every request is sent with `credentials: 'include'`, and CORS
  is locked to the frontend origin.
- **RBAC** lives in the `memberships` table and is enforced by a `requireRole(minRole)`
  middleware that resolves the target org (directly, or via a project/issue) and checks the
  `owner > admin > member` hierarchy. The UI hides actions a role can't perform, but the backend
  is the source of truth.
- **Backend structure**: feature modules (`auth`, `orgs`, `projects`, `issues`, `comments`,
  `activity`), each with `schemas` (Zod) / `service` / `routes`; a central error handler returns
  a consistent `{ error: { code, message, details? } }` envelope.
- **Frontend state**: **TanStack Query** owns server state (caching, optimistic mutations);
  **Zustand** owns UI state (active org, board/list view, drawer). Forms use React Hook Form +
  Zod.
- Auth endpoints are **rate-limited**; requests are logged with morgan.

## Domain model

`users`, `organizations`, `memberships` (RBAC: owner / admin / member), `projects`, `issues`
(per-project sequential number like `TRC-14`), `comments`, and `activity`.

```mermaid
erDiagram
    users ||--o{ memberships : has
    organizations ||--o{ memberships : has
    organizations ||--o{ projects : owns
    organizations ||--o{ activity : records
    projects ||--o{ issues : contains
    users ||--o{ issues : reports
    users |o--o{ issues : "assigned to"
    issues ||--o{ comments : has
    users ||--o{ comments : writes
    users ||--o{ activity : "acts as actor"

    users {
        uuid id PK
        varchar email UK
        varchar name
        text password_hash
        text avatar_url
        timestamptz created_at
    }
    organizations {
        uuid id PK
        varchar name
        varchar slug UK
        timestamptz created_at
    }
    memberships {
        uuid user_id PK,FK
        uuid org_id PK,FK
        role role "owner | admin | member"
        timestamptz created_at
    }
    projects {
        uuid id PK
        uuid org_id FK
        varchar name
        varchar key "unique per org, e.g. TRC"
        text description
        integer issue_counter "backs sequential issue_number"
        timestamptz created_at
    }
    issues {
        uuid id PK
        uuid project_id FK
        integer issue_number "unique per project"
        varchar title
        text description
        issue_status status "backlog|todo|in_progress|done|cancelled"
        issue_priority priority "none|low|medium|high|urgent"
        uuid assignee_id FK "nullable"
        uuid reporter_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    comments {
        uuid id PK
        uuid issue_id FK
        uuid author_id FK
        text body
        timestamptz created_at
    }
    activity {
        uuid id PK
        uuid org_id FK
        uuid actor_id FK
        varchar entity_type
        uuid entity_id
        varchar action
        jsonb metadata
        timestamptz created_at
    }
```

**Key relationships & rules**

- **Multi-tenancy:** everything hangs off `organizations`. A `user` joins an org through a
  `membership`, which carries their `role`. RBAC (`owner` > `admin` > `member`) is enforced in
  backend middleware.
- **Issues** belong to a `project` (which belongs to an org). `reporter_id` is required;
  `assignee_id` is nullable and set to `NULL` if the user is removed. `issue_number` is unique
  per project and generated via the project's `issue_counter` under a row lock to stay correct
  under concurrent inserts.
- **Cascades:** deleting an org removes its memberships, projects (and their issues, comments)
  and activity. Deleting an issue removes its comments.
- **`activity`** is an append-only audit log powering the feed; `metadata` (jsonb) holds
  action-specific detail such as `{ from: "todo", to: "in_progress" }`.

Indexes: `issues.project_id`, `issues.assignee_id`, `memberships.org_id`, `projects.org_id`,
`activity.org_id`, plus unique indexes on `(project_id, issue_number)` and `(org_id, key)`.

## Engineering decisions

**Why Drizzle (not Prisma).** Drizzle is a thin, SQL-first, fully-typed query builder. The
schema *is* TypeScript, migrations are generated from it, and relational queries return inferred
types with no codegen step or separate client to keep in sync. It also makes the concurrency
approach below easy to express with a plain `UPDATE ... RETURNING` inside a transaction.

**Concurrency-safe `issue_number`.** Identifiers like `TRC-14` must be gap-free and unique per
project, even if two people create issues at the same instant. Each project row carries an
`issue_counter`. Creating an issue runs, in one transaction:

```sql
UPDATE projects SET issue_counter = issue_counter + 1 WHERE id = $1 RETURNING issue_counter;
```

That `UPDATE` takes a **row-level lock** on the project for the life of the transaction, so a
concurrent create blocks until the first commits and then reads the next value — no duplicates,
no gaps. A unique index on `(project_id, issue_number)` is the final backstop. This is covered
by an integration test that fires **30 concurrent inserts** and asserts a clean `1..30`
sequence. (See `backend/src/modules/issues/issues.service.ts`.)

**Why optimistic updates.** Dragging a card or changing a dropdown should feel instant. The
board/detail mutations patch the TanStack Query cache immediately (`onMutate`), roll back to the
snapshot on error (`onError`), and revalidate against the server on settle (`onSettled`). The
result is a native-feeling UI that's still consistent with the backend.

**Auth via HTTP-only cookie.** Storing the JWT in an HTTP-only cookie keeps it out of reach of
JavaScript (XSS-resistant), unlike `localStorage`. The trade-off is CSRF exposure, mitigated
with `SameSite=Lax` and a CORS allow-list restricted to the frontend origin. `Secure` is enabled
in production (HTTPS).

**Monorepo, two apps, HTTP boundary.** One repo for easy review, but the apps stay decoupled —
separate `package.json`s and no shared imports — so either could be deployed or replaced
independently.

## Testing

```bash
cd backend && npm test    # vitest integration tests against Postgres
```

Integration tests cover the issue lifecycle and, notably, the `issue_number` concurrency case.

## API overview

| Area     | Endpoints                                                                       |
| -------- | ------------------------------------------------------------------------------- |
| Auth     | `POST /auth/signup` · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` |
| Orgs     | `GET/POST /orgs` · `GET/POST /orgs/:id/members` · `PATCH /orgs/:id/members/:userId` |
| Projects | `GET/POST /orgs/:id/projects` · `GET/PATCH/DELETE /orgs/:id/projects/:projectId` |
| Issues   | `GET/POST /projects/:id/issues` · `GET/PATCH/DELETE /issues/:issueId`            |
| Comments | `GET/POST /issues/:issueId/comments`                                             |
| Activity | `GET /orgs/:id/activity`                                                         |
