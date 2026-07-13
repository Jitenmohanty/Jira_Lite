import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { env } from './config/env';
import { authRouter } from './modules/auth/auth.routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

/**
 * Builds the Express application. Kept separate from the server bootstrap so
 * integration tests can import the app without opening a port.
 */
export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Feature routers
  app.use('/auth', authRouter);

  // 404 + centralized error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
