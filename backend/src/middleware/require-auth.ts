import type { RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import { AUTH_COOKIE } from '../lib/cookies';
import { verifyToken } from '../lib/jwt';
import { unauthorized } from '../lib/http-errors';

/**
 * Verifies the auth cookie, loads the user, and attaches `req.user`.
 * Rejects with 401 if the cookie is missing/invalid or the user no longer exists.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
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
    columns: { id: true, email: true, name: true, avatarUrl: true },
  });
  if (!user) throw unauthorized('Session user no longer exists');

  req.user = user;
  next();
};
