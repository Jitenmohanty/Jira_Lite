import { Redis } from 'ioredis';
import type { ConnectionOptions } from 'bullmq';
import { env } from '../config/env';

/** Parse REDIS_URL into connection options (supports rediss:// + auth). */
function parseRedisUrl(urlStr: string): ConnectionOptions {
  const u = new URL(urlStr);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: u.username || undefined,
    password: u.password || undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
    // Required by BullMQ workers (blocking commands must not time out).
    maxRetriesPerRequest: null,
  };
}

/**
 * Connection options handed to BullMQ. Passing options (not a shared client)
 * lets BullMQ create and manage its own connections per queue/worker — the
 * recommended pattern, and it sidesteps ioredis version-duplication clashes.
 */
export const bullConnection: ConnectionOptions = parseRedisUrl(env.REDIS_URL);

/**
 * ioredis client for the Redis-backed rate limiter. Unlike the BullMQ
 * connection (which sets `maxRetriesPerRequest: null` and queues blocking
 * commands indefinitely), this client must **fail fast** when Redis is
 * unavailable: `enableOfflineQueue: false` rejects commands immediately instead
 * of queueing them forever, and `commandTimeout` caps a connected-but-hung
 * server. That fast rejection is what lets the limiter fail *open* (see
 * `middleware/rate-limit.ts` `passOnStoreError`) so a Redis outage degrades to
 * "no throttling" rather than hanging every /auth request.
 */
export function createRateLimitRedis(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    commandTimeout: 1000,
    // Keep trying to reconnect in the background so throttling resumes once
    // Redis recovers, but never block a request waiting for it.
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
}
