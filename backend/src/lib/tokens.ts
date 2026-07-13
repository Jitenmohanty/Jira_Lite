import { createHash, randomBytes } from 'node:crypto';

/** SHA-256 hex hash — what we persist for a token. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** A cryptographically-random URL-safe token and its hash for storage. */
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}
