import { test as base, expect } from '@playwright/test';
import { Redis } from 'ioredis';

/**
 * The API rate-limits everything under /auth to 30 requests / 15 min per IP —
 * and the SPA calls GET /auth/me on every page load, so a full run (API + UI)
 * easily exceeds 30 and starts getting 429s, which hangs the app on its auth
 * spinner. Brute-force protection matters in production, not against our own
 * test IP, so we reset that counter before each test (best-effort; skipped if
 * Redis is unreachable). This keeps the suite reliably re-runnable without
 * touching the backend's configuration.
 */
async function clearAuthRateLimit(): Promise<void> {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  try {
    await redis.connect();
    const keys = await redis.keys('rl:auth:*');
    if (keys.length) await redis.del(...keys);
  } catch {
    /* Redis not reachable — a single test won't hit the limit anyway. */
  } finally {
    redis.disconnect();
  }
}

export const test = base.extend<{ resetAuthRateLimit: void }>({
  resetAuthRateLimit: [
    async ({}, use) => {
      await clearAuthRateLimit();
      await use();
    },
    { auto: true },
  ],
});

export { expect };
