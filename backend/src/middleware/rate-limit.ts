import rateLimit from 'express-rate-limit';

/**
 * Throttle auth endpoints to blunt brute-force/credential-stuffing. Keyed by IP;
 * returns our standard JSON error shape on limit.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
  },
});
