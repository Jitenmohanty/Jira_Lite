import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { requireAuth } from './middleware/require-auth';
import { authLimiter } from './middleware/rate-limit';
import { authRouter } from './modules/auth/auth.routes';
import { orgsRouter } from './modules/orgs/orgs.routes';
import { projectsRouter } from './modules/projects/projects.routes';
import { issuesRouter, projectIssuesRouter } from './modules/issues/issues.routes';
import { commentsRouter } from './modules/comments/comments.routes';
import { activityRouter } from './modules/activity/activity.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

/**
 * Builds the Express application. Kept separate from the server bootstrap so
 * integration tests can import the app without opening a port.
 */
export function createApp(): Express {
  const app = express();

  // Secure headers. CSP is irrelevant for a JSON API and CORP is relaxed so the
  // cross-origin SPA can read responses (CORS handles the actual policy).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Structured request logging (health checks are noisy — skip them).
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  // CORS locked to the configured frontend origin; credentials enabled so the
  // HTTP-only auth cookie is accepted.
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

  // Feature routers. All except /auth require authentication.
  // Auth endpoints are rate-limited against brute force.
  app.use('/auth', authLimiter, authRouter);
  app.use('/orgs', requireAuth, orgsRouter);
  app.use('/orgs/:orgId/projects', requireAuth, projectsRouter);
  app.use('/orgs/:orgId/activity', requireAuth, activityRouter);
  app.use('/projects/:projectId/issues', requireAuth, projectIssuesRouter);
  app.use('/issues', requireAuth, issuesRouter);
  app.use('/issues/:issueId/comments', requireAuth, commentsRouter);
  app.use('/notifications', requireAuth, notificationsRouter);

  // 404 + centralized error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
