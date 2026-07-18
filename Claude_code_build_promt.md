# Claude Code Build Prompt — "Tracer" (Linear/Jira-lite Issue Tracker)

> Paste this whole file to Claude Code as the master brief. It will build the project in ordered stages, committing after each meaningful unit of work so the GitHub history reads like real incremental development.

---

## Project Context (read fully before writing any code)

We are building **Tracer**, a multi-tenant issue tracking application (a lightweight Linear/Jira). This is a portfolio project meant to demonstrate strong relational data modeling, RBAC, real-time-ish interactivity, and clean full-stack architecture.

**Monorepo layout — one root folder, two app folders:**

```
tracer/
├── frontend/     # Next.js 14 (App Router) + TypeScript + Tailwind
├── backend/      # Node.js + Express + TypeScript + PostgreSQL (Drizzle ORM)
├── README.md
└── .gitignore
```

Note: `frontend/` and `backend/` are their own npm projects with their own `package.json`, `.git` is at the **root** (single repo, two folders). I will connect the GitHub remote myself after Stage 0 — do not run `git remote add` or `git push`; just `git init` and `git commit` locally.

**Tech constraints (do not deviate):**
- Backend: Node.js, Express, TypeScript, PostgreSQL, **Drizzle ORM** (not Prisma), Zod for validation, JWT (HTTP-only cookie) auth, bcrypt.
- Frontend: Next.js 14 App Router, TypeScript, Tailwind CSS, Zustand for client state, TanStack Query for server state, React Hook Form + Zod.
- No AI/LLM features. This is deliberately a classic relational app.

**Design quality bar (important):** the UI must be genuinely polished and interactive — not a bootstrap-looking CRUD form. Use the frontend-design skill. Think Linear's aesthetic: dense but clean, keyboard-friendly, subtle transitions, optimistic updates, dark-mode-first. Read the frontend-design skill before building any UI.

---

## Core Domain Model (build the schema to match this exactly)

- **users** — id, email, name, password_hash, avatar_url, created_at
- **organizations** — id, name, slug, created_at
- **memberships** — join table: user_id, org_id, role (enum: `owner`, `admin`, `member`), created_at. This is where RBAC lives.
- **projects** — id, org_id (FK), name, key (short code like "TRC"), description, created_at
- **issues** — id, project_id (FK), title, description, status (enum: `backlog`, `todo`, `in_progress`, `done`, `cancelled`), priority (enum: `none`, `low`, `medium`, `high`, `urgent`), assignee_id (FK users, nullable), reporter_id (FK users), issue_number (per-project sequential, e.g. TRC-14), created_at, updated_at
- **comments** — id, issue_id (FK), author_id (FK), body, created_at
- **activity** — id, org_id, actor_id, entity_type, entity_id, action, metadata (jsonb), created_at — powers the activity feed

RBAC rules: `owner` can do everything incl. delete org; `admin` can manage projects/members; `member` can create/edit issues and comment. Enforce in backend middleware, not just frontend.

---

## Commit Discipline (follow this the whole way)

- Use **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `style:`.
- Commit after each **logical unit**, not each file and not each whole stage. Aim for small, self-contained commits (e.g. `feat: add issues table schema and migration`, then separately `feat: add issue CRUD endpoints`).
- Write commit messages a real engineer would — specific, present-tense, no fluff. Bad: `update stuff`. Good: `fix: prevent duplicate issue_number under concurrent inserts`.
- After each stage, pause and show me: (1) what was committed, (2) the commit messages, (3) anything you'd flag. Wait for my "continue" before the next stage.

---

## STAGES — build strictly in this order

### Stage 0 — Scaffold & tooling
1. Create root folder structure, root `.gitignore` (node_modules, .env, .next, dist, coverage).
2. `git init` at root. First commit: `chore: initialize monorepo structure`.
3. Backend: init npm, install deps, set up TypeScript (`tsconfig`), ESLint + Prettier, `nodemon`/`tsx` dev script, basic Express server that returns `{status:"ok"}` on `/health`. Commit: `feat(backend): scaffold express + typescript server`.
4. Frontend: `create-next-app` (App Router, TS, Tailwind), strip boilerplate, set up a clean base layout + Tailwind theme tokens (dark-first). Commit: `feat(frontend): scaffold next.js app with tailwind theme`.
5. Root `README.md` with project description, stack, and "WIP" note. Commit: `docs: add initial readme`.
**Stop. Show me the commits.**

### Stage 1 — Database & schema
1. Set up Postgres connection (Drizzle + node-postgres). Use `.env` for `DATABASE_URL`; provide `.env.example`.
2. Define all tables above as Drizzle schema, with proper FKs, enums, indexes (index `issues.project_id`, `issues.assignee_id`, `memberships.org_id`, `activity.org_id`).
3. Set up Drizzle migrations, generate + run the first migration.
4. Add a `seed.ts` that creates one org, 3 users (owner/admin/member), one project, and ~15 issues across statuses.
Commits (separate): schema, migration config, seed script.
**Stop. Show me the schema and the ER relationships in the README.**

### Stage 2 — Auth
1. Signup, login, logout, `GET /me`. bcrypt hashing, JWT in HTTP-only cookie, Zod validation on inputs.
2. `requireAuth` middleware; `requireRole(role)` middleware that checks membership role for the target org.
3. Error-handling middleware with consistent JSON error shape.
Commit per endpoint group + one for middleware.
**Stop.**

### Stage 3 — Core API (orgs, projects, issues, comments)
1. Orgs: create org (creator becomes owner), list my orgs, invite/add member (admin+), change role (owner+).
2. Projects: CRUD scoped to org, auto-generate project `key`.
3. Issues: CRUD, per-project sequential `issue_number` (handle concurrency safely — this is a deliberate showcase; solve it with a transaction or sequence, and note the approach in a comment), filter by status/assignee/priority, pagination.
4. Comments: create/list per issue.
5. Every mutating action writes an `activity` row.
Commit per resource. Write at least a few integration tests for issues (the concurrency case especially). Commit: `test: cover issue_number concurrency`.
**Stop.**

### Stage 4 — Frontend foundation
1. Auth pages (login/signup) with React Hook Form + Zod, calling the backend, cookie-based session.
2. App shell: sidebar (orgs/projects nav), top bar, protected routes, TanStack Query setup, Zustand store for UI state.
3. Loading/skeleton states and a clean empty-state design.
Commit per logical piece.
**Stop.**

### Stage 5 — The board (the centerpiece — make it shine)
1. Kanban board: columns by status, issue cards showing key (TRC-14), title, priority, assignee avatar.
2. **Drag-and-drop** between columns with **optimistic updates** (update UI instantly, reconcile with server, roll back on failure). This is the headline interaction — make it smooth.
3. List view toggle (table with sortable columns) as an alternative to the board.
4. Filters (status/assignee/priority) that update the query.
Commit per feature. This stage can be several commits.
**Stop. Screenshot-worthy — tell me it's ready to look at.**

### Stage 6 — Issue detail & comments
1. Issue detail panel/modal: editable title/description (inline edit), status/priority/assignee dropdowns with optimistic save, comment thread.
2. Keyboard shortcuts (e.g. `C` to create issue, `Esc` to close) — small touches that read as senior.
Commit per piece.
**Stop.**

### Stage 7 — Activity feed & members
1. Activity feed page reading the `activity` table (grouped by day, human-readable strings).
2. Members/settings page: list members, roles, invite, role change (gated by RBAC — hide/disable actions the current role can't perform, AND enforce on backend).
Commit per piece.
**Stop.**

### Stage 8 — Polish, docs, deploy-readiness
1. Responsive pass, dark/light toggle, error boundaries, 404/500 pages.
2. Backend: rate limiting on auth, request logging, CORS locked to frontend origin.
3. README: real screenshots section (leave placeholders), setup instructions, architecture overview, the ER diagram, and a short "engineering decisions" section (why Drizzle, how concurrency on issue_number is handled, why optimistic updates). This section is what interviewers read — make it genuinely good.
4. Add a `docker-compose.yml` for local Postgres + both apps (you know Docker — show it).
Commits: `refactor`, `docs`, `chore(docker)`.
**Final stop. Summarize the whole build and list every commit.**

---

## Rules for you (Claude Code) throughout
- Read the relevant skill (frontend-design for UI) before building UI stages.
- Don't skip stages or merge them. Don't fake progress.
- Keep frontend and backend cleanly separated — no shared code leaking across; talk only over HTTP.
- Type everything. No `any` unless justified in a comment.
- If you hit a real decision (schema tradeoff, concurrency approach), make the call, implement it, and note it in a code comment + the README decisions section.
- Never run `git push` or touch the remote — I connect GitHub myself.