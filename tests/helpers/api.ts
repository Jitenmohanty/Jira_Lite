import { request as playwrightRequest, expect, type APIRequestContext } from '@playwright/test';
import { API_BASE_URL } from '../playwright.config';

/** Seeded users (see backend/src/db/seed.ts). All share the same password. */
export const PASSWORD = 'password123';
export const USERS = {
  owner: 'owner@tracer.dev',
  admin: 'admin@tracer.dev',
  member: 'member@tracer.dev',
} as const;

export interface ApiSession {
  /** Request context carrying the auth + csrf cookies for this user. */
  ctx: APIRequestContext;
  /** CSRF token value to echo in `x-csrf-token` on mutating requests. */
  csrf: string;
  user: { id: string; email: string; name: string };
  dispose(): Promise<void>;
}

/**
 * Log in against the API and return a session whose request context holds the
 * HTTP-only auth cookie and the double-submit CSRF cookie. `/auth/*` is exempt
 * from CSRF, but every other mutation must send the `x-csrf-token` header —
 * use `csrfHeaders(session)` for that.
 */
export async function loginApi(email: string, password: string = PASSWORD): Promise<ApiSession> {
  const ctx = await playwrightRequest.newContext({ baseURL: API_BASE_URL });

  const csrfRes = await ctx.get('/auth/csrf');
  expect(csrfRes.ok(), `GET /auth/csrf → ${csrfRes.status()}`).toBeTruthy();
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const res = await ctx.post('/auth/login', {
    headers: { 'x-csrf-token': csrfToken },
    data: { email, password },
  });
  expect(res.ok(), `POST /auth/login (${email}) → ${res.status()}: ${await res.text()}`).toBeTruthy();
  const { user } = (await res.json()) as { user: ApiSession['user'] };

  return { ctx, csrf: csrfToken, user, dispose: () => ctx.dispose() };
}

/**
 * Cached sessions, keyed by email. The auth endpoints are rate-limited (30 req
 * / 15 min per IP), so most tests reuse one login per user via `getSession`
 * instead of logging in again. Do NOT dispose a cached session inside a test —
 * later tests reuse it. Tests that specifically exercise login/logout should
 * call `loginApi` directly for a throwaway context instead.
 */
const sessionCache = new Map<string, ApiSession>();

export async function getSession(email: string, password: string = PASSWORD): Promise<ApiSession> {
  const cached = sessionCache.get(email);
  if (cached) return cached;
  const session = await loginApi(email, password);
  sessionCache.set(email, session);
  return session;
}

/** Header bag to attach the CSRF token to a mutating request. */
export function csrfHeaders(session: ApiSession): Record<string, string> {
  return { 'x-csrf-token': session.csrf };
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
}
export interface Project {
  id: string;
  orgId: string;
  name: string;
  key: string;
}
export interface Member {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
}

/** First org the user belongs to (the seeded "Tracer" org for owner/admin/member). */
export async function firstOrg(session: ApiSession): Promise<Org> {
  const res = await session.ctx.get('/orgs');
  expect(res.ok(), `GET /orgs → ${res.status()}`).toBeTruthy();
  const { orgs } = (await res.json()) as { orgs: Org[] };
  expect(orgs.length, 'expected at least one org').toBeGreaterThan(0);
  return orgs[0];
}

/** First project in the given org (the seeded "Tracer Core"/TRC project). */
export async function firstProject(session: ApiSession, orgId: string): Promise<Project> {
  const res = await session.ctx.get(`/orgs/${orgId}/projects`);
  expect(res.ok(), `GET /orgs/${orgId}/projects → ${res.status()}`).toBeTruthy();
  const { projects } = (await res.json()) as { projects: Project[] };
  expect(projects.length, 'expected at least one project').toBeGreaterThan(0);
  return projects[0];
}

/** Members of the org. */
export async function listMembers(session: ApiSession, orgId: string): Promise<Member[]> {
  const res = await session.ctx.get(`/orgs/${orgId}/members`);
  expect(res.ok(), `GET /orgs/${orgId}/members → ${res.status()}`).toBeTruthy();
  const { members } = (await res.json()) as { members: Member[] };
  return members;
}
