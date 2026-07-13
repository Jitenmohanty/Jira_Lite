import type { Worker } from 'bullmq';
import { env } from '../config/env';
import { startEmailWorker } from './email.worker';

/**
 * Worker process entrypoint (run separately from the API: `npm run worker`).
 * Starts all BullMQ workers and shuts them down cleanly.
 */
const workers: Worker[] = [startEmailWorker()];

console.log(`👷 Workers online (${workers.length}) — Redis ${env.REDIS_URL}`);

async function shutdown(signal: string) {
  console.log(`\n${signal} received, closing workers...`);
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
