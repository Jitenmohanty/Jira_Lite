import pino from 'pino';
import { isProd } from '../config/env';

/** Shared structured logger. JSON in all envs; pipe through `pino-pretty` in dev if desired. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  redact: ['req.headers.cookie', 'req.headers.authorization'],
});
