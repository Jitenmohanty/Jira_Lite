import { Redis } from 'ioredis';

/**
 * The API throttles /auth to 30 requests / 15 min per IP (Redis-backed). A full
 * suite run stays well under that, but leftover counters from previous runs can
 * accumulate and trip a 429 mid-run. Best-effort: clear the auth rate-limit
 * keys before the run so the suite is reliably re-runnable. If Redis isn't
 * reachable we simply skip — the limit still won't be hit by a single run.
 */
export default async function globalSetup(): Promise<void> {
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
    // eslint-disable-next-line no-console
    console.log(`[global-setup] cleared ${keys.length} auth rate-limit key(s)`);
  } catch {
    // eslint-disable-next-line no-console
    console.log('[global-setup] Redis not reachable — skipping rate-limit reset');
  } finally {
    redis.disconnect();
  }
}
