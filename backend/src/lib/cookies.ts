import type { CookieOptions, Response } from 'express';
import { isProd } from '../config/env';

export const AUTH_COOKIE = 'tracer_token';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * HTTP-only cookie so the token is never exposed to JS (XSS-resistant).
 * `sameSite: 'lax'` is fine because the SPA is same-site in dev; `secure` is
 * enabled in production (HTTPS).
 */
const baseOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: '/',
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, { ...baseOptions, maxAge: SEVEN_DAYS_MS });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, baseOptions);
}
