import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * API key format: `trc_<43-char base64url random>`. Only the SHA-256 hash is
 * persisted; the raw key is shown to the user exactly once at creation.
 */
const PREFIX = 'trc_';

export interface GeneratedKey {
  /** The full secret — returned to the caller once, never stored. */
  raw: string;
  /** SHA-256 hex of the raw key — what we persist and look up by. */
  hash: string;
  /** Short non-secret identifier shown in the UI, e.g. `trc_a1b2c3d4`. */
  prefix: string;
}

export function generateApiKey(): GeneratedKey {
  const raw = PREFIX + randomBytes(32).toString('base64url');
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 12) };
}

/** Deterministic hash used for both storage and constant-time lookup. */
export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** True if the string looks like one of our keys (cheap pre-filter). */
export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(PREFIX) && value.length > PREFIX.length + 20;
}

/** Constant-time hex-hash comparison (defends against a timing oracle). */
export function hashesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
