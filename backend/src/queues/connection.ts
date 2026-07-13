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

/** A standalone ioredis client for direct use (e.g. Redis-backed rate limiting). */
export function createRedisConnection(): Redis {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });
}
