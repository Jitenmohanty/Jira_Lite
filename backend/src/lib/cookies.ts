import type { CookieOptions, Response } from 'express';
import { isProd } from '../config/env';

export const AUTH_COOKIE = 'tracer_token';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * HTTP-only cookie so the token is never exposed to JS (XSS-resistant).
 * In production the frontend and API may live on different domains, so we need
 * `SameSite=None; Secure` for the cookie to travel on cross-site requests
 * (CSRF risk is covered by the double-submit token). Locally over http we keep
 * `Lax` (same-site) since `None` requires `Secure`/HTTPS.
 */
const baseOptions: CookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  path: '/',
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, { ...baseOptions, maxAge: SEVEN_DAYS_MS });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, baseOptions);
}
