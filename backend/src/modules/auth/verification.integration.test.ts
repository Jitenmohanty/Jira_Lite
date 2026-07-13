import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, pool } from '../../db/client';
import { authTokens, users } from '../../db/schema';
import { hashToken } from '../../lib/tokens';
import { verifyPassword } from '../../lib/password';
import {
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
} from './verification.service';

/**
 * Exercises the token flows against the real Postgres. The raw token normally
 * lives only in the email; here we read the most recent token row and recover
 * a usable raw value by matching its hash (tokens are random, so we generate a
 * candidate and assert via the service instead).
 */
let userId: string;
const email = `verify+${Date.now()}@tracer.dev`;

beforeEach(async () => {
  await db.delete(users).where(eq(users.email, email));
  const [u] = await db
    .insert(users)
    .values({ email, name: 'Verify Tester', passwordHash: 'placeholder' })
    .returning();
  userId = u!.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, email));
  await pool.end();
});

/** Helper: pull the raw token by intercepting generateToken via the DB hash. */
async function latestRawToken(type: 'email_verify' | 'password_reset'): Promise<string> {
  // We can't read the raw token from the DB (only its hash is stored), so the
  // tests below issue tokens through a spy-free path: re-issue and capture.
  const rows = await db.query.authTokens.findMany({
    where: eq(authTokens.userId, userId),
  });
  const row = rows.filter((r) => r.type === type).at(-1);
  return row?.tokenHash ?? '';
}

describe('email verification', () => {
  it('verifies a valid token and flips email_verified', async () => {
    // Issue via the service, then reconstruct: since only the hash is stored,
    // we test verifyEmail by issuing a known raw token directly.
    const raw = 'known-raw-token-for-test';
    await db.insert(authTokens).values({
      userId,
      type: 'email_verify',
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await verifyEmail(raw);

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    expect(user?.emailVerified).toBe(true);
  });

  it('rejects an expired token', async () => {
    const raw = 'expired-token';
    await db.insert(authTokens).values({
      userId,
      type: 'email_verify',
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(verifyEmail(raw)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a token that was already used', async () => {
    const raw = 'single-use-token';
    await db.insert(authTokens).values({
      userId,
      type: 'email_verify',
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await verifyEmail(raw);
    await expect(verifyEmail(raw)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('sendVerificationEmail issues an email_verify token', async () => {
    await sendVerificationEmail(userId, email);
    const hash = await latestRawToken('email_verify');
    expect(hash).toBeTruthy();
  });
});

describe('password reset', () => {
  it('resets the password with a valid token and verifies the email', async () => {
    const raw = 'reset-token';
    await db.insert(authTokens).values({
      userId,
      type: 'password_reset',
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await resetPassword(raw, 'brand-new-password');

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    expect(user?.emailVerified).toBe(true);
    expect(await verifyPassword('brand-new-password', user!.passwordHash)).toBe(true);
  });

  it('requestPasswordReset is a no-op for unknown emails', async () => {
    await expect(requestPasswordReset('nobody@nowhere.dev')).resolves.toBeUndefined();
  });
});
