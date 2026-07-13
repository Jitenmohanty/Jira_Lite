import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { env } from './config/env';
import { requireAuth } from './middleware/require-auth';
import { authRouter } from './modules/auth/auth.routes';
import { orgsRouter } from './modules/orgs/orgs.routes';
import { projectsRouter } from './modules/projects/projects.routes';
import { issuesRouter, projectIssuesRouter } from './modules/issues/issues.routes';
import { commentsRouter } from './modules/comments/comments.routes';
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

  // Feature routers. All except /auth require authentication.
  app.use('/auth', authRouter);
  app.use('/orgs', requireAuth, orgsRouter);
  app.use('/orgs/:orgId/projects', requireAuth, projectsRouter);
  app.use('/projects/:projectId/issues', requireAuth, projectIssuesRouter);
  app.use('/issues', requireAuth, issuesRouter);
  app.use('/issues/:issueId/comments', requireAuth, commentsRouter);

  // 404 + centralized error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
