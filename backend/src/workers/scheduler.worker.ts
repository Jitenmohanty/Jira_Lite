import { Worker } from 'bullmq';
import { bullConnection } from '../queues/connection';
import { QUEUE, type SchedulerJobData } from '../queues/queues';
import { runActivityDigest } from '../modules/activity/digest.service';
import { cleanupExpiredTokens } from '../modules/auth/verification.service';
import { backfillEmbeddings } from '../modules/ai/backfill.service';

/** Runs scheduled/cron tasks dispatched from the scheduler queue. */
export function startSchedulerWorker(): Worker<SchedulerJobData> {
  const worker = new Worker<SchedulerJobData>(
    QUEUE.scheduler,
    async (job) => {
      switch (job.data.task) {
        case 'activity-digest': {
          const r = await runActivityDigest();
          console.log(`[scheduler] activity-digest: ${r.emails} emails across ${r.orgs} orgs`);
          break;
        }
        case 'token-cleanup': {
          const n = await cleanupExpiredTokens();
          console.log(`[scheduler] token-cleanup: removed ${n} expired tokens`);
          break;
        }
        case 'embed-backfill': {
          const n = await backfillEmbeddings();
          console.log(`[scheduler] embed-backfill: enqueued ${n} un-indexed issues`);
          break;
        }
      }
    },
    { connection: bullConnection },
  );

  worker.on('failed', (job, err) =>
    console.error(`[scheduler] job ${job?.id} failed:`, err.message),
  );
  return worker;
}
