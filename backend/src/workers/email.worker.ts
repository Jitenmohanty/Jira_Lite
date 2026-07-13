import { Worker } from 'bullmq';
import { bullConnection } from '../queues/connection';
import { QUEUE, type EmailJobData } from '../queues/queues';

/**
 * Processes queued emails. Phase 1 logs the intent; Phase 2 renders the
 * template and sends via the email service.
 */
export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    QUEUE.email,
    async (job) => {
      console.log(`[email] sending "${job.data.template}" → ${job.data.to}`);
      // Phase 2 replaces this with: await sendEmail(job.data)
    },
    { connection: bullConnection, concurrency: 5 },
  );

  worker.on('completed', (job) => console.log(`[email] job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[email] job ${job?.id} failed:`, err.message));

  return worker;
}
