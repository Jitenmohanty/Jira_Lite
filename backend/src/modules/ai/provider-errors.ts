/**
 * Helpers for interpreting Gemini API errors in the AI worker. Kept separate
 * from the worker so they can be unit-tested without a Redis/BullMQ harness.
 */

/**
 * True for provider limits we should pause-and-retry rather than fail on:
 * 429 (RESOURCE_EXHAUSTED — free-tier rate limits) and 503 (UNAVAILABLE —
 * model overloaded). `@google/genai` throws an `ApiError` carrying `.status`.
 */
export function isRateLimited(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 503;
}

/**
 * True for client errors that won't succeed on retry (invalid key, malformed
 * request, permission denied) — but NOT 429, which we handle as a rate limit.
 * The worker fails these fast instead of exhausting its retry budget.
 */
export function isFatalClientError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 429;
}

/** Retry delay (ms) from an error's `retry-after` header, else a fallback. */
export function retryAfterMs(err: unknown, fallbackMs: number): number {
  const headers = (err as { headers?: Record<string, string> })?.headers;
  const raw = headers?.['retry-after'];
  const secs = raw ? Number(raw) : NaN;
  return Number.isFinite(secs) && secs > 0 ? secs * 1000 : fallbackMs;
}
