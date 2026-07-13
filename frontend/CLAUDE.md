# Tracer — Frontend (`frontend/`)

Next.js 14 (App Router) + TypeScript + Tailwind CSS. The UI for the Tracer issue tracker.
It talks to the backend **only over HTTP** (credentialed `fetch` with the auth cookie).

## Design bar (non-negotiable)

Aim for a **Linear-quality** feel: dense but clean, keyboard-friendly, dark-mode-first,
subtle transitions, and **optimistic updates** on interactive actions (drag-and-drop, inline
edits). This is not a bootstrap CRUD app.

## Stack

- **Framework:** Next.js 14 App Router, React 18, TypeScript.
- **Styling:** Tailwind CSS with a token-based theme (see below).
- **Client state:** Zustand (UI state — e.g. active org/project, modals).
- **Server state:** TanStack Query (fetching, caching, optimistic mutations).
- **Forms:** React Hook Form + Zod.

## Commands

```bash
npm run dev     # next dev (http://localhost:3000)
npm run build   # production build
npm start       # serve production build
npm run lint    # next lint
```

## Theme system

Colors are defined once in `src/app/globals.css` as **space-separated RGB channels** under
`:root.dark` (default) and `:root.light`, then mapped to semantic Tailwind color names in
`tailwind.config.ts` via `rgb(var(--token) / <alpha-value>)`. This means:

- Use semantic classes — `bg-background`, `bg-surface`, `text-muted`, `border-border`,
  `bg-accent`, `text-status-in-progress`, `text-priority-urgent` — **never** raw hex.
- Opacity modifiers work: `bg-accent/10`, `ring-ring/60`.
- Dark is the default (`<html class="dark">`); the Stage 8 theme toggle swaps to `light`.

Animations `animate-fade-in`, `animate-slide-up`, `animate-scale-in` are predefined for
popovers/modals/lists.

## Layout (evolving)

```
src/
├── app/            # App Router routes (auth pages, dashboard, board, ...)
├── components/     # reusable UI (Stage 4+)
├── lib/            # api client, query client, helpers (Stage 4+)
└── stores/         # Zustand stores (Stage 4+)
```

## Conventions

- **Type everything.** No `any` without a justifying comment.
- Never hardcode the API URL — read `process.env.NEXT_PUBLIC_API_URL`.
- All API requests are credentialed (`credentials: 'include'`) so the HTTP-only auth cookie
  is sent.
- Prefer server components for static shell; use client components for interactivity.

## Environment

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL`.
