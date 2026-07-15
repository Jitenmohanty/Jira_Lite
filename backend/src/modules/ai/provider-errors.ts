/**
 * Helpers for interpreting Anthropic API errors in the AI worker. Kept separate
 * from the worker so they can be unit-tested without a Redis/BullMQ harness.
 */

/** True for provider limits we should pause-and-retry rather than fail on. */
export function isRateLimited(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 529;
}

/** Retry delay (ms) from an error's `retry-after` header, else a fallback. */
export function retryAfterMs(err: unknown, fallbackMs: number): number {
  const headers = (err as { headers?: Record<string, string> })?.headers;
  const raw = headers?.['retry-after'];
  const secs = raw ? Number(raw) : NaN;
  return Number.isFinite(secs) && secs > 0 ? secs * 1000 : fallbackMs;
}
