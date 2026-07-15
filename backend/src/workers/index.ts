import type { Worker } from 'bullmq';
import { env } from '../config/env';
import { startEmailWorker } from './email.worker';
import { startSchedulerWorker } from './scheduler.worker';
import { startEmbeddingWorker } from './embedding.worker';
import { startAiWorker } from './ai.worker';
import { registerRepeatableJobs } from '../queues/scheduler';
import { triggerTask } from '../queues/queues';

/**
 * Worker process entrypoint (run separately from the API: `npm run worker`).
 * Starts all BullMQ workers and shuts them down cleanly.
 */
const workers: Worker[] = [
  startEmailWorker(),
  startSchedulerWorker(),
  startEmbeddingWorker(),
  startAiWorker(),
];

// Register cron/repeatable jobs (idempotent).
void registerRepeatableJobs();

// Index any pre-existing / un-indexed issues once on boot (seeds, downtime).
void triggerTask('embed-backfill').catch(() => {});

console.log(`👷 Workers online (${workers.length}) — Redis ${env.REDIS_URL}`);

async function shutdown(signal: string) {
  console.log(`\n${signal} received, closing workers...`);
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
