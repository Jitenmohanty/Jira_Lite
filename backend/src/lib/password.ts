import bcrypt from 'bcryptjs';

/**
 * Password hashing. We use `bcryptjs` (pure JS) rather than the native `bcrypt`
 * binding to keep installs painless across platforms (notably Windows CI) — it
 * implements the same bcrypt algorithm and is wire-compatible.
 */
const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
