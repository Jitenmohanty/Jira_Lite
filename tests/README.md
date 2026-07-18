# Tracer — E2E + API test suite

A standalone [Playwright](https://playwright.dev) suite that exercises **both**
layers of Tracer:

- **`@api`** tests hit the Express API directly (status codes, payload shapes,
  auth, RBAC, CSRF) via Playwright's request context.
- **`@ui`** tests drive the Next.js app in a real browser, reusing a shared
  logged-in session captured once by the `setup` project.

## Prerequisites

Both apps must already be running, and the database must be migrated + seeded:

```bash
# backend/ — needs Postgres + Redis reachable
npm run db:migrate
npm run db:seed
npm run dev          # → http://localhost:4000

# frontend/
npm run dev          # → http://localhost:3000
```

Seeded logins (all password `password123`): `owner@tracer.dev`,
`admin@tracer.dev`, `member@tracer.dev`.

## Install & run

```bash
cd tests
npm install
npm run install:browsers   # one-time: download Chromium

npm test                   # run everything
npm run test:api           # only @api tests
npm run test:ui            # only @ui tests
npm run report             # open the HTML report
```

Override the targets with env vars if needed:
`API_BASE_URL` (default `http://localhost:4000`),
`E2E_BASE_URL` (default `http://localhost:3000`).

## Test cases

| # | File | Area |
|---|------|------|
| 01 | `specs/01-auth.spec.ts` | Login (valid/invalid) + `/auth/me` + UI login |
| 02 | `specs/02-signup-logout.spec.ts` | Signup (201/409) + logout + UI signup |
| 03 | `specs/03-orgs-members.spec.ts` | Orgs list + member roster + UI members page |
| 04 | `specs/04-rbac.spec.ts` | Role-change RBAC (member 403 / owner 200) + UI gating |
| 05 | `specs/05-projects.spec.ts` | Projects CRUD + UI create |
| 06 | `specs/06-issues-board.spec.ts` | Issues CRUD + board columns/cards + list toggle |
| 07 | `specs/07-filters-search.spec.ts` | Status/priority/assignee filters + title search |
| 08 | `specs/08-comments.spec.ts` | Comment create/list + UI comment thread |
| 09 | `specs/09-activity-insights.spec.ts` | Activity feed + insights summary/chart |
| 10 | `specs/10-developer.spec.ts` | API keys + webhooks (lifecycle + reveal-once UI) |

Tests create and clean up their own throwaway data; seeded rows are left intact
(role changes are reverted).

## Dummy-data generator (on demand)

A separate, opt-in generator populates the app with realistic demo data (extra
projects, a spread of issues across every status/priority/assignee, and some
comments) via the real API. It has its own config so it never runs as part of
the normal suite:

```bash
npm run seed:dummy                       # ≈ 3 projects × 20 issues (+ comments)
DUMMY_PROJECTS=5 DUMMY_ISSUES_PER_PROJECT=30 npm run seed:dummy   # more
```

Lives in `tools/seed-dummy-data.spec.ts` (config: `seed.config.ts`). It creates
data only — it never deletes — so re-running just adds more (project keys are
suffixed to avoid collisions).
