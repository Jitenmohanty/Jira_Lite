import { UnrecoverableError, Worker } from 'bullmq';
import { bullConnection } from '../queues/connection';
import { QUEUE, type AiJobData, type AiJobResult } from '../queues/queues';
import { askTracer } from '../modules/ai/ai.service';
import { isFatalClientError, isRateLimited, retryAfterMs } from '../modules/ai/provider-errors';

/**
 * Runs "Ask Tracer" questions off the request path.
 *
 * Auto-pause / auto-resume on provider limits (the requested behaviour): when
 * Gemini returns 429 (rate limited — common on the free tier) or 503
 * (overloaded), we pause the whole AI queue for the provider's `retry-after`
 * via `worker.rateLimit()` and throw `Worker.RateLimitError()`. BullMQ then
 * holds the job and every other queued question, and resumes them automatically
 * once the window elapses — no human intervention, no dropped questions, and
 * the retry does not burn an attempt.
 */
export function startAiWorker(): Worker<AiJobData, AiJobResult> {
  const worker = new Worker<AiJobData, AiJobResult>(
    QUEUE.ai,
    async (job) => {
      try {
        return await askTracer(job.data.orgId, job.data.question);
      } catch (err) {
        if (isRateLimited(err)) {
          const status = (err as { status?: number }).status;
          // Free-tier rate limits are per-minute, so pause ~30s on 429; 503 is
          // transient overload, so a short pause is enough.
          const ms = retryAfterMs(err, status === 429 ? 30_000 : 5_000);
          console.warn(`[ai] provider ${status}; pausing queue ${Math.round(ms / 1000)}s (auto-resume)`);
          await worker.rateLimit(ms);
          throw Worker.RateLimitError();
        }
        // Non-rate-limit client errors (bad key, malformed request) won't fix
        // themselves — fail immediately instead of burning 8 retries.
        if (isFatalClientError(err)) {
          throw new UnrecoverableError((err as Error).message);
        }
        throw err; // 5xx / network — let BullMQ retry with backoff
      }
    },
    { connection: bullConnection, concurrency: 2 },
  );

  worker.on('completed', (job) => console.log(`[ai] job ${job.id} answered`));
  worker.on('failed', (job, err) => console.error(`[ai] job ${job?.id} failed:`, err.message));

  return worker;
}
