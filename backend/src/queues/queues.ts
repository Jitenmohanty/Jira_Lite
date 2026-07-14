import { Queue, type JobsOptions } from 'bullmq';
import { bullConnection } from './connection';

/** Queue names (single source of truth for producers and workers). */
export const QUEUE = {
  email: 'email',
  scheduler: 'scheduler',
} as const;

export type EmailTemplate =
  | 'welcome'
  | 'verify-email'
  | 'password-reset'
  | 'issue-assigned'
  | 'activity-digest';

export interface EmailJobData {
  template: EmailTemplate;
  to: string;
  data: Record<string, unknown>;
}

/** Retry with exponential backoff; keep bounded history for inspection. */
const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

export const emailQueue = new Queue<EmailJobData>(QUEUE.email, {
  connection: bullConnection,
  defaultJobOptions,
});

/** Enqueue a templated email to be sent by the email worker. */
export function enqueueEmail(data: EmailJobData) {
  return emailQueue.add(`email:${data.template}`, data);
}

/* --------------------------------------------------------- scheduler queue */

export type ScheduledTask = 'activity-digest' | 'token-cleanup';

export interface SchedulerJobData {
  task: ScheduledTask;
}

export const schedulerQueue = new Queue<SchedulerJobData>(QUEUE.scheduler, {
  connection: bullConnection,
  defaultJobOptions,
});

/** Enqueue a scheduled task to run once, now (used for manual triggers/tests). */
export function triggerTask(task: ScheduledTask) {
  return schedulerQueue.add(`task:${task}`, { task });
}
