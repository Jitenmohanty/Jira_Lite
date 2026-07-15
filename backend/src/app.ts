import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './docs/openapi';
import { env, isProd } from './config/env';
import { pool } from './db/client';
import { logger } from './lib/logger';
import { requireAuth } from './middleware/require-auth';
import { authLimiter } from './middleware/rate-limit';
import { csrfProtection } from './lib/csrf';
import { authRouter } from './modules/auth/auth.routes';
import { orgsRouter } from './modules/orgs/orgs.routes';
import { projectsRouter } from './modules/projects/projects.routes';
import { issuesRouter, orgIssuesRouter, projectIssuesRouter } from './modules/issues/issues.routes';
import { commentsRouter } from './modules/comments/comments.routes';
import { activityRouter } from './modules/activity/activity.routes';
import { insightsRouter } from './modules/insights/insights.routes';
import { aiRouter } from './modules/ai/ai.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

/**
 * Builds the Express application. Kept separate from the server bootstrap so
 * integration tests can import the app without opening a port.
 */
export function createApp(): Express {
  const app = express();

  // Behind a platform proxy (Render/Fly/etc.) in production: trust the first
  // proxy so `Secure` cookies are honored and rate limiting keys off the real
  // client IP (X-Forwarded-For) rather than the proxy.
  if (isProd) app.set('trust proxy', 1);

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

  // Liveness: process is up.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Readiness: dependencies reachable (used by platform health checks).
  app.get('/ready', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'not-ready' });
    }
  });

  // API documentation (public): raw spec + Swagger UI.
  app.get('/openapi.json', (_req, res) => res.json(openapiSpec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'Tracer API' }));

  // Feature routers. All except /auth require authentication + CSRF on mutations.
  // Auth endpoints are rate-limited against brute force.
  app.use('/auth', authLimiter, authRouter);
  app.use('/orgs', requireAuth, csrfProtection, orgsRouter);
  app.use('/orgs/:orgId/projects', requireAuth, csrfProtection, projectsRouter);
  app.use('/orgs/:orgId/activity', requireAuth, csrfProtection, activityRouter);
  app.use('/orgs/:orgId/insights', requireAuth, csrfProtection, insightsRouter);
  app.use('/orgs/:orgId/ai', requireAuth, csrfProtection, aiRouter);
  app.use('/orgs/:orgId/issues', requireAuth, csrfProtection, orgIssuesRouter);
  app.use('/projects/:projectId/issues', requireAuth, csrfProtection, projectIssuesRouter);
  app.use('/issues', requireAuth, csrfProtection, issuesRouter);
  app.use('/issues/:issueId/comments', requireAuth, csrfProtection, commentsRouter);
  app.use('/notifications', requireAuth, csrfProtection, notificationsRouter);

  // 404 + centralized error handling (must be last).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
