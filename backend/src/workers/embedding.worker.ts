import { Worker } from 'bullmq';
import { bullConnection } from '../queues/connection';
import { QUEUE, type EmbeddingJobData } from '../queues/queues';
import { indexIssue } from '../modules/ai/indexing';

/**
 * Recomputes issue embeddings for semantic search. Concurrency is kept low
 * because the local embedding model is CPU-bound; BullMQ's exponential backoff
 * retries transient failures automatically.
 */
export function startEmbeddingWorker(): Worker<EmbeddingJobData> {
  const worker = new Worker<EmbeddingJobData>(
    QUEUE.embedding,
    async (job) => {
      const result = await indexIssue(job.data.issueId);
      return { issueId: job.data.issueId, result };
    },
    { connection: bullConnection, concurrency: 2 },
  );

  worker.on('completed', (job, ret) =>
    console.log(`[embedding] job ${job.id}: ${(ret as { result: string })?.result}`),
  );
  worker.on('failed', (job, err) =>
    console.error(`[embedding] job ${job?.id} failed:`, err.message),
  );

  return worker;
}
