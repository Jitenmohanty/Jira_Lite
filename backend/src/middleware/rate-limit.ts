import rateLimit, { type Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createRedisConnection } from '../queues/connection';
import { logger } from '../lib/logger';

/**
 * Redis-backed store so limits are shared across API instances (horizontal
 * scaling). Falls back to the in-memory store if Redis can't be reached, so a
 * Redis outage degrades rather than breaks auth.
 */
function buildStore(): Store | undefined {
  try {
    const client = createRedisConnection();
    client.on('error', (err) => logger.warn({ err: err.message }, 'rate-limit redis error'));
    return new RedisStore({
      // ioredis: forward the raw command to Redis (command first, then args).
      sendCommand: (...args: string[]) =>
        client.call(args[0] as string, ...args.slice(1)) as Promise<never>,
      prefix: 'rl:auth:',
    });
  } catch (err) {
    logger.warn({ err }, 'rate-limit falling back to in-memory store');
    return undefined;
  }
}

/**
 * Throttle auth endpoints to blunt brute-force / credential-stuffing. Keyed by
 * IP; returns our standard JSON error shape on limit.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: buildStore(),
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
  },
});
