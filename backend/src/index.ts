import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Tracer API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Graceful shutdown so nodemon/tsx restarts and container stops close cleanly.
const shutdown = (signal: string) => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
