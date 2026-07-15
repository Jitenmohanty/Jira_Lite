import { schedulerQueue } from './queues';

/**
 * Registers repeatable (cron) jobs. Idempotent — BullMQ upserts by scheduler id,
 * so calling this on every worker boot is safe. Times are server-local.
 */
export async function registerRepeatableJobs(): Promise<void> {
  await schedulerQueue.upsertJobScheduler(
    'activity-digest-daily',
    { pattern: '0 8 * * *' }, // 08:00 every day
    { name: 'task:activity-digest', data: { task: 'activity-digest' } },
  );
  await schedulerQueue.upsertJobScheduler(
    'token-cleanup-daily',
    { pattern: '0 3 * * *' }, // 03:00 every day
    { name: 'task:token-cleanup', data: { task: 'token-cleanup' } },
  );
  await schedulerQueue.upsertJobScheduler(
    'embed-backfill-hourly',
    { pattern: '15 * * * *' }, // :15 every hour — catches any un-indexed issues
    { name: 'task:embed-backfill', data: { task: 'embed-backfill' } },
  );
  console.log(
    '🕓 Repeatable jobs registered: activity-digest (08:00), token-cleanup (03:00), embed-backfill (hourly)',
  );
}
