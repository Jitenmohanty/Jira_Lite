import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { users, type User } from '../../db/schema';
import { hashPassword, verifyPassword } from '../../lib/password';
import { conflict, unauthorized } from '../../lib/http-errors';
import { sendVerificationEmail } from './verification.service';
import type { LoginInput, SignupInput } from './auth.schemas';

/** User fields safe to return to clients (never the password hash). */
export type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'avatarUrl' | 'createdAt'>;

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
  };
}

export async function signup(input: SignupInput): Promise<PublicUser> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
    columns: { id: true },
  });
  if (existing) throw conflict('An account with that email already exists');

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ email: input.email, name: input.name, passwordHash })
    .returning();

  if (!user) throw new Error('Failed to create user');

  // Send the verification email via the queue (never blocks signup). The
  // welcome email follows once the address is verified.
  await sendVerificationEmail(user.id, user.email);

  return toPublicUser(user);
}

export async function login(input: LoginInput): Promise<PublicUser> {
  const user = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  // Constant-ish message regardless of which half failed, to avoid leaking
  // which emails are registered.
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw unauthorized('Invalid email or password');
  }
  return toPublicUser(user);
}
