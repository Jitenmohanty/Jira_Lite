import { Queue, type JobsOptions } from 'bullmq';
import { bullConnection } from './connection';

/** Queue names (single source of truth for producers and workers). */
export const QUEUE = {
  email: 'email',
  scheduler: 'scheduler',
  embedding: 'embedding',
  ai: 'ai',
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

/* --------------------------------------------------------- embedding queue */

export interface EmbeddingJobData {
  issueId: string;
}

export const embeddingQueue = new Queue<EmbeddingJobData>(QUEUE.embedding, {
  connection: bullConnection,
  defaultJobOptions,
});

/**
 * (Re)compute an issue's semantic embedding. De-duped by job id so a burst of
 * edits to the same issue collapses to one pending job.
 */
export function enqueueEmbedding(issueId: string) {
  // De-dupe by job id so a burst of edits to one issue collapses to a single
  // pending job. BullMQ job ids must not contain ':' — use a dash-joined id.
  return embeddingQueue.add('embedding-issue', { issueId }, { jobId: `emb-${issueId}` });
}

/* ---------------------------------------------------------------- ai queue */

export interface AiJobData {
  orgId: string;
  userId: string;
  question: string;
}

export interface AiJobResult {
  answer: string;
  citations: { identifier: string; issueId: string; projectId: string; title: string }[];
}

/**
 * The AI queue leans on BullMQ's backoff + queue-level rate limiting to survive
 * Gemini rate limits with no human intervention: the worker pauses the queue
 * for the provider's retry window and BullMQ auto-resumes the same job later.
 * Attempts are generous so a transient 429/503 never drops a question.
 */
export const aiQueue = new Queue<AiJobData, AiJobResult>(QUEUE.ai, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 8,
    backoff: { type: 'exponential', delay: 4000 },
    // Keep finished jobs briefly so the client can poll for the result.
    removeOnComplete: { age: 3600, count: 500 },
    removeOnFail: { age: 3600, count: 500 },
  },
});

export function enqueueAiQuestion(data: AiJobData) {
  return aiQueue.add('ai:ask', data);
}

/* --------------------------------------------------------- scheduler queue */

export type ScheduledTask = 'activity-digest' | 'token-cleanup' | 'embed-backfill';

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
