import type { RequestHandler } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { apiKeys, users } from '../db/schema';
import { AUTH_COOKIE } from '../lib/cookies';
import { verifyToken } from '../lib/jwt';
import { hashApiKey, looksLikeApiKey } from '../lib/api-key';
import { unauthorized } from '../lib/http-errors';

const USER_COLUMNS = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  emailVerified: true,
} as const;

/**
 * Authenticates a request by one of two means and attaches `req.user` +
 * `req.auth`:
 *   1. The JWT auth cookie (browser SPA).
 *   2. An `Authorization: Bearer trc_…` API key (programmatic access). The key
 *      acts as its creating user but is pinned to its org (`req.auth.orgId`),
 *      which `requireRole` enforces so a key can't reach another organization.
 * Rejects with 401 if neither is present/valid or the user no longer exists.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  // 1) API key via Authorization: Bearer.
  const authz = req.get('authorization');
  if (authz?.startsWith('Bearer ')) {
    const raw = authz.slice(7).trim();
    if (!looksLikeApiKey(raw)) throw unauthorized('Invalid API key');

    const key = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.keyHash, hashApiKey(raw)), isNull(apiKeys.revokedAt)),
    });
    if (!key) throw unauthorized('Invalid or revoked API key');

    const user = await db.query.users.findFirst({
      where: eq(users.id, key.userId),
      columns: USER_COLUMNS,
    });
    if (!user) throw unauthorized('API key owner no longer exists');

    // Best-effort last-used timestamp (never blocks the request).
    void db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, key.id))
      .catch(() => {});

    req.user = user;
    req.auth = { via: 'apikey', orgId: key.orgId };
    return next();
  }

  // 2) JWT cookie.
  const token = req.cookies?.[AUTH_COOKIE] as string | undefined;
  if (!token) throw unauthorized();

  let userId: string;
  try {
    userId = verifyToken(token).sub;
  } catch {
    throw unauthorized('Invalid or expired session');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: USER_COLUMNS,
  });
  if (!user) throw unauthorized('Session user no longer exists');

  req.user = user;
  req.auth = { via: 'cookie' };
  next();
};
