import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/http-errors';
import { isProd } from '../config/env';

/** Consistent JSON error envelope for every failure path. */
interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** 404 handler for unmatched routes (mounted after all routers). */
export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorBody = {
    error: { code: 'NOT_FOUND', message: `Cannot ${req.method} ${req.path}` },
  };
  res.status(404).json(body);
};

/**
 * Central error handler. Must be the last middleware and keep all four args so
 * Express recognizes it as an error handler.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Zod validation errors -> 400 with field-level details.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION',
        message: 'Invalid request',
        details: err.flatten().fieldErrors,
      },
    } satisfies ErrorBody);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    } satisfies ErrorBody);
    return;
  }

  // Unexpected: log it, hide internals in production.
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: isProd ? 'Something went wrong' : String((err as Error)?.message ?? err),
    },
  } satisfies ErrorBody);
};
