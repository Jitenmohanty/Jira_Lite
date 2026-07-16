import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { users, type User } from '../../db/schema';
import { env } from '../../config/env';
import { enqueueEmail } from '../../queues/queues';
import { badRequest } from '../../lib/http-errors';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

/** Google sign-in is enabled only when both credentials are configured. */
export function isGoogleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/** Opaque anti-CSRF value stored in a cookie and echoed back by Google. */
export function generateState(): string {
  return randomBytes(16).toString('hex');
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

/** Exchange the auth code for tokens and fetch the user's Google profile. */
export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID ?? '',
      client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw badRequest('Google token exchange failed');
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw badRequest('Google did not return an access token');

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) throw badRequest('Failed to fetch Google profile');
  const profile = (await userRes.json()) as GoogleProfile;
  if (!profile.email) throw badRequest('Google profile has no email');
  // Only trust the email if Google says it's verified — otherwise an unverified
  // Google email matching a victim's registered address could hijack that
  // password account via the link-by-email path below.
  if (profile.email_verified !== true) {
    throw badRequest('Your Google account email is not verified');
  }
  return profile;
}

/**
 * Find or create a local user for a Google profile, linking by email. A Google
 * email is already verified, so we trust it; new users get a welcome email.
 */
export async function upsertGoogleUser(profile: GoogleProfile): Promise<User> {
  const email = profile.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (existing) {
    // Backfill verification/avatar for a pre-existing password account.
    if (!existing.emailVerified || (!existing.avatarUrl && profile.picture)) {
      await db
        .update(users)
        .set({ emailVerified: true, avatarUrl: existing.avatarUrl ?? profile.picture ?? null })
        .where(eq(users.id, existing.id));
    }
    return existing;
  }

  const [user] = await db
    .insert(users)
    .values({
      email,
      name: profile.name ?? email.split('@')[0] ?? email,
      passwordHash: null,
      avatarUrl: profile.picture ?? null,
      emailVerified: true,
    })
    .returning();
  if (!user) throw new Error('Failed to create user');

  await enqueueEmail({ template: 'welcome', to: user.email, data: { name: user.name } });
  return user;
}
