// Thin fetch wrapper around the Tracer backend. All requests are credentialed
// so the HTTP-only auth cookie is sent automatically.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorShape) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

const CSRF_COOKIE = 'csrf_token';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : undefined;
}

// Cached in memory. Same-origin (dev) we can read the cookie directly; cross
// origin (prod, different domains) the cookie isn't JS-readable, so we take the
// token from the GET /auth/csrf response body instead.
let cachedCsrf: string | undefined;

async function ensureCsrfToken(): Promise<string | undefined> {
  if (cachedCsrf) return cachedCsrf;
  const fromCookie = readCookie(CSRF_COOKIE);
  if (fromCookie) {
    cachedCsrf = fromCookie;
    return cachedCsrf;
  }
  try {
    const res = await fetch(`${BASE_URL}/auth/csrf`, { credentials: 'include' });
    const body = (await res.json().catch(() => null)) as { csrfToken?: string } | null;
    cachedCsrf = body?.csrfToken ?? readCookie(CSRF_COOKIE);
  } catch {
    /* leave undefined; the request will 403 and reset below */
  }
  return cachedCsrf;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  // Double-submit CSRF token on state-changing requests.
  const csrf = MUTATING.has(method) ? await ensureCsrfToken() : undefined;

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 204) return undefined as T;

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response
  }

  if (!res.ok) {
    // A stale CSRF token (e.g. after a server restart) -> drop the cache so the
    // next mutating request fetches a fresh one.
    if (res.status === 403 && MUTATING.has(method)) cachedCsrf = undefined;
    const body = (json as { error?: ApiErrorShape } | null)?.error ?? {
      code: 'UNKNOWN',
      message: `Request failed (${res.status})`,
    };
    throw new ApiError(res.status, body);
  }

  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
