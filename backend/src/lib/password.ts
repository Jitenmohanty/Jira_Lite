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

/**
 * A precomputed bcrypt hash (of a random string) to compare against when no
 * account/hash exists, so login spends the same ~bcrypt time whether or not the
 * email is registered — closing the timing side-channel that would otherwise
 * leak account existence.
 */
const DUMMY_HASH = bcrypt.hashSync('a-string-no-one-will-ever-submit', SALT_ROUNDS);

/** Burn a bcrypt comparison to equalize timing when there's no real hash. */
export function verifyPasswordDummy(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, DUMMY_HASH);
}
