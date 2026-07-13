import { Worker } from 'bullmq';
import { bullConnection } from '../queues/connection';
import { QUEUE, type EmailJobData } from '../queues/queues';
import { sendEmail } from '../modules/email/email.service';

/** Renders and sends queued emails via the email service. */
export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    QUEUE.email,
    async (job) => {
      await sendEmail(job.data);
    },
    { connection: bullConnection, concurrency: 5 },
  );

  worker.on('completed', (job) => console.log(`[email] job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[email] job ${job?.id} failed:`, err.message));

  return worker;
}
