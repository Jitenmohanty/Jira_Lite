import rateLimit, { ipKeyGenerator, type Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createRateLimitRedis } from '../queues/connection';
import { env } from '../config/env';
import { logger } from '../lib/logger';

/**
 * Redis-backed store so limits are shared across API instances (horizontal
 * scaling). The client fails fast when Redis is unreachable (see
 * `createRateLimitRedis`), and the limiters set `passOnStoreError: true`, so a
 * Redis outage lets requests through (degrades) instead of hanging or 500-ing
 * the auth path. If the client can't even be constructed we drop to the
 * built-in in-memory store.
 */
function buildStore(prefix: string): Store | undefined {
  try {
    const client = createRateLimitRedis();
    client.on('error', (err) => logger.warn({ err: err.message }, 'rate-limit redis error'));
    return new RedisStore({
      // ioredis: forward the raw command to Redis (command first, then args).
      sendCommand: (...args: string[]) =>
        client.call(args[0] as string, ...args.slice(1)) as Promise<never>,
      prefix,
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
  store: buildStore('rl:auth:'),
  // Availability over strictness: if the Redis store errors (outage), let the
  // request through rather than hang/500 the whole auth surface.
  passOnStoreError: true,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
  },
});

/**
 * Throttle "Ask Tracer" questions per user (not per IP) — the LLM is the
 * expensive resource. Runs after `requireAuth`, so `req.user` is set.
 */
export const aiLimiter = rateLimit({
  windowMs: env.AI_RATE_WINDOW_MS,
  limit: env.AI_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: buildStore('rl:ai:'),
  passOnStoreError: true,
  // Key per authenticated user; fall back to an IPv6-safe IP key for safety.
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? '', 56),
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'You have reached the AI question limit for now. Please try again later.',
    },
  },
});
