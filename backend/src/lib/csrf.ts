import { randomBytes } from 'node:crypto';
import type { CookieOptions, RequestHandler, Response } from 'express';
import { isProd } from '../config/env';
import { forbidden } from './http-errors';

/**
 * Double-submit-cookie CSRF protection. The token lives in a readable (non
 * HTTP-only) cookie; the SPA echoes it in the `x-csrf-token` header on
 * state-changing requests. An attacker's cross-site request can't read the
 * cookie to forge the header, so it fails. This layers on top of the auth
 * cookie's `SameSite=Lax`.
 */
export const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const cookieOptions: CookieOptions = {
  httpOnly: false, // the value is also returned by GET /auth/csrf for cross-domain use
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
  path: '/',
};

/** Set (or refresh) the CSRF cookie; returns the token value. */
export function issueCsrfToken(res: Response, existing?: string): string {
  const token = existing ?? randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE, token, cookieOptions);
  return token;
}

/** Rejects mutating requests whose header doesn't match the CSRF cookie. */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookie = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const header = req.get(CSRF_HEADER);
  if (!cookie || !header || cookie !== header) {
    throw forbidden('Invalid or missing CSRF token');
  }
  next();
};
