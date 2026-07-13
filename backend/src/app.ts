import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { env } from './config/env';

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

  return app;
}
