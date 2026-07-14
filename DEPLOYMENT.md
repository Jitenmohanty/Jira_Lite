# Deploying Tracer

Tracer deploys as **two parts**: the backend (API + worker + Postgres + Redis) on
**Render** via the included [`render.yaml`](./render.yaml) blueprint, and the frontend
(Next.js) on **Vercel**. Both provide HTTPS, which the cross-site auth cookie requires.

```
Browser ──HTTPS──> Vercel (frontend)  ──credentialed fetch (HTTPS)──> Render (API)
                                                                        ├─ worker
                                                                        ├─ Postgres
                                                                        └─ Redis
```

## 1. Backend on Render (Blueprint)

1. Push this repo to GitHub (already done).
2. Render → **New → Blueprint** → pick the repo. Render reads `render.yaml` and provisions:
   `tracer-db` (Postgres), `tracer-redis` (Key Value), `tracer-api` (web), `tracer-worker`.
3. First deploy will build the Docker images. The API **runs migrations on boot** and exposes
   `/health` (liveness) and `/ready` (checks the DB).
4. Copy the API URL (e.g. `https://tracer-api.onrender.com`).

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import the repo.
2. Set **Root Directory** to `frontend`.
3. Add an env var **`NEXT_PUBLIC_API_URL`** = your Render API URL. (It's inlined at build time,
   so redeploy if you change it.)
4. Deploy. Copy the app URL (e.g. `https://tracer.vercel.app`).

## 3. Wire the two together

Back in Render, set these `tracer-api` env vars (marked `sync: false` in the blueprint) and
redeploy:

| Var | Value |
| --- | --- |
| `CORS_ORIGIN` | your Vercel URL, e.g. `https://tracer.vercel.app` |
| `APP_URL` | same Vercel URL (used in email links) |

That's the minimum for a working deployment. Then seed demo data once (Render dashboard →
`tracer-api` → **Shell**):

```bash
node dist/db/seed.js   # or: npm run db:seed
```

## 4. Optional integrations

- **Google sign-in:** create an OAuth 2.0 Web client, add the redirect URI
  `https://<api>.onrender.com/auth/google/callback`, then set `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` on both `tracer-api` and in Google.
- **Real email:** set `SMTP_HOST/PORT/USER/PASS` (e.g. a Gmail App Password) on `tracer-api`
  **and** `tracer-worker`. Without them, emails are rendered and logged (no delivery).

## Production notes (already handled in code)

- Auth + CSRF cookies switch to `SameSite=None; Secure` when `NODE_ENV=production` so they work
  across the Vercel/Render domains; CSRF stays enforced via the double-submit token (the token
  is returned by `GET /auth/csrf`, so the cross-domain frontend doesn't need to read the cookie).
- Express `trust proxy` is enabled in production so `Secure` cookies and per-IP rate limiting
  work behind the platform proxy.
- The API self-migrates on boot; the worker runs `npm run worker:start`.

> **Free-tier caveats:** Render free web services sleep after inactivity (first request wakes
> them, ~30s cold start) and the free Postgres expires after 90 days. Fine for a demo; upgrade
> for anything real.
