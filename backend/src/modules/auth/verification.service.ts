import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { db } from '../../db/client';
import { authTokens, users } from '../../db/schema';
import { env } from '../../config/env';
import { generateToken, hashToken } from '../../lib/tokens';
import { hashPassword } from '../../lib/password';
import { badRequest } from '../../lib/http-errors';
import { enqueueEmail } from '../../queues/queues';

type TokenType = 'email_verify' | 'password_reset';

const HOUR = 60 * 60 * 1000;

/** Issue a single-use token of the given type and return the raw value. */
async function issueToken(userId: string, type: TokenType, ttlMs: number): Promise<string> {
  const { raw, hash } = generateToken();
  await db.insert(authTokens).values({
    userId,
    type,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return raw;
}

/** Validate + consume a token, returning its user id. Throws if invalid/expired. */
async function consumeToken(raw: string, type: TokenType): Promise<string> {
  const hash = hashToken(raw);
  const token = await db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.tokenHash, hash),
      eq(authTokens.type, type),
      isNull(authTokens.usedAt),
      gt(authTokens.expiresAt, new Date()),
    ),
  });
  if (!token) throw badRequest('This link is invalid or has expired.');
  await db.update(authTokens).set({ usedAt: new Date() }).where(eq(authTokens.id, token.id));
  return token.userId;
}

/** Send an email-verification link (used on signup and resend). */
export async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  const raw = await issueToken(userId, 'email_verify', 24 * HOUR);
  const url = `${env.APP_URL}/verify-email?token=${raw}`;
  await enqueueEmail({ template: 'verify-email', to: email, data: { url } });
}

/** Verify an email token; marks the user verified and sends a welcome email. */
export async function verifyEmail(rawToken: string): Promise<void> {
  const userId = await consumeToken(rawToken, 'email_verify');
  const [user] = await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, userId))
    .returning();
  if (user) {
    await enqueueEmail({ template: 'welcome', to: user.email, data: { name: user.name } });
  }
}

/**
 * Begin a password reset. Always resolves (never reveals whether the email
 * exists); only sends an email when a matching account is found.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, email: true },
  });
  if (!user) return;
  const raw = await issueToken(user.id, 'password_reset', 1 * HOUR);
  const url = `${env.APP_URL}/reset-password?token=${raw}`;
  await enqueueEmail({ template: 'password-reset', to: user.email, data: { url } });
}

/** Complete a password reset with a valid token. */
export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const userId = await consumeToken(rawToken, 'password_reset');
  const passwordHash = await hashPassword(newPassword);
  // Proving control of the inbox also verifies the email.
  await db.update(users).set({ passwordHash, emailVerified: true }).where(eq(users.id, userId));
}

/** Delete expired auth tokens. Run on a schedule (see the scheduler worker). */
export async function cleanupExpiredTokens(): Promise<number> {
  const deleted = await db
    .delete(authTokens)
    .where(lt(authTokens.expiresAt, new Date()))
    .returning({ id: authTokens.id });
  return deleted.length;
}
